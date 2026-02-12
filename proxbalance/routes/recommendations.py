"""
Recommendations and node scoring routes.

Handles recommendation generation, caching, threshold suggestions,
node suitability scoring, per-guest migration options, and recommendation feedback.
"""

from flask import Blueprint, jsonify, request, current_app, make_response
import json, os, sys, time, csv, io
from datetime import datetime
from proxbalance.config_manager import load_config, load_penalty_config, BASE_PATH
from proxbalance.scoring import calculate_intelligent_thresholds, calculate_target_node_score, DEFAULT_PENALTY_CONFIG, analyze_workload_patterns
from proxbalance.recommendations import generate_recommendations, check_storage_compatibility, build_storage_cache
from proxbalance.error_handlers import api_route

recommendations_bp = Blueprint('recommendations', __name__)


def read_cache():
    return current_app.config['cache_manager'].get()


@recommendations_bp.route("/api/recommendations", methods=["POST"])
@api_route
def get_recommendations():
    """Generate recommendations from cached data"""
    start_time = time.time()
    data = request.json or {}
    cpu_threshold = float(data.get("cpu_threshold", 60.0))
    mem_threshold = float(data.get("mem_threshold", 70.0))
    iowait_threshold = float(data.get("iowait_threshold", 30.0))
    maintenance_nodes = set(data.get("maintenance_nodes", []))

    cache_data = read_cache()
    if not cache_data:
        return jsonify({"success": False, "error": "No data available"}), 503

    # Phase 2f: Accept in-flight migration data from automigrate batch runs
    initial_pending = data.get("pending_target_guests")

    try:
        result = generate_recommendations(
            cache_data.get('nodes', {}),
            cache_data.get('guests', {}),
            cpu_threshold,
            mem_threshold,
            iowait_threshold,
            maintenance_nodes,
            initial_pending_guests=initial_pending
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

    # Extract conflict, advisory, forecast, and execution plan data from result
    conflicts = result.get("conflicts", [])
    capacity_advisories = result.get("capacity_advisories", [])
    forecasts = result.get("forecasts", [])
    execution_plan = result.get("execution_plan", {})

    # Cache the recommendations result
    recommendations_cache = {
        "success": True,
        "recommendations": recommendations,
        "skipped_guests": skipped_guests,
        "summary": rec_summary,
        "conflicts": conflicts,
        "capacity_advisories": capacity_advisories,
        "forecasts": forecasts,
        "execution_plan": execution_plan,
        "count": len(recommendations),
        "threshold_suggestions": threshold_suggestions,
        "ai_enhanced": ai_enhanced,
        "generation_time_ms": round((time.time() - start_time) * 1000),
        "generated_at": datetime.utcnow().isoformat() + 'Z',
        "parameters": {
            "cpu_threshold": cpu_threshold,
            "mem_threshold": mem_threshold,
            "iowait_threshold": iowait_threshold,
            "maintenance_nodes": list(maintenance_nodes)
        }
    }

    # Compute change log by comparing with previous recommendations
    recommendations_cache_file = os.path.join(BASE_PATH, 'recommendations_cache.json')
    try:
        if os.path.exists(recommendations_cache_file):
            with open(recommendations_cache_file, 'r') as f:
                previous_cache = json.load(f)

            old_recs = previous_cache.get("recommendations", [])
            new_recs = recommendations

            # Index recommendations by vmid for comparison
            old_by_vmid = {str(r["vmid"]): r for r in old_recs}
            new_by_vmid = {str(r["vmid"]): r for r in new_recs}

            old_vmids = set(old_by_vmid.keys())
            new_vmids = set(new_by_vmid.keys())

            added_vmids = new_vmids - old_vmids
            removed_vmids = old_vmids - new_vmids
            common_vmids = old_vmids & new_vmids

            new_recommendations_list = [
                {
                    "vmid": new_by_vmid[v]["vmid"],
                    "name": new_by_vmid[v].get("name", ""),
                    "source_node": new_by_vmid[v].get("source_node", ""),
                    "target_node": new_by_vmid[v].get("target_node", ""),
                }
                for v in sorted(added_vmids)
            ]

            removed_recommendations_list = [
                {
                    "vmid": old_by_vmid[v]["vmid"],
                    "name": old_by_vmid[v].get("name", ""),
                    "source_node": old_by_vmid[v].get("source_node", ""),
                    "target_node": old_by_vmid[v].get("target_node", ""),
                }
                for v in sorted(removed_vmids)
            ]

            changed_targets_list = []
            unchanged_count = 0
            for v in sorted(common_vmids):
                old_target = old_by_vmid[v].get("target_node", "")
                new_target = new_by_vmid[v].get("target_node", "")
                if old_target != new_target:
                    changed_targets_list.append({
                        "vmid": new_by_vmid[v]["vmid"],
                        "name": new_by_vmid[v].get("name", ""),
                        "source_node": new_by_vmid[v].get("source_node", ""),
                        "target_node": new_target,
                        "old_target": old_target,
                        "new_target": new_target,
                    })
                else:
                    unchanged_count += 1

            recommendations_cache["changes_since_last"] = {
                "timestamp": recommendations_cache["generated_at"],
                "previous_timestamp": previous_cache.get("generated_at", ""),
                "new_recommendations": new_recommendations_list,
                "removed_recommendations": removed_recommendations_list,
                "changed_targets": changed_targets_list,
                "unchanged": unchanged_count,
            }
        else:
            recommendations_cache["changes_since_last"] = None
    except Exception as changelog_err:
        print(f"Warning: Failed to compute recommendation change log: {changelog_err}", file=sys.stderr)
        recommendations_cache["changes_since_last"] = None

    # Save to cache file
    try:
        with open(recommendations_cache_file, 'w') as f:
            json.dump(recommendations_cache, f, indent=2)
    except Exception as cache_err:
        print(f"Warning: Failed to cache recommendations: {cache_err}", file=sys.stderr)

    return jsonify(recommendations_cache)


@recommendations_bp.route("/api/recommendations", methods=["GET"])
@api_route
def get_cached_recommendations():
    """Get cached recommendations without regenerating.

    Query parameters for filtering and pagination:
      - limit (int, default: all) - Limit the number of recommendations returned
      - offset (int, default: 0) - Skip first N recommendations
      - min_confidence (int, optional) - Only return recs with confidence >= value
      - target_node (string, optional) - Filter by target node
      - source_node (string, optional) - Filter by source node
      - sort (string, optional) - Sort by score_improvement, confidence_score,
        risk_score, or priority. Default: original order
      - sort_dir (string, optional) - asc or desc. Default: desc
    """
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
    except Exception as read_err:
        print(f"Error reading recommendations cache: {read_err}", file=sys.stderr)
        return jsonify({
            "success": False,
            "error": "Failed to read cached recommendations",
            "cache_error": True
        }), 500

    # Extract query parameters
    param_limit = request.args.get("limit")
    param_offset = request.args.get("offset", "0")
    param_min_confidence = request.args.get("min_confidence")
    param_target_node = request.args.get("target_node")
    param_source_node = request.args.get("source_node")
    param_sort = request.args.get("sort")
    param_sort_dir = request.args.get("sort_dir", "desc").lower()

    recommendations = cached_data.get("recommendations", [])
    total_count = len(recommendations)

    # Apply filters
    if param_min_confidence is not None:
        try:
            min_conf = int(param_min_confidence)
            recommendations = [
                r for r in recommendations
                if r.get("confidence_score", 0) >= min_conf
            ]
        except (ValueError, TypeError):
            pass

    if param_target_node:
        recommendations = [
            r for r in recommendations
            if r.get("target_node") == param_target_node
        ]

    if param_source_node:
        recommendations = [
            r for r in recommendations
            if r.get("source_node") == param_source_node
        ]

    filtered_count = len(recommendations)

    # Apply sorting
    valid_sort_fields = {"score_improvement", "confidence_score", "risk_score", "priority"}
    if param_sort and param_sort in valid_sort_fields:
        reverse = param_sort_dir != "asc"
        # For priority, sort alphabetically (critical > high > medium > low)
        if param_sort == "priority":
            priority_order = {"critical": 4, "high": 3, "medium": 2, "low": 1}
            recommendations.sort(
                key=lambda r: priority_order.get(str(r.get("priority", "")).lower(), 0),
                reverse=reverse
            )
        else:
            recommendations.sort(
                key=lambda r: r.get(param_sort, 0) or 0,
                reverse=reverse
            )

    # Apply pagination
    try:
        offset = max(0, int(param_offset))
    except (ValueError, TypeError):
        offset = 0

    if param_limit is not None:
        try:
            limit = max(0, int(param_limit))
            recommendations = recommendations[offset:offset + limit]
        except (ValueError, TypeError):
            recommendations = recommendations[offset:]
    else:
        recommendations = recommendations[offset:]

    # Return modified response with pagination metadata
    cached_data["recommendations"] = recommendations
    cached_data["total_count"] = total_count
    cached_data["filtered_count"] = filtered_count
    cached_data["count"] = len(recommendations)

    return jsonify(cached_data)


@recommendations_bp.route("/api/recommendations/skipped", methods=["GET"])
@api_route
def get_skipped_guests():
    """Get skipped guests from cached recommendations with optional filtering.

    Query parameters:
      - reason (string, optional) - Filter by skip reason
        (e.g. insufficient_improvement, ha_managed, stopped)
      - limit (int, default: all) - Limit the number of results
      - offset (int, default: 0) - Skip first N results
    """
    recommendations_cache_file = os.path.join(BASE_PATH, 'recommendations_cache.json')

    if not os.path.exists(recommendations_cache_file):
        return jsonify({
            "success": False,
            "error": "No cached recommendations available. Please generate recommendations first.",
            "cache_missing": True
        }), 404

    try:
        with open(recommendations_cache_file, 'r') as f:
            cached_data = json.load(f)
    except Exception as read_err:
        print(f"Error reading recommendations cache: {read_err}", file=sys.stderr)
        return jsonify({
            "success": False,
            "error": "Failed to read cached recommendations",
            "cache_error": True
        }), 500

    skipped = cached_data.get("skipped_guests", [])
    total_count = len(skipped)

    # Filter by reason
    param_reason = request.args.get("reason")
    if param_reason:
        skipped = [
            s for s in skipped
            if s.get("reason") == param_reason
            or s.get("skip_reason") == param_reason
        ]

    filtered_count = len(skipped)

    # Apply pagination
    param_offset = request.args.get("offset", "0")
    param_limit = request.args.get("limit")

    try:
        offset = max(0, int(param_offset))
    except (ValueError, TypeError):
        offset = 0

    if param_limit is not None:
        try:
            limit = max(0, int(param_limit))
            skipped = skipped[offset:offset + limit]
        except (ValueError, TypeError):
            skipped = skipped[offset:]
    else:
        skipped = skipped[offset:]

    # Collect distinct skip reasons for discovery
    all_skipped = cached_data.get("skipped_guests", [])
    reason_counts = {}
    for s in all_skipped:
        r = s.get("reason") or s.get("skip_reason") or "unknown"
        reason_counts[r] = reason_counts.get(r, 0) + 1

    return jsonify({
        "success": True,
        "skipped_guests": skipped,
        "total_count": total_count,
        "filtered_count": filtered_count,
        "count": len(skipped),
        "reason_counts": reason_counts,
        "generated_at": cached_data.get("generated_at"),
    })


@recommendations_bp.route("/api/recommendations/forecasts", methods=["GET"])
@api_route
def get_forecasts():
    """Get forecast recommendations from cached data.

    Returns proactive trend-based alerts that warn about threshold crossings
    before they happen, using linear regression on score history data.

    Query parameters:
      - severity (string, optional) - Filter by severity: critical, warning, info
      - node (string, optional) - Filter by node name
      - metric (string, optional) - Filter by metric: cpu, memory
    """
    recommendations_cache_file = os.path.join(BASE_PATH, 'recommendations_cache.json')

    if not os.path.exists(recommendations_cache_file):
        return jsonify({
            "success": False,
            "error": "No cached recommendations available. Please generate recommendations first.",
            "cache_missing": True
        }), 404

    try:
        with open(recommendations_cache_file, 'r') as f:
            cached_data = json.load(f)
    except Exception as read_err:
        print(f"Error reading recommendations cache: {read_err}", file=sys.stderr)
        return jsonify({
            "success": False,
            "error": "Failed to read cached recommendations",
            "cache_error": True
        }), 500

    forecasts = cached_data.get("forecasts", [])

    # Apply filters
    param_severity = request.args.get("severity")
    if param_severity:
        forecasts = [f for f in forecasts if f.get("severity") == param_severity]

    param_node = request.args.get("node")
    if param_node:
        forecasts = [f for f in forecasts if f.get("node") == param_node]

    param_metric = request.args.get("metric")
    if param_metric:
        forecasts = [f for f in forecasts if f.get("metric") == param_metric]

    return jsonify({
        "success": True,
        "forecasts": forecasts,
        "count": len(forecasts),
        "generated_at": cached_data.get("generated_at"),
    })


@recommendations_bp.route("/api/recommendations/diagnostics", methods=["GET"])
@api_route
def get_recommendations_diagnostics():
    """Get diagnostic summary of the recommendation engine's state"""
    recommendations_cache_file = os.path.join(BASE_PATH, 'recommendations_cache.json')
    cluster_cache_file = os.path.join(BASE_PATH, 'cluster_cache.json')

    diagnostics = {}

    # Read recommendations cache
    cached_data = None
    if os.path.exists(recommendations_cache_file):
        try:
            with open(recommendations_cache_file, 'r') as f:
                cached_data = json.load(f)
        except Exception:
            cached_data = None

    if not cached_data:
        return jsonify({
            "success": False,
            "error": "No cached recommendations available. Generate recommendations first."
        }), 404

    # Basic generation info
    diagnostics["last_generation"] = cached_data.get("generated_at")
    diagnostics["generation_time_ms"] = cached_data.get("generation_time_ms")

    # Guest counts
    recommendations = cached_data.get("recommendations", [])
    skipped_guests = cached_data.get("skipped_guests", [])
    guests_recommended = len(recommendations)
    guests_skipped = len(skipped_guests)
    diagnostics["guests_evaluated"] = guests_recommended + guests_skipped
    diagnostics["guests_recommended"] = guests_recommended
    diagnostics["guests_skipped"] = guests_skipped

    # Skip reason breakdown from summary
    summary = cached_data.get("summary", {})
    diagnostics["skip_reason_breakdown"] = summary.get("skip_reasons", {})

    # Scoring config from penalty config and cache parameters
    penalty_cfg = load_penalty_config()
    parameters = cached_data.get("parameters", {})
    diagnostics["scoring_config"] = {
        "min_score_improvement": penalty_cfg.get("min_score_improvement", 15),
        "cpu_threshold": parameters.get("cpu_threshold", penalty_cfg.get("cpu_threshold", 60)),
        "mem_threshold": parameters.get("mem_threshold", penalty_cfg.get("mem_threshold", 70)),
        "weight_current": penalty_cfg.get("weight_current", 0.5),
        "weight_24h": penalty_cfg.get("weight_24h", 0.3),
        "weight_7d": penalty_cfg.get("weight_7d", 0.2),
    }

    # AI enhancement status
    diagnostics["ai_enhanced"] = cached_data.get("ai_enhanced", False)

    # Cache file ages
    now = time.time()
    cache_status = {}
    if os.path.exists(cluster_cache_file):
        cluster_mtime = os.path.getmtime(cluster_cache_file)
        cache_status["cluster_cache_age_minutes"] = round((now - cluster_mtime) / 60, 1)
    else:
        cache_status["cluster_cache_age_minutes"] = None

    if os.path.exists(recommendations_cache_file):
        rec_mtime = os.path.getmtime(recommendations_cache_file)
        cache_status["recommendations_cache_age_minutes"] = round((now - rec_mtime) / 60, 1)
    else:
        cache_status["recommendations_cache_age_minutes"] = None

    diagnostics["cache_status"] = cache_status

    # Conflict and advisory counts
    diagnostics["conflicts_count"] = len(cached_data.get("conflicts", []))
    diagnostics["advisories_count"] = len(cached_data.get("capacity_advisories", []))

    return jsonify({
        "success": True,
        "diagnostics": diagnostics
    })


@recommendations_bp.route("/api/recommendations/threshold-suggestions", methods=["GET"])
@api_route
def get_threshold_suggestions():
    """Get intelligent threshold suggestions based on cluster analysis"""
    cache_data = read_cache()
    if not cache_data:
        return jsonify({"success": False, "error": "No data available"}), 503

    suggestions = calculate_intelligent_thresholds(cache_data.get('nodes', {}))

    return jsonify({
        "success": True,
        **suggestions
    })


@recommendations_bp.route("/api/node-scores", methods=["POST"])
@api_route
def node_scores():
    """Calculate migration suitability scores for all nodes"""
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
            "memory": penalty_breakdown.get("current_mem", 0) + penalty_breakdown.get("sustained_mem", 0) + penalty_breakdown.get("predicted_mem", 0) + penalty_breakdown.get("mem_overcommit", 0),
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
            'trend_analysis': details.get("trend_analysis") if details else None,
            'overcommit_ratio': node.get("mem_overcommit_ratio", 0),
            'committed_mem_gb': node.get("committed_mem_gb", 0),
        }

    return jsonify({
        "success": True,
        "scores": node_scores
    })


