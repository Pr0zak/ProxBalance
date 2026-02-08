"""
Recommendations and node scoring routes.

Handles recommendation generation, caching, threshold suggestions,
node suitability scoring, per-guest migration options, and recommendation feedback.
"""

from flask import Blueprint, jsonify, request, current_app
import json, os, sys
from datetime import datetime
from proxbalance.config_manager import load_config, load_penalty_config, BASE_PATH
from proxbalance.scoring import calculate_intelligent_thresholds, calculate_target_node_score, DEFAULT_PENALTY_CONFIG
from proxbalance.recommendations import generate_recommendations, check_storage_compatibility, build_storage_cache

recommendations_bp = Blueprint('recommendations', __name__)


def read_cache():
    return current_app.config['cache_manager'].get()


@recommendations_bp.route("/api/recommendations", methods=["POST"])
def get_recommendations():
    """Generate recommendations from cached data"""
    try:
        data = request.json or {}
        cpu_threshold = float(data.get("cpu_threshold", 60.0))
        mem_threshold = float(data.get("mem_threshold", 70.0))
        iowait_threshold = float(data.get("iowait_threshold", 30.0))
        maintenance_nodes = set(data.get("maintenance_nodes", []))

        cache_data = read_cache()
        if not cache_data:
            return jsonify({"success": False, "error": "No data available"}), 503

        try:
            result = generate_recommendations(
                cache_data.get('nodes', {}),
                cache_data.get('guests', {}),
                cpu_threshold,
                mem_threshold,
                iowait_threshold,
                maintenance_nodes
            )
            recommendations = result.get("recommendations", [])
            skipped_guests = result.get("skipped_guests", [])
            rec_summary = result.get("summary", {})
        except Exception as e:
            print(f"Error in generate_recommendations: {str(e)}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            return jsonify({"success": False, "error": f"Recommendation error: {str(e)}"}), 500

        # Calculate intelligent threshold suggestions
        threshold_suggestions = calculate_intelligent_thresholds(cache_data.get('nodes', {}))

        # AI Enhancement: If enabled, enhance recommendations with AI insights
        ai_enhanced = False
        config = load_config()
        if config.get('ai_recommendations_enabled', False):
            try:
                from ai_provider import get_ai_provider
                ai_provider = get_ai_provider()
                if ai_provider:
                    print(f"Enhancing {len(recommendations)} recommendations with AI insights...", file=sys.stderr)

                    # Call AI enhancement
                    enhancement_result = ai_provider.enhance_recommendations(
                        recommendations,
                        cache_data
                    )

                    if enhancement_result.get('success') and enhancement_result.get('insights'):
                        # Merge AI insights into recommendations
                        insights_by_vmid = {
                            insight['vmid']: insight
                            for insight in enhancement_result['insights']
                        }

                        for rec in recommendations:
                            vmid = rec['vmid']
                            if vmid in insights_by_vmid:
                                insight = insights_by_vmid[vmid]
                                rec['ai_insight'] = insight.get('insight', '')
                                rec['ai_confidence_adjustment'] = insight.get('confidence_adjustment', 0)

                                # Adjust confidence score based on AI feedback
                                if 'confidence_score' in rec:
                                    rec['confidence_score'] = max(0, min(100,
                                        rec['confidence_score'] + insight.get('confidence_adjustment', 0)
                                    ))

                        ai_enhanced = True
                        print(f"\u2713 AI enhancement complete: {len(enhancement_result['insights'])} insights added", file=sys.stderr)
                    else:
                        print(f"AI enhancement returned no insights", file=sys.stderr)
            except Exception as e:
                print(f"Warning: AI enhancement failed (continuing with algorithm-only): {str(e)}", file=sys.stderr)
                # Continue without AI enhancement - graceful degradation

        # Extract conflict and advisory data from result
        conflicts = result.get("conflicts", [])
        capacity_advisories = result.get("capacity_advisories", [])

        # Cache the recommendations result
        recommendations_cache = {
            "success": True,
            "recommendations": recommendations,
            "skipped_guests": skipped_guests,
            "summary": rec_summary,
            "conflicts": conflicts,
            "capacity_advisories": capacity_advisories,
            "count": len(recommendations),
            "threshold_suggestions": threshold_suggestions,
            "ai_enhanced": ai_enhanced,
            "generated_at": datetime.utcnow().isoformat() + 'Z',
            "parameters": {
                "cpu_threshold": cpu_threshold,
                "mem_threshold": mem_threshold,
                "iowait_threshold": iowait_threshold,
                "maintenance_nodes": list(maintenance_nodes)
            }
        }

        # Save to cache file
        recommendations_cache_file = os.path.join(BASE_PATH, 'recommendations_cache.json')
        try:
            with open(recommendations_cache_file, 'w') as f:
                json.dump(recommendations_cache, f, indent=2)
        except Exception as cache_err:
            print(f"Warning: Failed to cache recommendations: {cache_err}", file=sys.stderr)

        return jsonify(recommendations_cache)
    except Exception as e:
        print(f"Error in get_recommendations: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@recommendations_bp.route("/api/recommendations", methods=["GET"])
def get_cached_recommendations():
    """Get cached recommendations without regenerating"""
    try:
        recommendations_cache_file = os.path.join(BASE_PATH, 'recommendations_cache.json')

        # Check if cache file exists
        if not os.path.exists(recommendations_cache_file):
            return jsonify({
                "success": False,
                "error": "No cached recommendations available. Please generate recommendations first.",
                "cache_missing": True
            }), 404

        # Read cached recommendations
        try:
            with open(recommendations_cache_file, 'r') as f:
                cached_data = json.load(f)

            return jsonify(cached_data)
        except Exception as read_err:
            print(f"Error reading recommendations cache: {read_err}", file=sys.stderr)
            return jsonify({
                "success": False,
                "error": "Failed to read cached recommendations",
                "cache_error": True
            }), 500

    except Exception as e:
        print(f"Error in get_cached_recommendations: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@recommendations_bp.route("/api/recommendations/threshold-suggestions", methods=["GET"])
def get_threshold_suggestions():
    """Get intelligent threshold suggestions based on cluster analysis"""
    try:
        cache_data = read_cache()
        if not cache_data:
            return jsonify({"success": False, "error": "No data available"}), 503

        suggestions = calculate_intelligent_thresholds(cache_data.get('nodes', {}))

        return jsonify({
            "success": True,
            **suggestions
        })
    except Exception as e:
        print(f"Error in get_threshold_suggestions: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@recommendations_bp.route("/api/node-scores", methods=["POST"])
def node_scores():
    """Calculate migration suitability scores for all nodes"""
    try:
        cache_data = read_cache()
        if not cache_data:
            return jsonify({"success": False, "error": "No data available"}), 503

        # Get thresholds from request body
        req_data = request.get_json() or {}
        cpu_threshold = float(req_data.get("cpu_threshold", 60))
        mem_threshold = float(req_data.get("mem_threshold", 70))
        iowait_threshold = float(req_data.get("iowait_threshold", 15))
        maintenance_nodes = set(req_data.get("maintenance_nodes", []))

        nodes = cache_data.get('nodes', {})
        node_scores = {}

        # Use a dummy small guest for scoring (1 core, 1GB RAM)
        dummy_guest = {
            'cores': 1,
            'maxmem': 1073741824  # 1GB in bytes
        }

        for node_name, node in nodes.items():
            if node.get('status') != 'online':
                node_scores[node_name] = {
                    'score': 999999,
                    'suitability_rating': 0,
                    'suitable': False,
                    'reason': 'Node offline'
                }
                continue

            if node_name in maintenance_nodes:
                node_scores[node_name] = {
                    'score': 999999,
                    'suitability_rating': 0,
                    'suitable': False,
                    'reason': 'In maintenance mode'
                }
                continue

            # Calculate the actual score with full penalty breakdown
            # pending_target_guests is empty since we're just calculating base scores
            score, details = calculate_target_node_score(
                target_node=node,
                guest=dummy_guest,
                pending_target_guests={},
                cpu_threshold=cpu_threshold,
                mem_threshold=mem_threshold,
                return_details=True
            )

            # Get weighted metrics for display using configured weights
            metrics = node.get('metrics', {})
            immediate_cpu = metrics.get("current_cpu", 0)
            immediate_mem = metrics.get("current_mem", 0)

            short_cpu = metrics.get("avg_cpu", 0)
            short_mem = metrics.get("avg_mem", 0)

            long_cpu = metrics.get("avg_cpu_week", 0)
            long_mem = metrics.get("avg_mem_week", 0)

            # Use configured weights from penalty config
            penalty_cfg = load_penalty_config()
            weight_current = penalty_cfg.get("weight_current", 0.5)
            weight_24h = penalty_cfg.get("weight_24h", 0.3)
            weight_7d = penalty_cfg.get("weight_7d", 0.2)

            if metrics.get("has_historical"):
                weighted_cpu = (immediate_cpu * weight_current) + (short_cpu * weight_24h) + (long_cpu * weight_7d)
                weighted_mem = (immediate_mem * weight_current) + (short_mem * weight_24h) + (long_mem * weight_7d)
            else:
                weighted_cpu = immediate_cpu
                weighted_mem = immediate_mem

            # Determine suitability based on score thresholds
            # Lower scores are better migration targets
            if score < 50:
                suitable = True
                if score < 20:
                    reason = 'Excellent target'
                else:
                    reason = 'Good target'
            elif score < 100:
                suitable = True
                reason = 'Acceptable target'
            elif score < 200:
                suitable = False
                reason = 'Poor target'
            else:
                suitable = False
                # Determine primary issue for high scores
                if immediate_cpu > (cpu_threshold + 20):
                    reason = f'Very high current CPU ({immediate_cpu:.1f}%)'
                elif immediate_mem > (mem_threshold + 20):
                    reason = f'Very high current memory ({immediate_mem:.1f}%)'
                elif immediate_cpu > (cpu_threshold + 10):
                    reason = f'High current CPU ({immediate_cpu:.1f}%)'
                elif immediate_mem > (mem_threshold + 10):
                    reason = f'High current memory ({immediate_mem:.1f}%)'
                elif long_cpu > 90:
                    reason = f'Sustained high CPU ({long_cpu:.1f}% 7-day avg)'
                elif long_mem > 90:
                    reason = f'Sustained high memory ({long_mem:.1f}% 7-day avg)'
                elif weighted_cpu > cpu_threshold:
                    reason = f'CPU above threshold ({weighted_cpu:.1f}%)'
                elif weighted_mem > mem_threshold:
                    reason = f'Memory above threshold ({weighted_mem:.1f}%)'
                else:
                    reason = f'High penalty score'

            # Get additional metrics for display
            max_cpu_week = metrics.get("max_cpu_week", 0)
            max_mem_week = metrics.get("max_mem_week", 0)

            # Convert to suitability rating (0-100, higher is better)
            suitability_rating = round(max(0, 100 - min(score, 100)), 1)

            # Build penalty breakdown for visualization
            penalty_breakdown = details.get("penalties", {}) if details else {}
            # Group penalties into categories for the UI ring chart
            penalty_categories = {
                "cpu": penalty_breakdown.get("current_cpu", 0) + penalty_breakdown.get("sustained_cpu", 0) + penalty_breakdown.get("predicted_cpu", 0),
                "memory": penalty_breakdown.get("current_mem", 0) + penalty_breakdown.get("sustained_mem", 0) + penalty_breakdown.get("predicted_mem", 0),
                "iowait": penalty_breakdown.get("iowait_current", 0) + penalty_breakdown.get("iowait_sustained", 0),
                "trends": penalty_breakdown.get("cpu_trend", 0) + penalty_breakdown.get("mem_trend", 0),
                "spikes": penalty_breakdown.get("cpu_spikes", 0) + penalty_breakdown.get("mem_spikes", 0),
            }

            node_scores[node_name] = {
                'score': round(score, 2),
                'suitability_rating': suitability_rating,
                'suitable': suitable,
                'reason': reason,
                'weighted_cpu': round(weighted_cpu, 1),
                'weighted_mem': round(weighted_mem, 1),
                'current_cpu': round(immediate_cpu, 1),
                'current_mem': round(immediate_mem, 1),
                'max_cpu_week': round(max_cpu_week, 1),
                'max_mem_week': round(max_mem_week, 1),
                'penalty_breakdown': penalty_breakdown,
                'penalty_categories': penalty_categories,
                'total_penalties': details.get("total_penalties", 0) if details else 0,
                'components': details.get("components", {}) if details else {},
            }

        return jsonify({
            "success": True,
            "scores": node_scores
        })
    except Exception as e:
        print(f"Error in node_scores: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@recommendations_bp.route("/api/guest/<vmid>/migration-options", methods=["POST"])
def guest_migration_options(vmid):
    """Calculate migration suitability scores for a specific guest across all nodes"""
    try:
        cache_data = read_cache()
        if not cache_data:
            return jsonify({"success": False, "error": "No data available"}), 503

        guests = cache_data.get('guests', {})
        nodes = cache_data.get('nodes', {})

        # Find the guest
        guest = guests.get(str(vmid)) or guests.get(vmid)
        if not guest:
            return jsonify({"success": False, "error": f"Guest {vmid} not found"}), 404

        # Get thresholds from request body
        req_data = request.get_json() or {}
        cpu_threshold = float(req_data.get("cpu_threshold", 60))
        mem_threshold = float(req_data.get("mem_threshold", 70))
        maintenance_nodes = set(req_data.get("maintenance_nodes", []))

        penalty_cfg = load_penalty_config()
        src_node_name = guest.get("node")

        # Calculate score on current node
        src_node = nodes.get(src_node_name, {})
        current_score = None
        current_details = None
        if src_node and src_node.get("status") == "online":
            current_score, current_details = calculate_target_node_score(
                src_node, guest, {}, cpu_threshold, mem_threshold,
                penalty_config=penalty_cfg, return_details=True
            )

        # Check storage compatibility
        proxmox = None
        storage_cache = {}
        try:
            config = load_config()
            from proxbalance.config_manager import get_proxmox_client
            try:
                proxmox = get_proxmox_client(config)
            except ValueError:
                pass
            if proxmox:
                storage_cache = build_storage_cache(nodes, proxmox)
        except Exception:
            pass

        # Calculate scores on all other nodes
        target_options = []
        for node_name, node in nodes.items():
            entry = {
                "node": node_name,
                "is_current": node_name == src_node_name,
            }

            if node.get("status") != "online":
                entry.update({"score": 999999, "suitability_rating": 0, "suitable": False, "reason": "Node offline", "disqualified": True})
                target_options.append(entry)
                continue

            if node_name in maintenance_nodes:
                entry.update({"score": 999999, "suitability_rating": 0, "suitable": False, "reason": "In maintenance mode", "disqualified": True})
                target_options.append(entry)
                continue

            # Check anti-affinity conflicts
            conflict = False
            conflict_reason = None
            if guest.get("tags", {}).get("exclude_groups", []):
                for other_vmid in node.get("guests", []):
                    other_key = str(other_vmid) if str(other_vmid) in guests else other_vmid
                    if other_key not in guests:
                        continue
                    other = guests[other_key]
                    for excl_group in guest["tags"]["exclude_groups"]:
                        if excl_group in other.get("tags", {}).get("all_tags", []):
                            conflict = True
                            conflict_reason = f"Anti-affinity conflict (group: {excl_group})"
                            break
                    if conflict:
                        break

            if conflict:
                entry.update({"score": 999999, "suitability_rating": 0, "suitable": False, "reason": conflict_reason, "disqualified": True})
                target_options.append(entry)
                continue

            # Check storage compatibility
            if proxmox and not node_name == src_node_name:
                if not check_storage_compatibility(guest, src_node_name, node_name, proxmox, storage_cache):
                    entry.update({"score": 999999, "suitability_rating": 0, "suitable": False, "reason": "Storage incompatible", "disqualified": True})
                    target_options.append(entry)
                    continue

            # Calculate score with details
            score, details = calculate_target_node_score(
                node, guest, {}, cpu_threshold, mem_threshold,
                penalty_config=penalty_cfg, return_details=True
            )

            suitability_rating = round(max(0, 100 - min(score, 100)), 1)
            improvement = (current_score - score) if current_score is not None else 0

            if score < 50:
                suitable = True
                reason = 'Excellent target' if score < 20 else 'Good target'
            elif score < 100:
                suitable = True
                reason = 'Acceptable target'
            else:
                suitable = False
                reason = 'Poor target' if score < 200 else 'High penalty score'

            entry.update({
                "score": round(score, 2),
                "suitability_rating": suitability_rating,
                "suitable": suitable,
                "reason": reason,
                "disqualified": False,
                "improvement": round(improvement, 2),
                "penalty_categories": {
                    "cpu": details.get("penalties", {}).get("current_cpu", 0) + details.get("penalties", {}).get("sustained_cpu", 0) + details.get("penalties", {}).get("predicted_cpu", 0),
                    "memory": details.get("penalties", {}).get("current_mem", 0) + details.get("penalties", {}).get("sustained_mem", 0) + details.get("penalties", {}).get("predicted_mem", 0),
                    "iowait": details.get("penalties", {}).get("iowait_current", 0) + details.get("penalties", {}).get("iowait_sustained", 0),
                    "trends": details.get("penalties", {}).get("cpu_trend", 0) + details.get("penalties", {}).get("mem_trend", 0),
                    "spikes": details.get("penalties", {}).get("cpu_spikes", 0) + details.get("penalties", {}).get("mem_spikes", 0),
                },
                "metrics": details.get("metrics", {}),
                "total_penalties": details.get("total_penalties", 0),
            })
            target_options.append(entry)

        # Sort by score (best first), current node highlighted
        target_options.sort(key=lambda x: (x.get("disqualified", False), x.get("score", 999999)))

        return jsonify({
            "success": True,
            "vmid": vmid,
            "guest_name": guest.get("name", str(vmid)),
            "guest_type": guest.get("type", "unknown"),
            "current_node": src_node_name,
            "current_score": round(current_score, 2) if current_score is not None else None,
            "options": target_options,
        })
    except Exception as e:
        print(f"Error in guest_migration_options: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@recommendations_bp.route("/api/penalty-config/simulate", methods=["POST"])
def simulate_penalty_config():
    """Simulate recommendations with proposed penalty config without saving"""
    try:
        data = request.json
        if not data or 'config' not in data:
            return jsonify({"success": False, "error": "Missing 'config' in request body"}), 400

        proposed_config = data['config']

        cache_data = read_cache()
        if not cache_data:
            return jsonify({"success": False, "error": "No data available for simulation"}), 503

        # Get thresholds
        cpu_threshold = float(data.get("cpu_threshold", 60.0))
        mem_threshold = float(data.get("mem_threshold", 70.0))
        iowait_threshold = float(data.get("iowait_threshold", 30.0))
        maintenance_nodes = set(data.get("maintenance_nodes", []))

        nodes = cache_data.get('nodes', {})
        guests = cache_data.get('guests', {})

        # Generate recommendations with proposed config
        # Temporarily use proposed config by passing it via the penalty config system
        # We need to generate recommendations without actually saving the config
        # The generate_recommendations function loads penalty config internally,
        # so we simulate by generating node scores with proposed config directly

        # Calculate node scores with proposed config
        dummy_guest = {'cores': 1, 'maxmem': 1073741824}
        proposed_scores = {}
        for node_name, node in nodes.items():
            if node.get('status') != 'online':
                continue
            score = calculate_target_node_score(
                node, dummy_guest, {}, cpu_threshold, mem_threshold,
                penalty_config=proposed_config
            )
            proposed_scores[node_name] = round(score, 2)

        # Calculate with current config for comparison
        current_config = load_penalty_config()
        current_scores = {}
        for node_name, node in nodes.items():
            if node.get('status') != 'online':
                continue
            score = calculate_target_node_score(
                node, dummy_guest, {}, cpu_threshold, mem_threshold,
                penalty_config=current_config
            )
            current_scores[node_name] = round(score, 2)

        # Count how many guests would meet the improvement threshold under each config
        proposed_min_improvement = proposed_config.get("min_score_improvement", 15)
        current_min_improvement = current_config.get("min_score_improvement", 15)

        proposed_recommendations = 0
        current_recommendations = 0
        changes = []

        for vmid_key, guest in guests.items():
            src_node_name = guest.get("node")
            if not src_node_name or src_node_name not in nodes:
                continue
            src_node = nodes[src_node_name]
            if src_node.get("status") != "online" or guest.get("status") != "running":
                continue
            if guest.get("tags", {}).get("has_ignore", False):
                continue
            if guest.get("ha_managed", False):
                continue

            # Current config scoring
            current_src_score = calculate_target_node_score(src_node, guest, {}, cpu_threshold, mem_threshold, penalty_config=current_config)
            current_best_improvement = 0
            current_best_target = None
            for tgt_name, tgt_node in nodes.items():
                if tgt_name == src_node_name or tgt_node.get("status") != "online" or tgt_name in maintenance_nodes:
                    continue
                tgt_score = calculate_target_node_score(tgt_node, guest, {}, cpu_threshold, mem_threshold, penalty_config=current_config)
                imp = current_src_score - tgt_score
                if imp > current_best_improvement:
                    current_best_improvement = imp
                    current_best_target = tgt_name
            if current_best_improvement >= current_min_improvement:
                current_recommendations += 1

            # Proposed config scoring
            proposed_src_score = calculate_target_node_score(src_node, guest, {}, cpu_threshold, mem_threshold, penalty_config=proposed_config)
            proposed_best_improvement = 0
            proposed_best_target = None
            for tgt_name, tgt_node in nodes.items():
                if tgt_name == src_node_name or tgt_node.get("status") != "online" or tgt_name in maintenance_nodes:
                    continue
                tgt_score = calculate_target_node_score(tgt_node, guest, {}, cpu_threshold, mem_threshold, penalty_config=proposed_config)
                imp = proposed_src_score - tgt_score
                if imp > proposed_best_improvement:
                    proposed_best_improvement = imp
                    proposed_best_target = tgt_name
            if proposed_best_improvement >= proposed_min_improvement:
                proposed_recommendations += 1

            # Track changes
            was_recommended = current_best_improvement >= current_min_improvement
            would_be_recommended = proposed_best_improvement >= proposed_min_improvement
            if was_recommended != would_be_recommended:
                changes.append({
                    "vmid": int(vmid_key) if isinstance(vmid_key, str) and vmid_key.isdigit() else vmid_key,
                    "name": guest.get("name", str(vmid_key)),
                    "type": guest.get("type", "unknown"),
                    "source_node": src_node_name,
                    "target_node": proposed_best_target if would_be_recommended else current_best_target,
                    "action": "added" if would_be_recommended else "removed",
                    "current_improvement": round(current_best_improvement, 1),
                    "proposed_improvement": round(proposed_best_improvement, 1),
                })

        return jsonify({
            "success": True,
            "current_count": current_recommendations,
            "proposed_count": proposed_recommendations,
            "changes": changes,
            "node_score_comparison": {
                node: {
                    "current": current_scores.get(node, 0),
                    "proposed": proposed_scores.get(node, 0),
                    "delta": round(proposed_scores.get(node, 0) - current_scores.get(node, 0), 2)
                }
                for node in set(list(current_scores.keys()) + list(proposed_scores.keys()))
            }
        })
    except Exception as e:
        print(f"Error in simulate_penalty_config: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


FEEDBACK_FILE = os.path.join(BASE_PATH, 'recommendation_feedback.json')


def _load_feedback():
    """Load recommendation feedback from file"""
    if os.path.exists(FEEDBACK_FILE):
        try:
            with open(FEEDBACK_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            return []
    return []


def _save_feedback(feedback_list):
    """Save recommendation feedback to file"""
    try:
        with open(FEEDBACK_FILE, 'w') as f:
            json.dump(feedback_list, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving feedback: {e}", file=sys.stderr)
        return False


@recommendations_bp.route("/api/recommendations/feedback", methods=["POST"])
def submit_recommendation_feedback():
    """Submit feedback on a recommendation (helpful/not helpful)"""
    try:
        data = request.json
        if not data:
            return jsonify({"success": False, "error": "Missing request body"}), 400

        vmid = data.get("vmid")
        rating = data.get("rating")  # "helpful" or "not_helpful"
        reason = data.get("reason", "")  # Optional reason for not_helpful

        if vmid is None or rating not in ("helpful", "not_helpful"):
            return jsonify({"success": False, "error": "vmid and rating ('helpful'/'not_helpful') are required"}), 400

        feedback_entry = {
            "vmid": vmid,
            "rating": rating,
            "reason": reason,
            "source_node": data.get("source_node"),
            "target_node": data.get("target_node"),
            "score_improvement": data.get("score_improvement"),
            "timestamp": datetime.utcnow().isoformat() + 'Z',
        }

        feedback_list = _load_feedback()
        feedback_list.append(feedback_entry)

        # Keep only last 500 feedback entries
        if len(feedback_list) > 500:
            feedback_list = feedback_list[-500:]

        if _save_feedback(feedback_list):
            return jsonify({"success": True, "message": "Feedback recorded"})
        else:
            return jsonify({"success": False, "error": "Failed to save feedback"}), 500
    except Exception as e:
        print(f"Error in submit_recommendation_feedback: {str(e)}", file=sys.stderr)
        return jsonify({"success": False, "error": str(e)}), 500


@recommendations_bp.route("/api/recommendations/feedback", methods=["GET"])
def get_recommendation_feedback():
    """Get recommendation feedback summary"""
    try:
        feedback_list = _load_feedback()

        # Aggregate stats
        total = len(feedback_list)
        helpful = sum(1 for f in feedback_list if f.get("rating") == "helpful")
        not_helpful = sum(1 for f in feedback_list if f.get("rating") == "not_helpful")

        # Reason breakdown for not_helpful
        reason_counts = {}
        for f in feedback_list:
            if f.get("rating") == "not_helpful" and f.get("reason"):
                reason = f["reason"]
                reason_counts[reason] = reason_counts.get(reason, 0) + 1

        # Recent feedback (last 20)
        recent = feedback_list[-20:] if feedback_list else []
        recent.reverse()

        return jsonify({
            "success": True,
            "total": total,
            "helpful": helpful,
            "not_helpful": not_helpful,
            "helpful_pct": round(helpful / total * 100, 1) if total > 0 else 0,
            "reason_counts": reason_counts,
            "recent": recent,
        })
    except Exception as e:
        print(f"Error in get_recommendation_feedback: {str(e)}", file=sys.stderr)
        return jsonify({"success": False, "error": str(e)}), 500
