"""
Recommendations and node scoring routes.

Handles recommendation generation, caching, threshold suggestions,
and node suitability scoring.
"""

from flask import Blueprint, jsonify, request, current_app
import json, os, sys
from datetime import datetime
from proxbalance.config_manager import load_config, load_penalty_config, BASE_PATH
from proxbalance.scoring import calculate_intelligent_thresholds, calculate_target_node_score, DEFAULT_PENALTY_CONFIG
from proxbalance.recommendations import generate_recommendations

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
            recommendations = generate_recommendations(
                cache_data.get('nodes', {}),
                cache_data.get('guests', {}),
                cpu_threshold,
                mem_threshold,
                iowait_threshold,
                maintenance_nodes
            )
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
                        print(f"✓ AI enhancement complete: {len(enhancement_result['insights'])} insights added", file=sys.stderr)
                    else:
                        print(f"AI enhancement returned no insights", file=sys.stderr)
            except Exception as e:
                print(f"Warning: AI enhancement failed (continuing with algorithm-only): {str(e)}", file=sys.stderr)
                # Continue without AI enhancement - graceful degradation

        # Cache the recommendations result
        recommendations_cache = {
            "success": True,
            "recommendations": recommendations,
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

            # Calculate the actual score using the same function as recommendations
            # pending_target_guests is empty since we're just calculating base scores
            score = calculate_target_node_score(
                target_node=node,
                guest=dummy_guest,
                pending_target_guests={},
                cpu_threshold=cpu_threshold,
                mem_threshold=mem_threshold
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
                'max_mem_week': round(max_mem_week, 1)
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