@recommendations_bp.route("/api/guest/<vmid>/migration-options", methods=["POST"])
@api_route
def guest_migration_options(vmid):
    """Calculate migration suitability scores for a specific guest across all nodes"""
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

        # Hard memory capacity gate: reject if guest can't physically fit.
        # Use actual node memory usage (mem_percent) rather than summing
        # guest committed memory (mem_max_gb). This correctly handles
        # environments with memory ballooning / overcommitment where
        # VMs are allocated more RAM than they actually use.
        guest_mem_max_gb = guest.get("mem_max_gb", guest.get("mem_used_gb", 0))
        if guest_mem_max_gb > 0 and node_name != src_node_name:
            target_total_mem_gb = node.get("total_mem_gb", 1)
            target_used_mem_gb = (node.get("mem_percent", 0) / 100.0) * target_total_mem_gb
            if (target_used_mem_gb + guest_mem_max_gb) > (target_total_mem_gb * 0.95):
                entry.update({
                    "score": 999999, "suitability_rating": 0, "suitable": False,
                    "reason": f"Insufficient memory ({target_used_mem_gb:.0f}+{guest_mem_max_gb:.0f}GB > {target_total_mem_gb:.0f}GB)",
                    "disqualified": True,
                })
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

        penalties = details.get("penalties", {})
        entry.update({
            "score": round(score, 2),
            "suitability_rating": suitability_rating,
            "suitable": suitable,
            "reason": reason,
            "disqualified": False,
            "improvement": round(improvement, 2),
            "penalty_categories": {
                "cpu": penalties.get("current_cpu", 0) + penalties.get("sustained_cpu", 0) + penalties.get("predicted_cpu", 0),
                "memory": penalties.get("current_mem", 0) + penalties.get("sustained_mem", 0) + penalties.get("predicted_mem", 0) + penalties.get("mem_overcommit", 0),
                "iowait": penalties.get("iowait_current", 0) + penalties.get("iowait_sustained", 0),
                "trends": penalties.get("cpu_trend", 0) + penalties.get("mem_trend", 0),
                "spikes": penalties.get("cpu_spikes", 0) + penalties.get("mem_spikes", 0),
            },
            "metrics": details.get("metrics", {}),
            "total_penalties": details.get("total_penalties", 0),
            "trend_analysis": details.get("trend_analysis"),
            "overcommit_ratio": node.get("mem_overcommit_ratio", 0),
            "committed_mem_gb": node.get("committed_mem_gb", 0),
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


@recommendations_bp.route("/api/penalty-config/simulate", methods=["POST"])
@api_route
def simulate_penalty_config():
    """Simulate recommendations with proposed penalty config without saving"""
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


@recommendations_bp.route("/api/score-history", methods=["GET"])
@api_route
def get_score_history():
    """Return historical score snapshots, optionally filtered by hours and node."""
    score_history_file = os.path.join(BASE_PATH, 'score_history.json')

    if not os.path.exists(score_history_file):
        return jsonify({"success": True, "history": []})

    with open(score_history_file, 'r') as f:
        history = json.load(f)

    if not isinstance(history, list):
        history = []

    # Filter by time range
    hours = int(request.args.get("hours", 24))
    cutoff = datetime.utcnow().timestamp() - (hours * 3600)

    filtered = []
    for entry in history:
        ts = entry.get("timestamp", "")
        try:
            # Parse ISO format timestamp
            entry_dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            if entry_dt.timestamp() < cutoff:
                continue
        except (ValueError, TypeError):
            continue
        filtered.append(entry)

    # Filter to a single node if requested
    node = request.args.get("node")
    if node:
        for entry in filtered:
            nodes_data = entry.get("nodes", {})
            if node in nodes_data:
                entry["nodes"] = {node: nodes_data[node]}
            else:
                entry["nodes"] = {}

    return jsonify({"success": True, "history": filtered})


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
@api_route
def submit_recommendation_feedback():
    """Submit feedback on a recommendation (helpful/not helpful)"""
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


@recommendations_bp.route("/api/recommendations/feedback", methods=["GET"])
@api_route
def get_recommendation_feedback():
    """Get recommendation feedback summary"""
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


@recommendations_bp.route("/api/recommendations/export", methods=["GET"])
@api_route
def export_recommendations():
    """Export recommendations in CSV or JSON format"""
    export_format = request.args.get("format", "json").lower()
    if export_format not in ("json", "csv"):
        return jsonify({"success": False, "error": "Invalid format. Use 'json' or 'csv'."}), 400

    recommendations_cache_file = os.path.join(BASE_PATH, 'recommendations_cache.json')

    if not os.path.exists(recommendations_cache_file):
        return jsonify({"success": False, "error": "No cached recommendations available."}), 404

    with open(recommendations_cache_file, 'r') as f:
        cached_data = json.load(f)

    recommendations = cached_data.get("recommendations", [])

    if export_format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "vmid", "name", "type", "source_node", "target_node",
            "reason", "score_improvement", "confidence_score",
            "priority", "risk_level", "risk_score", "mem_gb"
        ])
        for rec in recommendations:
            writer.writerow([
                rec.get("vmid", ""),
                rec.get("name", ""),
                rec.get("type", ""),
                rec.get("source_node", ""),
                rec.get("target_node", ""),
                rec.get("reason", ""),
                rec.get("score_improvement", ""),
                rec.get("confidence_score", ""),
                rec.get("priority", ""),
                rec.get("risk_level", ""),
                rec.get("risk_score", ""),
                rec.get("mem_gb", ""),
            ])

        response = make_response(output.getvalue())
        response.headers["Content-Type"] = "text/csv"
        response.headers["Content-Disposition"] = 'attachment; filename="recommendations.csv"'
        return response
    else:
        response = make_response(json.dumps(recommendations, indent=2))
        response.headers["Content-Type"] = "application/json"
        response.headers["Content-Disposition"] = 'attachment; filename="recommendations.json"'
        return response


