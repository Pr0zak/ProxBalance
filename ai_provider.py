#!/usr/bin/env python3
"""AI Provider abstraction layer for ProxBalance migration recommendations"""

import json
import requests
from typing import Dict, List, Optional, Any
from abc import ABC, abstractmethod


class AIProvider(ABC):
    """Abstract base class for AI providers"""

    @abstractmethod
    def get_recommendations(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Generate migration recommendations based on cluster metrics"""
        pass

    @abstractmethod
    def enhance_recommendations(self, recommendations: List[Dict], cluster_metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Enhance algorithm-generated recommendations with AI insights"""
        pass

    def _summarize_metrics(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Summarize metrics to reduce token count for AI analysis"""
        nodes = metrics.get("nodes", {})
        guests = metrics.get("guests", {})

        # Summarize node data - keep only essential fields
        summarized_nodes = {}
        for node_name, node_data in nodes.items():
            summarized_nodes[node_name] = {
                "cpu_percent": node_data.get("cpu_percent", 0),
                "memory_percent": node_data.get("mem_percent", node_data.get("memory_percent", 0)),
                "status": node_data.get("status", "unknown"),
                "total_memory_gb": node_data.get("total_mem_gb", round(node_data.get("total_memory", 0) / (1024**3), 1)),
                "total_cpu_cores": node_data.get("cpu_cores", node_data.get("total_cpu", 0))
            }

        # Summarize guest data - keep only running VMs/CTs with essential fields
        summarized_guests = {}
        for vmid, guest_data in guests.items():
            # Skip stopped/template guests to save tokens
            if guest_data.get("status") not in ["running", "paused"]:
                continue

            summarized_guests[vmid] = {
                "name": guest_data.get("name", f"vm-{vmid}"),
                "node": guest_data.get("node", "unknown"),
                "type": guest_data.get("type", "qemu"),
                "status": guest_data.get("status", "unknown"),
                "cpu_percent": guest_data.get("cpu_percent", 0),
                "memory_percent": guest_data.get("memory_percent", 0),
                "memory_gb": round(guest_data.get("memory", 0) / (1024**3), 1),
                "tags": guest_data.get("tags", {})
            }

        return {
            "nodes": summarized_nodes,
            "guests": summarized_guests,
            "summary": metrics.get("summary", {}),
            "period_description": metrics.get("period_description", "last 24 hours")
        }

    def _build_prompt(self, metrics: Dict[str, Any]) -> str:
        """Build analysis prompt from metrics - shared by all providers"""
        # Summarize metrics first to reduce token count
        summarized = self._summarize_metrics(metrics)

        # Extract valid node names and guest info for the prompt
        nodes = summarized.get("nodes", {})
        guests = summarized.get("guests", {})
        valid_nodes = list(nodes.keys())

        # Identify guests that should be excluded from recommendations
        ignored_guests = []
        exclude_groups = set()
        for vmid, guest in guests.items():
            tags = guest.get("tags", {})
            if tags.get("has_ignore", False):
                ignored_guests.append(f"{vmid} ({guest.get('name', 'unknown')})")
            for group in tags.get("exclude_groups", []):
                exclude_groups.add(group)

        # Get sample guest for example (not ignored)
        sample_vmid = None
        for vmid, guest in guests.items():
            if not guest.get("tags", {}).get("has_ignore", False):
                sample_vmid = vmid
                sample_guest = guest
                break

        if not sample_vmid:
            sample_vmid = list(guests.keys())[0] if guests else "100"
            sample_guest = guests.get(sample_vmid, {})

        sample_name = sample_guest.get("name", "example-vm")
        sample_node = sample_guest.get("node", valid_nodes[0] if valid_nodes else "node1")
        example_target = valid_nodes[1] if len(valid_nodes) > 1 else valid_nodes[0] if valid_nodes else "node2"

        analysis_period = metrics.get("period_description", "last 24 hours")

        ignore_section = ""
        if ignored_guests:
            ignore_section = f"\n\nIGNORED GUESTS (DO NOT RECOMMEND MIGRATION):\n{', '.join(ignored_guests)}"

        exclude_section = ""
        if exclude_groups:
            exclude_section = f"\n\nEXCLUDE GROUPS: Guests in these groups have affinity rules: {', '.join(exclude_groups)}"

        return f"""Analyze this Proxmox cluster state and provide migration recommendations.

╔════════════════════════════════════════════════════════════════════╗
║ ABSOLUTE FILTERING RULES - MUST BE FOLLOWED WITHOUT EXCEPTION     ║
╠════════════════════════════════════════════════════════════════════╣
║ 1. NEVER recommend guests with tags.has_ignore = true             ║
║ 2. Skip ignored guests completely - do not mention them at all    ║
║ 3. Even if an ignored guest causes imbalance, DO NOT recommend it ║
║ 4. Ignored guests are marked as such for critical operational     ║
║    reasons and MUST NOT be moved under any circumstances          ║
╚════════════════════════════════════════════════════════════════════╝

IMPORTANT: Only use node names that exist in the cluster data provided below.
Valid nodes in this cluster: {', '.join(valid_nodes)}

Analysis Time Frame: {analysis_period}
Focus your analysis on resource trends and patterns over the {analysis_period}.

Cluster Metrics:
{json.dumps(summarized, indent=2)}{ignore_section}{exclude_section}

Please analyze:
1. Current resource utilization (CPU, memory, load)
2. Resource trends and patterns over the {analysis_period}
3. Workload distribution across nodes
4. Anti-affinity compliance (check tags.exclude_groups - guests in same group MUST be on different nodes)
5. Predicted resource constraints based on observed trends

CRITICAL BALANCING RULES - MIGRATIONS MUST REDUCE LOAD:
- ONLY recommend migrations that move FROM high-load TO low-load nodes
- Target nodes MUST have LOWER utilization than source nodes
- DO NOT migrate TO a node with >60% CPU utilization (HARD LIMIT)
- DO NOT migrate TO a node with >70% memory utilization (HARD LIMIT)
- DO NOT migrate FROM low-utilization nodes TO high-utilization nodes
- Target must have BOTH lower CPU AND lower memory than source
- The goal is to REDUCE peak loads and improve balance
- Moving from 20% CPU to 60% CPU is WRONG - do not recommend

ANTI-AFFINITY RULES:
- Guests in the same exclude_group MUST be on DIFFERENT nodes (this is correct behavior)
- ONLY report as "violation" if guests in the same exclude_group are on the SAME node
- DO NOT report compliant configurations as violations

GUEST FILTERING REQUIREMENTS:
- NEVER recommend migration for guests with tags.has_ignore = true
- DO NOT recommend moving guests with exclude_groups tags unless it resolves an affinity violation
- Only recommend migrations that meaningfully improve cluster balance or fix actual violations
- NEVER recommend moving TO an already heavily loaded node (>60% CPU or >70% memory)

Provide recommendations in this JSON format:
{{
  "success": true,
  "analysis": "Brief summary of cluster state",
  "recommendations": [
    {{
      "vmid": {sample_vmid},
      "name": "{sample_name}",
      "source_node": "{sample_node}",
      "target_node": "{example_target}",
      "type": "VM",
      "priority": "high|medium|low",
      "reasoning": "Why this migration is recommended",
      "risk_score": 0.1,
      "estimated_impact": "Expected improvement"
    }}
  ],
  "predicted_issues": [
    {{
      "node": "{valid_nodes[0] if valid_nodes else 'node1'}",
      "metric": "cpu",
      "prediction": "Will exceed 80% in next 2 hours",
      "confidence": 0.85
    }}
  ]
}}

CRITICAL REMINDERS BEFORE GENERATING RESPONSE:
1. Filter OUT any guest where tags.has_ignore = true - do not include in recommendations array
2. Use actual VM/CT names from the guests data, not placeholders like "VM-name"
3. Use only the node names listed above: {', '.join(valid_nodes)}
4. Double-check: Is tags.has_ignore = true? If YES, skip this guest entirely
5. Ignored guests CANNOT be recommended even if they cause imbalance

VALIDATION CHECKLIST - Review each recommendation before including it:
For each migration you want to recommend, verify:
□ Is target_node CPU% < source_node CPU%? (If NO, reject - do not include)
□ Is target_node Memory% < source_node Memory%? (If NO, reject - do not include)
□ Is target_node CPU% < 60%? (If NO, reject - do not include)
□ Is target_node Memory% < 70%? (If NO, reject - do not include)
□ Does tags.has_ignore = true? (If YES, reject - do not include)

If ANY checkbox fails, DO NOT include that migration in your recommendations array.
Do not include rejected migrations with priority "skipped" - omit them completely.

Return valid JSON only."""


class OpenAIProvider(AIProvider):
    """OpenAI GPT provider"""

    def __init__(self, api_key: str, model: str = "gpt-4o", base_url: str = "https://api.openai.com/v1"):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url.rstrip('/')

    def get_recommendations(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Generate recommendations using OpenAI API"""

        prompt = self._build_prompt(metrics)

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert Proxmox cluster administrator analyzing resource utilization and providing migration recommendations."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.3,
            "response_format": {"type": "json_object"}
        }

        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=30
            )
            response.raise_for_status()

            result = response.json()
            content = result['choices'][0]['message']['content']
            return json.loads(content)

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "recommendations": []
            }

    def enhance_recommendations(self, recommendations: List[Dict], cluster_metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Enhance algorithm-generated recommendations with AI insights"""
        if not recommendations:
            return {"success": True, "enhanced_recommendations": []}

        # Build enhancement prompt
        nodes_summary = {}
        for node_name, node in cluster_metrics.get("nodes", {}).items():
            metrics = node.get("metrics", {})
            nodes_summary[node_name] = {
                "avg_cpu_week": metrics.get("avg_cpu_week", metrics.get("avg_cpu", 0)),
                "max_cpu_week": metrics.get("max_cpu_week", metrics.get("max_cpu", 0)),
                "avg_mem_week": metrics.get("avg_mem_week", metrics.get("avg_mem", 0)),
                "cpu_trend": metrics.get("cpu_trend", "unknown"),
                "mem_trend": metrics.get("mem_trend", "unknown")
            }

        prompt = f"""Review these algorithm-generated migration recommendations and provide brief insights for each.

CLUSTER NODE STATUS (7-day averages):
{json.dumps(nodes_summary, indent=2)}

ALGORITHM RECOMMENDATIONS:
{json.dumps(recommendations[:5], indent=2)}

For each recommendation, provide a 1-2 sentence insight explaining:
- Why this target node is suitable (or potential concerns)
- Any historical patterns that support or question this choice
- Brief risk assessment based on 7-day trends

Return JSON format:
{{
  "success": true,
  "insights": [
    {{
      "vmid": 999,
      "insight": "pve4 is a good choice because...",
      "confidence_adjustment": 0  // -10 to +10 to adjust algorithm confidence
    }}
  ]
}}"""

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "You are a Proxmox cluster expert providing brief, actionable insights."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.3,
            "response_format": {"type": "json_object"}
        }

        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=15  # Shorter timeout for enhancement
            )
            response.raise_for_status()
            result = response.json()
            content = result['choices'][0]['message']['content']
            return json.loads(content)
        except Exception as e:
            # Fail gracefully - return recommendations without enhancement
            return {"success": False, "error": str(e), "insights": []}


class AnthropicProvider(AIProvider):
    """Anthropic Claude provider"""

    def __init__(self, api_key: str, model: str = "claude-sonnet-4-5-20250929", base_url: str = "https://api.anthropic.com/v1"):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url.rstrip('/')

    def get_recommendations(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Generate recommendations using Anthropic API"""

        prompt = self._build_prompt(metrics)

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model,
            "max_tokens": 4096,
            "temperature": 0.3,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        }

        try:
            response = requests.post(
                f"{self.base_url}/messages",
                headers=headers,
                json=payload,
                timeout=30
            )
            response.raise_for_status()

            result = response.json()
            content = result['content'][0]['text']

            # Extract JSON from response (Claude might wrap it in markdown)
            if '```json' in content:
                content = content.split('```json')[1].split('```')[0].strip()
            elif '```' in content:
                content = content.split('```')[1].split('```')[0].strip()

            # Try to parse JSON, with fallback for common issues
            try:
                return json.loads(content)
            except json.JSONDecodeError as je:
                # Try to fix common JSON issues
                # Remove trailing commas before } or ]
                import re
                fixed_content = re.sub(r',(\s*[}\]])', r'\1', content)
                try:
                    return json.loads(fixed_content)
                except:
                    # If still failing, return error with original content snippet
                    return {
                        "success": False,
                        "error": f"Invalid JSON from AI: {str(je)}. Content preview: {content[:500]}",
                        "recommendations": []
                    }

        except requests.exceptions.HTTPError as e:
            # Get detailed error from Anthropic API
            error_detail = str(e)
            try:
                error_json = e.response.json()
                error_detail = f"{e.response.status_code} {error_json.get('error', {}).get('type', 'Unknown')}: {error_json.get('error', {}).get('message', str(e))}"
            except:
                pass
            return {
                "success": False,
                "error": error_detail,
                "recommendations": []
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "recommendations": []
            }

    def enhance_recommendations(self, recommendations: List[Dict], cluster_metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Enhance algorithm-generated recommendations with AI insights"""
        if not recommendations:
            return {"success": True, "insights": []}

        # Reuse OpenAI's enhancement logic with Anthropic API
        nodes_summary = {}
        for node_name, node in cluster_metrics.get("nodes", {}).items():
            metrics = node.get("metrics", {})
            nodes_summary[node_name] = {
                "avg_cpu_week": metrics.get("avg_cpu_week", metrics.get("avg_cpu", 0)),
                "max_cpu_week": metrics.get("max_cpu_week", metrics.get("max_cpu", 0)),
                "avg_mem_week": metrics.get("avg_mem_week", metrics.get("avg_mem", 0)),
                "cpu_trend": metrics.get("cpu_trend", "unknown"),
                "mem_trend": metrics.get("mem_trend", "unknown")
            }

        prompt = f"""Review these algorithm-generated migration recommendations and provide brief insights for each.

CLUSTER NODE STATUS (7-day averages):
{json.dumps(nodes_summary, indent=2)}

ALGORITHM RECOMMENDATIONS:
{json.dumps(recommendations[:5], indent=2)}

For each recommendation, provide a 1-2 sentence insight explaining:
- Why this target node is suitable (or potential concerns)
- Any historical patterns that support or question this choice
- Brief risk assessment based on 7-day trends

Return JSON format:
{{
  "success": true,
  "insights": [
    {{
      "vmid": 999,
      "insight": "pve4 is a good choice because...",
      "confidence_adjustment": 0
    }}
  ]
}}"""

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model,
            "max_tokens": 2000,
            "temperature": 0.3,
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }

        try:
            response = requests.post(
                f"{self.base_url}/messages",
                headers=headers,
                json=payload,
                timeout=15
            )
            response.raise_for_status()
            result = response.json()
            content = result['content'][0]['text']

            # Extract JSON from response
            if '```json' in content:
                content = content.split('```json')[1].split('```')[0].strip()
            elif '```' in content:
                content = content.split('```')[1].split('```')[0].strip()

            return json.loads(content)
        except Exception as e:
            return {"success": False, "error": str(e), "insights": []}


class LocalLLMProvider(AIProvider):
    """Local LLM provider (Ollama)"""

    def __init__(self, base_url: str = "http://localhost:11434", model: str = "llama3.1:8b"):
        self.base_url = base_url.rstrip('/')
        self.model = model

    def get_recommendations(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Generate recommendations using local LLM (Ollama)"""

        prompt = self._build_prompt(metrics)

        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }

        try:
            response = requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=60
            )
            response.raise_for_status()

            result = response.json()
            content = result.get('response', '{}')
            return json.loads(content)

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "recommendations": []
            }

    def enhance_recommendations(self, recommendations: List[Dict], cluster_metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Enhance algorithm-generated recommendations with AI insights"""
        if not recommendations:
            return {"success": True, "insights": []}

        # Similar logic for local LLM
        nodes_summary = {}
        for node_name, node in cluster_metrics.get("nodes", {}).items():
            metrics = node.get("metrics", {})
            nodes_summary[node_name] = {
                "avg_cpu_week": metrics.get("avg_cpu_week", metrics.get("avg_cpu", 0)),
                "max_cpu_week": metrics.get("max_cpu_week", metrics.get("max_cpu", 0)),
                "avg_mem_week": metrics.get("avg_mem_week", metrics.get("avg_mem", 0)),
                "cpu_trend": metrics.get("cpu_trend", "unknown"),
                "mem_trend": metrics.get("mem_trend", "unknown")
            }

        prompt = f"""Review these migration recommendations and provide brief insights.

NODES (7-day averages):
{json.dumps(nodes_summary, indent=2)}

RECOMMENDATIONS:
{json.dumps(recommendations[:5], indent=2)}

For each, explain why the target is suitable and any concerns. Return JSON:
{{"success": true, "insights": [{{"vmid": 999, "insight": "...", "confidence_adjustment": 0}}]}}"""

        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }

        try:
            response = requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            result = response.json()
            content = result.get('response', '{}')
            return json.loads(content)
        except Exception as e:
            return {"success": False, "error": str(e), "insights": []}


class AIProviderFactory:
    """Factory for creating AI provider instances"""

    @staticmethod
    def create_provider(config: Dict[str, Any]) -> Optional[AIProvider]:
        """Create AI provider based on configuration"""

        provider_type = config.get('ai_provider', 'none').lower()

        if provider_type == 'none' or not config.get('ai_recommendations_enabled', False):
            return None

        ai_config = config.get('ai_config', {})

        if provider_type == 'openai':
            openai_config = ai_config.get('openai', {})
            api_key = openai_config.get('api_key', '')
            if not api_key:
                raise ValueError("OpenAI API key is required")
            return OpenAIProvider(
                api_key=api_key,
                model=openai_config.get('model', 'gpt-4o'),
                base_url=openai_config.get('base_url', 'https://api.openai.com/v1')
            )

        elif provider_type == 'anthropic':
            anthropic_config = ai_config.get('anthropic', {})
            api_key = anthropic_config.get('api_key', '')
            if not api_key:
                raise ValueError("Anthropic API key is required")
            return AnthropicProvider(
                api_key=api_key,
                model=anthropic_config.get('model', 'claude-sonnet-4-5-20250929'),
                base_url=anthropic_config.get('base_url', 'https://api.anthropic.com/v1')
            )

        elif provider_type == 'local':
            local_config = ai_config.get('local', {})
            return LocalLLMProvider(
                base_url=local_config.get('base_url', 'http://localhost:11434'),
                model=local_config.get('model', 'llama3.1:8b')
            )

        else:
            raise ValueError(f"Unknown AI provider: {provider_type}")


def get_ai_provider() -> Optional[AIProvider]:
    """
    Get configured AI provider instance.

    Returns:
        AIProvider instance if configured, None otherwise
    """
    from app import load_config
    config = load_config()
    return AIProviderFactory.create_provider(config)
