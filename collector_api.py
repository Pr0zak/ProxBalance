#!/usr/bin/env python3
"""
Background data collector for Proxmox Balance Manager
Uses Proxmox API for fast, reliable data collection
"""

import json
import sys
import os
from datetime import datetime
from typing import Dict, List, Optional
import urllib3
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

# Disable SSL warnings for self-signed certificates
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Determine paths based on environment
if os.path.exists('/opt/proxmox-balance-manager'):
    BASE_PATH = '/opt/proxmox-balance-manager'
else:
    BASE_PATH = '/app/cache'

CACHE_FILE = os.path.join(BASE_PATH, 'cluster_cache.json')
CONFIG_FILE = os.path.join(BASE_PATH, 'config.json')

def load_config():
    """Load configuration from config.json"""
    if not os.path.exists(CONFIG_FILE):
        raise FileNotFoundError(
            f"Configuration file not found: {CONFIG_FILE}\n"
            f"Please ensure ProxBalance is properly installed and config.json exists."
        )
    
    try:
        with open(CONFIG_FILE, 'r') as f:
            config = json.load(f)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Invalid JSON in configuration file: {CONFIG_FILE}\n"
            f"Error: {e}"
        )
    except Exception as e:
        raise Exception(f"Error reading configuration file: {e}")
    
    proxmox_host = config.get('proxmox_host')
    if not proxmox_host:
        raise ValueError(
            f"Missing 'proxmox_host' in configuration file: {CONFIG_FILE}\n"
            f"Please set the proxmox_host value to your primary Proxmox node IP/hostname."
        )
    
    if proxmox_host == "CHANGE_ME":
        raise ValueError(
            f"Configuration not completed: proxmox_host is set to 'CHANGE_ME'\n"
            f"Please edit {CONFIG_FILE} and set proxmox_host to your Proxmox node IP/hostname."
        )
    
    return config