@recommendations_bp.route("/api/automigrate/history/export", methods=["GET"])
@api_route
def export_migration_history():
    """Export migration history in CSV or JSON format"""
    export_format = request.args.get("format", "json").lower()
    if export_format not in ("json", "csv"):
        return jsonify({"success": False, "error": "Invalid format. Use 'json' or 'csv'."}), 400

    history_file = os.path.join(BASE_PATH, 'migration_history.json')

    if not os.path.exists(history_file):
        return jsonify({"success": False, "error": "No migration history available."}), 404

    with open(history_file, 'r') as f:
        history = json.load(f)

    if not isinstance(history, list):
        history = []

    # Apply date range filters if provided
    date_from = request.args.get("from")
    date_to = request.args.get("to")

    if date_from:
        try:
            from_dt = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
            history = [
                m for m in history
                if datetime.fromisoformat(m.get("timestamp", "1970-01-01T00:00:00").replace("Z", "+00:00")) >= from_dt
            ]
        except (ValueError, TypeError):
            return jsonify({"success": False, "error": "Invalid 'from' date format. Use ISO 8601."}), 400

    if date_to:
        try:
            to_dt = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
            history = [
                m for m in history
                if datetime.fromisoformat(m.get("timestamp", "9999-12-31T23:59:59").replace("Z", "+00:00")) <= to_dt
            ]
        except (ValueError, TypeError):
            return jsonify({"success": False, "error": "Invalid 'to' date format. Use ISO 8601."}), 400

    if export_format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "timestamp", "vmid", "name", "type", "source_node",
            "target_node", "status", "score_improvement", "initiated_by"
        ])
        for m in history:
            writer.writerow([
                m.get("timestamp", ""),
                m.get("vmid", ""),
                m.get("name", ""),
                m.get("type", ""),
                m.get("source_node", ""),
                m.get("target_node", ""),
                m.get("status", ""),
                m.get("score_improvement", ""),
                m.get("initiated_by", ""),
            ])

        response = make_response(output.getvalue())
        response.headers["Content-Type"] = "text/csv"
        response.headers["Content-Disposition"] = 'attachment; filename="migration_history.csv"'
        return response
    else:
        response = make_response(json.dumps(history, indent=2))
        response.headers["Content-Type"] = "application/json"
        response.headers["Content-Disposition"] = 'attachment; filename="migration_history.json"'
        return response