class ProxmoxAPICollector:
    """Collect cluster data using Proxmox API"""

    def __init__(self, config: Dict):
        self.config = config
        self.proxmox_host = config['proxmox_host']
        self.proxmox_port = config.get('proxmox_port', 8006)
        self.verify_ssl = config.get('proxmox_verify_ssl', False)
        self.auth_method = config.get('proxmox_auth_method', 'api_token')
        self.nodes = {}
        self.guests = {}
        self.proxmox = None

        # Collection optimization settings
        opt_config = config.get('collection_optimization', {})
        self.parallel_enabled = opt_config.get('parallel_collection_enabled', True)
        self.max_workers = opt_config.get('max_parallel_workers', 5)
        self.skip_stopped_rrd = opt_config.get('skip_stopped_guest_rrd', True)
        self.node_rrd_timeframe = opt_config.get('node_rrd_timeframe', 'day')
        self.guest_rrd_timeframe = opt_config.get('guest_rrd_timeframe', 'hour')

        print(f"Collection optimization: parallel={self.parallel_enabled}, workers={self.max_workers}, skip_stopped={self.skip_stopped_rrd}")

        self._connect()
    
    def _connect(self):
        """Establish connection to Proxmox API"""
        try:
            from proxmoxer import ProxmoxAPI
        except ImportError:
            raise Exception(
                "proxmoxer library not installed. Install with:\n"
                "  pip install proxmoxer\n"
                "or\n"
                "  apt install python3-proxmoxer"
            )
        
        try:
            if self.auth_method == 'api_token':
                token_id = self.config.get('proxmox_api_token_id', '')
                token_secret = self.config.get('proxmox_api_token_secret', '')
                
                if not token_id or not token_secret:
                    raise ValueError(
                        "API token authentication selected but credentials missing.\n"
                        "Please set 'proxmox_api_token_id' and 'proxmox_api_token_secret' in config.json\n"
                        "Run create_api_token.sh on your Proxmox server to create a token."
                    )
                
                # Split token_id into user and token name
                # Format: user@realm!tokenname
                if '!' not in token_id:
                    raise ValueError(f"Invalid token ID format: {token_id}. Expected format: user@realm!tokenname")
                
                user, token_name = token_id.split('!', 1)
                
                self.proxmox = ProxmoxAPI(
                    self.proxmox_host,
                    user=user,
                    token_name=token_name,
                    token_value=token_secret,
                    port=self.proxmox_port,
                    verify_ssl=self.verify_ssl
                )
            else:
                # Username/password authentication
                username = self.config.get('proxmox_username', 'proxbalance@pam')
                password = self.config.get('proxmox_password', '')
                
                if not password:
                    raise ValueError(
                        "Password authentication selected but no password provided.\n"
                        "Please set 'proxmox_password' in config.json\n"
                        "Or use API token authentication (recommended)"
                    )
                
                self.proxmox = ProxmoxAPI(
                    self.proxmox_host,
                    user=username,
                    password=password,
                    port=self.proxmox_port,
                    verify_ssl=self.verify_ssl
                )
            
            # Test connection
            self.proxmox.version.get()
            
        except Exception as e:
            raise Exception(f"Failed to connect to Proxmox API at {self.proxmox_host}:{self.proxmox_port}: {str(e)}")
    
    def get_cluster_resources(self) -> List[Dict]:
        """Fetch cluster resources"""
        try:
            return self.proxmox.cluster.resources.get()
        except Exception as e:
            raise Exception(f"Failed to fetch cluster resources: {str(e)}")

    def get_ha_resources(self) -> List[Dict]:
        """Fetch HA managed resources"""
        try:
            return self.proxmox.cluster.ha.resources.get()
        except Exception as e:
            print(f"Warning: Failed to fetch HA resources: {str(e)}", file=sys.stderr)
            return []

    def get_ha_status(self) -> Dict:
        """Fetch HA manager status"""
        try:
            return self.proxmox.cluster.ha.status.manager_status.get()
        except Exception as e:
            print(f"Warning: Failed to fetch HA status: {str(e)}", file=sys.stderr)
            return {}

    def get_cluster_status(self) -> List[Dict]:
        """Fetch cluster/corosync status"""
        try:
            return self.proxmox.cluster.status.get()
        except Exception as e:
            print(f"Warning: Failed to fetch cluster status: {str(e)}", file=sys.stderr)
            return []

    def get_storage_status(self, node: str) -> List[Dict]:
        """Fetch storage status for a node"""
        try:
            return self.proxmox.nodes(node).storage.get()
        except Exception as e:
            print(f"Warning: Failed to fetch storage for {node}: {str(e)}", file=sys.stderr)
            return []

    def get_backup_info(self) -> List[Dict]:
        """Fetch backup information"""
        try:
            # Get guests not backed up
            not_backed_up = self.proxmox.cluster('backup-info')('not-backed-up').get()
            return not_backed_up
        except Exception as e:
            print(f"Warning: Failed to fetch backup info: {str(e)}", file=sys.stderr)
            return []

    def get_resource_pools(self) -> List[Dict]:
        """Fetch resource pools"""
        try:
            return self.proxmox.pools.get()
        except Exception as e:
            print(f"Warning: Failed to fetch resource pools: {str(e)}", file=sys.stderr)
            return []

    def get_guest_agent_info(self, node: str, vmid: int) -> Dict:
        """Fetch guest agent information (VMs only)"""
        try:
            return self.proxmox.nodes(node).qemu(vmid).agent.info.get()
        except Exception as e:
            # Guest agent not available or not installed - this is normal
            return {}
    
    def get_node_rrd_data(self, node: str, timeframe: str = "day") -> List[Dict]:
        """Fetch RRD performance data for a node"""
        try:
            data = self.proxmox.nodes(node).rrddata.get(timeframe=timeframe)
            print(f"Fetched {len(data)} RRD data points for {node} (timeframe: {timeframe})")
            return data
        except Exception as e:
            print(f"Error fetching RRD data for {node}: {str(e)}", file=sys.stderr)
            return []
    
    def get_guest_config(self, node: str, vmid: int, guest_type: str) -> Dict:
        """Fetch guest configuration including tags"""
        try:
            if guest_type == 'qemu':
                return self.proxmox.nodes(node).qemu(vmid).config.get()
            else:  # lxc
                return self.proxmox.nodes(node).lxc(vmid).config.get()
        except Exception as e:
            print(f"Warning: Failed to fetch config for {guest_type} {vmid} on {node}: {str(e)}", file=sys.stderr)
            return {}

    def get_guest_rrd_data(self, node: str, vmid: int, guest_type: str, timeframe: str = "hour") -> List[Dict]:
        """Fetch RRD performance data for a guest (VM or CT)"""
        try:
            if guest_type == 'qemu':
                data = self.proxmox.nodes(node).qemu(vmid).rrddata.get(timeframe=timeframe)
            else:  # lxc
                data = self.proxmox.nodes(node).lxc(vmid).rrddata.get(timeframe=timeframe)
            return data
        except Exception as e:
            # Silently fail - some guests may not have RRD data
            return []

    def parse_tags(self, tags_str: str) -> Dict:
        """Parse tags and extract ignore/exclude rules"""
        if not tags_str:
            return {"has_ignore": False, "exclude_groups": [], "all_tags": []}

        tags = [t.strip() for t in tags_str.replace(";", " ").split()]
        has_ignore = "ignore" in tags
        exclude_groups = [t for t in tags if t.startswith("exclude_")]

        return {
            "has_ignore": has_ignore,
            "exclude_groups": exclude_groups,
            "all_tags": tags
        }

    def _process_single_node(self, node: Dict) -> Dict:
        """Process a single node's data (called in parallel or sequential)"""
        node_name = node["node"]
        print(f"Processing node: {node_name}")

        # Get RRD data for multiple timeframes
        # This allows UI to show different time ranges without re-fetching
        timeframes = {
            'hour': self.get_node_rrd_data(node_name, 'hour'),    # ~60 points, 1-min intervals
            'day': self.get_node_rrd_data(node_name, 'day'),      # ~1440 points, 1-min intervals
            'week': self.get_node_rrd_data(node_name, 'week'),    # ~1680 points, 5-min intervals
            'month': self.get_node_rrd_data(node_name, 'month'),  # ~2000 points, 30-min intervals
            'year': self.get_node_rrd_data(node_name, 'year')     # ~2000 points, 6-hour intervals
        }

        # Calculate metrics from multiple timeframes for better trend analysis
        metrics = {
            "current_cpu": node.get("cpu", 0) * 100,
            "current_mem": (node.get("mem", 0) / node.get("maxmem", 1)) * 100 if node.get("maxmem") else 0,
            "current_iowait": 0,
            # 24-hour averages (detailed, short-term)
            "avg_cpu": 0,
            "max_cpu": 0,
            "avg_mem": 0,
            "max_mem": 0,
            "avg_iowait": 0,
            "max_iowait": 0,
            "avg_load": 0,
            # 7-day averages (longer-term trends)
            "avg_cpu_week": 0,
            "max_cpu_week": 0,
            "avg_mem_week": 0,
            "max_mem_week": 0,
            "avg_iowait_week": 0,
            # Trend indicators
            "cpu_trend": "stable",  # "rising", "falling", "stable"
            "mem_trend": "stable",
            "has_historical": False
        }

        # Calculate 24-hour metrics (detailed)
        rrd_day = timeframes['day']
        if rrd_day:
            cpu_values_day = [d["cpu"] * 100 for d in rrd_day if "cpu" in d and d["cpu"] is not None]
            mem_values_day = [(d["memused"] / d["memtotal"] * 100) for d in rrd_day
                         if "memused" in d and "memtotal" in d and d["memtotal"] > 0]
            iowait_values_day = [d["iowait"] * 100 for d in rrd_day if "iowait" in d and d["iowait"] is not None]
            load_values_day = [d["loadavg"] for d in rrd_day if "loadavg" in d and d["loadavg"] is not None]

            if cpu_values_day:
                metrics["avg_cpu"] = sum(cpu_values_day) / len(cpu_values_day)
                metrics["max_cpu"] = max(cpu_values_day)
                metrics["has_historical"] = True

            if mem_values_day:
                metrics["avg_mem"] = sum(mem_values_day) / len(mem_values_day)
                metrics["max_mem"] = max(mem_values_day)

            if iowait_values_day:
                metrics["avg_iowait"] = sum(iowait_values_day) / len(iowait_values_day)
                metrics["max_iowait"] = max(iowait_values_day)
                metrics["current_iowait"] = iowait_values_day[-1] if iowait_values_day else 0

            if load_values_day:
                metrics["avg_load"] = sum(load_values_day) / len(load_values_day)

        # Calculate 7-day metrics (longer-term patterns)
        rrd_week = timeframes['week']
        if rrd_week:
            cpu_values_week = [d["cpu"] * 100 for d in rrd_week if "cpu" in d and d["cpu"] is not None]
            mem_values_week = [(d["memused"] / d["memtotal"] * 100) for d in rrd_week
                          if "memused" in d and "memtotal" in d and d["memtotal"] > 0]
            iowait_values_week = [d["iowait"] * 100 for d in rrd_week if "iowait" in d and d["iowait"] is not None]

            if cpu_values_week:
                metrics["avg_cpu_week"] = sum(cpu_values_week) / len(cpu_values_week)
                metrics["max_cpu_week"] = max(cpu_values_week)

                # Detect CPU trend: compare recent 20% vs older 20%
                recent_size = max(1, len(cpu_values_week) // 5)
                recent_avg = sum(cpu_values_week[-recent_size:]) / recent_size
                older_avg = sum(cpu_values_week[:recent_size]) / recent_size
                diff = recent_avg - older_avg
                if diff > 10:  # Rising more than 10%
                    metrics["cpu_trend"] = "rising"
                elif diff < -10:  # Falling more than 10%
                    metrics["cpu_trend"] = "falling"

            if mem_values_week:
                metrics["avg_mem_week"] = sum(mem_values_week) / len(mem_values_week)
                metrics["max_mem_week"] = max(mem_values_week)

                # Detect memory trend
                recent_size = max(1, len(mem_values_week) // 5)
                recent_avg = sum(mem_values_week[-recent_size:]) / recent_size
                older_avg = sum(mem_values_week[:recent_size]) / recent_size
                diff = recent_avg - older_avg
                if diff > 10:
                    metrics["mem_trend"] = "rising"
                elif diff < -10:
                    metrics["mem_trend"] = "falling"

            if iowait_values_week:
                metrics["avg_iowait_week"] = sum(iowait_values_week) / len(iowait_values_week)

        # Process RRD data for all timeframes (for charting at different time ranges)
        trend_data = {}
        total_points = 0

        for timeframe_name, timeframe_rrd in timeframes.items():
            trend_data[timeframe_name] = []
            if timeframe_rrd:
                for point in timeframe_rrd:
                    if "time" in point and "cpu" in point and "memused" in point and "memtotal" in point:
                        trend_data[timeframe_name].append({
                            "time": point["time"],
                            "cpu": round(point["cpu"] * 100, 2) if point["cpu"] is not None else 0,
                            "mem": round((point["memused"] / point["memtotal"] * 100), 2) if point["memused"] and point["memtotal"] else 0,
                            "iowait": round(point["iowait"] * 100, 2) if "iowait" in point and point["iowait"] is not None else 0
                        })
                total_points += len(trend_data[timeframe_name])

        print(f"Processed {total_points} trend data points across {len(timeframes)} timeframes for {node_name}")

        # Get storage status
        storage_info = []
        storage_status = self.get_storage_status(node_name)
        for storage in storage_status:
            if storage.get("enabled", 1) == 1:  # Only enabled storage
                total_gb = storage.get("total", 0) / (1024**3)
                used_gb = storage.get("used", 0) / (1024**3)
                avail_gb = storage.get("avail", 0) / (1024**3)
                usage_pct = (used_gb / total_gb * 100) if total_gb > 0 else 0

                storage_info.append({
                    "storage": storage.get("storage", "unknown"),
                    "type": storage.get("type", "unknown"),
                    "content": storage.get("content", ""),
                    "active": storage.get("active", 0) == 1,
                    "total_gb": round(total_gb, 2),
                    "used_gb": round(used_gb, 2),
                    "avail_gb": round(avail_gb, 2),
                    "usage_pct": round(usage_pct, 2)
                })

        return {
            "name": node_name,
            "status": node.get("status", "unknown"),
            "cpu_cores": node.get("maxcpu", 0),
            "total_mem_gb": node.get("maxmem", 0) / (1024**3),
            "uptime": node.get("uptime", 0),
            "cpu_percent": metrics["current_cpu"],
            "mem_percent": metrics["current_mem"],
            "metrics": metrics,
            "trend_data": trend_data,
            "storage": storage_info,
            "guests": []
        }
    
    def analyze_cluster(self) -> Dict:
        """Perform full cluster analysis"""
        start_time = time.time()
        print(f"Fetching cluster resources from {self.proxmox_host}...")
        resources = self.get_cluster_resources()

        nodes_raw = [r for r in resources if r["type"] == "node"]
        vms_raw = [r for r in resources if r["type"] == "qemu"]
        cts_raw = [r for r in resources if r["type"] == "lxc"]

        print(f"Found {len(nodes_raw)} nodes, {len(vms_raw)} VMs, {len(cts_raw)} containers")

        # Fetch cluster-level information
        print("Fetching cluster-level data (HA, status, backup info, pools)...")
        ha_resources = self.get_ha_resources()
        ha_status = self.get_ha_status()
        cluster_status = self.get_cluster_status()
        backup_info = self.get_backup_info()
        resource_pools = self.get_resource_pools()

        # Create HA lookup for quick access
        ha_managed = {}
        for ha_res in ha_resources:
            sid = ha_res.get("sid", "")  # Format: vm:123 or ct:123
            ha_managed[sid] = {
                "state": ha_res.get("state", "unknown"),
                "group": ha_res.get("group", ""),
                "max_relocate": ha_res.get("max_relocate", 1),
                "max_restart": ha_res.get("max_restart", 1)
            }

        # Create backup lookup
        not_backed_up_ids = set()
        for guest in backup_info:
            vmid = guest.get("vmid")
            if vmid:
                not_backed_up_ids.add(str(vmid))

        # Create pool membership lookup
        pool_membership = {}  # vmid -> pool_name
        for pool in resource_pools:
            pool_name = pool.get("poolid", "")
            members = pool.get("members", [])
            for member in members:
                vmid = member.get("vmid")
                if vmid:
                    pool_membership[str(vmid)] = pool_name

        # Parse cluster health
        cluster_health = {
            "quorate": False,
            "nodes": 0,
            "online_nodes": 0
        }
        for item in cluster_status:
            if item.get("type") == "cluster":
                cluster_health["quorate"] = item.get("quorate", 0) == 1
                cluster_health["nodes"] = item.get("nodes", 0)
            elif item.get("type") == "node":
                if item.get("online", 0) == 1:
                    cluster_health["online_nodes"] += 1

        # Store performance metrics
        self.perf_metrics = {
            "node_count": len(nodes_raw),
            "guest_count": len(vms_raw) + len(cts_raw),
            "parallel_enabled": self.parallel_enabled,
            "max_workers": self.max_workers if self.parallel_enabled else 1,
            "ha_enabled": len(ha_resources) > 0,
            "cluster_quorate": cluster_health["quorate"]
        }

        # Process nodes - parallel or sequential based on config
        if self.parallel_enabled and len(nodes_raw) > 1:
            print(f"Using parallel collection with {self.max_workers} workers")
            node_start = time.time()

            with ThreadPoolExecutor(max_workers=min(self.max_workers, len(nodes_raw))) as executor:
                future_to_node = {
                    executor.submit(self._process_single_node, node): node["node"]
                    for node in nodes_raw
                }

                for future in as_completed(future_to_node):
                    node_name = future_to_node[future]
                    try:
                        self.nodes[node_name] = future.result()
                    except Exception as e:
                        print(f"Error processing node {node_name}: {e}", file=sys.stderr)
                        import traceback
                        traceback.print_exc()

            node_duration = time.time() - node_start
            self.perf_metrics["node_processing_time"] = round(node_duration, 2)
            print(f"Parallel node processing completed in {node_duration:.2f}s")
        else:
            print("Using sequential collection")
            node_start = time.time()

            for node in nodes_raw:
                node_name = node["node"]
                try:
                    self.nodes[node_name] = self._process_single_node(node)
                except Exception as e:
                    print(f"Error processing node {node_name}: {e}", file=sys.stderr)

            node_duration = time.time() - node_start
            self.perf_metrics["node_processing_time"] = round(node_duration, 2)
            print(f"Sequential node processing completed in {node_duration:.2f}s")
        
        # Process guests (VMs and containers)
        guest_start = time.time()
        for guest in vms_raw + cts_raw:
            vmid = guest["vmid"]
            node_name = guest["node"]
            guest_type_raw = guest["type"]
            guest_type = "VM" if guest_type_raw == "qemu" else "CT"
            guest_status = guest.get("status", "unknown")

            # Get config for tags
            config = self.get_guest_config(node_name, vmid, guest_type_raw)
            tags_data = self.parse_tags(config.get("tags", ""))

            # Get RRD data for I/O metrics - skip if guest is stopped and optimization enabled
            disk_read_bps = 0
            disk_write_bps = 0
            net_in_bps = 0
            net_out_bps = 0

            if self.skip_stopped_rrd and guest_status != "running":
                # Skip RRD collection for stopped guests
                pass
            else:
                # Get RRD data for I/O metrics using configured timeframe
                rrd_data = self.get_guest_rrd_data(node_name, vmid, guest_type_raw, self.guest_rrd_timeframe)

                if rrd_data and len(rrd_data) > 0:
                    # Get the most recent data point with valid I/O data
                    for point in reversed(rrd_data):
                        if "diskread" in point and "diskwrite" in point and "netin" in point and "netout" in point:
                            disk_read_bps = point.get("diskread", 0) or 0
                            disk_write_bps = point.get("diskwrite", 0) or 0
                            net_in_bps = point.get("netin", 0) or 0
                            net_out_bps = point.get("netout", 0) or 0
                            break

            # Check HA status
            ha_sid = f"{'vm' if guest_type == 'VM' else 'ct'}:{vmid}"
            ha_info = ha_managed.get(ha_sid, None)

            # Check backup status
            has_backup = str(vmid) not in not_backed_up_ids

            # Check pool membership
            pool_name = pool_membership.get(str(vmid), None)

            # Get guest agent info (VMs only, and only if running)
            agent_info = {}
            if guest_type == "VM" and guest_status == "running":
                agent_data = self.get_guest_agent_info(node_name, vmid)
                if agent_data:
                    agent_info = {
                        "version": agent_data.get("version", "unknown"),
                        "supported_commands": len(agent_data.get("supported_commands", []))
                    }

            guest_info = {
                "vmid": vmid,
                "name": guest.get("name") or config.get("name") or f"{guest_type}-{vmid}",
                "type": guest_type,
                "node": node_name,
                "status": guest.get("status", "unknown"),
                "cpu_current": guest.get("cpu", 0) * 100 if guest.get("cpu") else 0,
                "cpu_cores": config.get("cores") or config.get("cpus") or config.get("cpulimit") or guest.get("maxcpu", 0),
                "mem_used_gb": guest.get("mem", 0) / (1024**3),
                "mem_max_gb": guest.get("maxmem", 0) / (1024**3),
                "disk_gb": guest.get("disk", 0) / (1024**3),
                "disk_read_bps": disk_read_bps,
                "disk_write_bps": disk_write_bps,
                "net_in_bps": net_in_bps,
                "net_out_bps": net_out_bps,
                "tags": tags_data,
                "ha_managed": ha_info is not None,
                "ha_state": ha_info.get("state") if ha_info else None,
                "ha_group": ha_info.get("group") if ha_info else None,
                "has_backup": has_backup,
                "pool": pool_name,
                "agent_running": len(agent_info) > 0,
                "agent_info": agent_info if agent_info else None
            }
            
            self.guests[str(vmid)] = guest_info
            if node_name in self.nodes:
                self.nodes[node_name]["guests"].append(vmid)

        guest_duration = time.time() - guest_start
        total_duration = time.time() - start_time

        self.perf_metrics["guest_processing_time"] = round(guest_duration, 2)
        self.perf_metrics["total_time"] = round(total_duration, 2)

        print(f"Guest processing completed in {guest_duration:.2f}s")
        print(f"Total collection time: {total_duration:.2f}s")

        # Store cluster-level data for summary
        self.cluster_health = cluster_health
        self.ha_status = ha_status

        return self.generate_summary()
    
    def generate_summary(self) -> Dict:
        """Generate cluster summary"""
        total_guests = len(self.guests)
        ignored = sum(1 for g in self.guests.values() if g["tags"]["has_ignore"])
        excluded = sum(1 for g in self.guests.values() if g["tags"]["exclude_groups"])
        ha_managed_count = sum(1 for g in self.guests.values() if g.get("ha_managed", False))
        backed_up_count = sum(1 for g in self.guests.values() if g.get("has_backup", False))

        return {
            "collected_at": datetime.utcnow().isoformat() + 'Z',
            "nodes": self.nodes,
            "guests": self.guests,
            "summary": {
                "total_nodes": len(self.nodes),
                "total_guests": total_guests,
                "vms": sum(1 for g in self.guests.values() if g["type"] == "VM"),
                "containers": sum(1 for g in self.guests.values() if g["type"] == "CT"),
                "ignored_guests": ignored,
                "excluded_guests": excluded,
                "ha_managed_guests": ha_managed_count,
                "backed_up_guests": backed_up_count
            },
            "cluster_health": getattr(self, 'cluster_health', {}),
            "ha_status": getattr(self, 'ha_status', {}),
            "performance": getattr(self, 'perf_metrics', {})
        }


def collect_data():
    """Collect cluster data and save to cache"""
    try:
        print(f"[{datetime.utcnow()}] Starting cluster data collection...")
        config = load_config()
        
        print(f"[{datetime.utcnow()}] Using Proxmox host: {config['proxmox_host']}")
        print(f"[{datetime.utcnow()}] Authentication method: {config.get('proxmox_auth_method', 'api_token')}")
        
        collector = ProxmoxAPICollector(config)
        data = collector.analyze_cluster()
        
        # Write to cache file atomically
        temp_file = CACHE_FILE + '.tmp'
        with open(temp_file, 'w') as f:
            json.dump(data, f, indent=2)
        
        # Atomic rename
        os.rename(temp_file, CACHE_FILE)
        
        print(f"[{datetime.utcnow()}] Data collection complete. Cache updated.")
        print(f"[{datetime.utcnow()}] Collected data for {data['summary']['total_nodes']} nodes and {data['summary']['total_guests']} guests")
        return True
        
    except (FileNotFoundError, ValueError) as e:
        print(f"\n{'='*70}", file=sys.stderr)
        print(f"CONFIGURATION ERROR", file=sys.stderr)
        print(f"{'='*70}", file=sys.stderr)
        print(f"\n{str(e)}\n", file=sys.stderr)
        return False
        
    except Exception as e:
        print(f"\n{'='*70}", file=sys.stderr)
        print(f"RUNTIME ERROR", file=sys.stderr)
        print(f"{'='*70}", file=sys.stderr)
        print(f"\n{str(e)}\n", file=sys.stderr)
        import traceback
        traceback.print_exc()
        print(f"\n{'='*70}\n", file=sys.stderr)
        return False


if __name__ == '__main__':
    success = collect_data()
    sys.exit(0 if success else 1)