# ---------------------------------------------------------------------------
# F2: Workload Pattern Recognition
# ---------------------------------------------------------------------------

@recommendations_bp.route("/api/workload-patterns", methods=["GET"])
def get_workload_patterns():
    """Analyze workload patterns for cluster nodes using score history data.

    Detects daily cycles (business-hours vs off-hours), weekly patterns,
    and recurring bursts by analyzing historical score snapshots.

    Query parameters:
      - node (string, optional) - Analyze only this node. If omitted, all nodes.
      - hours (int, default: 168) - How many hours of history to analyze (default 7 days).

    Returns per-node pattern analysis with daily/weekly cycles, burst detection,
    and recommended migration timing windows.
    """
    try:
        hours = request.args.get("hours", 168, type=int)
        target_node = request.args.get("node")

        # Load score history
        score_history_file = os.path.join(BASE_PATH, "score_history.json")
        if not os.path.exists(score_history_file):
            return jsonify({
                "success": False,
                "error": "No score history available. History is built over time as recommendations run.",
                "patterns": [],
            }), 404

        try:
            with open(score_history_file, "r") as f:
                score_history = json.load(f)
        except Exception as read_err:
            return jsonify({"success": False, "error": f"Failed to read score history: {read_err}"}), 500

        if not isinstance(score_history, list):
            return jsonify({"success": False, "error": "Invalid score history format"}), 500

        # Filter by time range
        cutoff = None
        if hours > 0:
            from datetime import timezone, timedelta
            cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

        filtered_history = []
        for entry in score_history:
            if cutoff:
                ts_str = entry.get("timestamp", "")
                try:
                    if ts_str.endswith("Z"):
                        ts_str = ts_str[:-1] + "+00:00"
                    ts = datetime.fromisoformat(ts_str)
                    if ts.tzinfo is None:
                        from datetime import timezone as tz
                        ts = ts.replace(tzinfo=tz.utc)
                    if ts < cutoff:
                        continue
                except (ValueError, TypeError):
                    continue
            filtered_history.append(entry)

        # Determine which nodes to analyze
        node_names = set()
        for entry in filtered_history:
            for n in entry.get("nodes", {}).keys():
                node_names.add(n)

        if target_node:
            if target_node not in node_names:
                return jsonify({
                    "success": True,
                    "patterns": [],
                    "message": f"Node '{target_node}' not found in history data",
                })
            node_names = {target_node}

        patterns = []
        for node_name in sorted(node_names):
            pattern = analyze_workload_patterns(filtered_history, node_name)
            if pattern.get("data_points", 0) > 0:
                patterns.append(pattern)

        return jsonify({
            "success": True,
            "patterns": patterns,
            "history_entries": len(filtered_history),
            "hours_analyzed": hours,
        })

    except Exception as e:
        print(f"Error in get_workload_patterns: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500
