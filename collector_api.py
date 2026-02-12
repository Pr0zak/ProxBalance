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

    def _summarize_guest_rrd(self, rrd_data: List[Dict]) -> Dict:
        """Summarize guest RRD data into min/max/avg/p95 for CPU and memory."""
        if not rrd_data:
            return {}

        cpu_values = []
        mem_values = []

        for point in rrd_data:
            cpu = point.get('cpu')
            if cpu is not None:
                cpu_values.append(cpu * 100)  # Convert to percentage

            maxmem = point.get('maxmem', 0)
            mem = point.get('mem', 0)
            if maxmem and maxmem > 0:
                mem_values.append(mem / maxmem * 100)

        def _stats(values):
            if not values:
                return {}
            sorted_v = sorted(values)
            n = len(sorted_v)
            return {
                "min": round(sorted_v[0], 1),
                "max": round(sorted_v[-1], 1),
                "avg": round(sum(sorted_v) / n, 1),
                "p95": round(sorted_v[int(n * 0.95)] if n > 1 else sorted_v[0], 1),
                "samples": n,
            }

        result = {}
        if cpu_values:
            result["cpu"] = _stats(cpu_values)
        if mem_values:
            result["mem"] = _stats(mem_values)
        return result

    def parse_tags(self, tags_str: str) -> Dict:
        """Parse tags and extract ignore/exclude/affinity rules"""
        if not tags_str:
            return {"has_ignore": False, "exclude_groups": [], "affinity_groups": [], "all_tags": []}

        tags = [t.strip() for t in tags_str.replace(";", " ").split()]
        has_ignore = "ignore" in tags
        exclude_groups = [t for t in tags if t.startswith("exclude_")]
        affinity_groups = [t for t in tags if t.startswith("affinity_")]
        has_bindmount_tag = "has-bindmount" in tags

        return {
            "has_ignore": has_ignore,
            "exclude_groups": exclude_groups,
            "affinity_groups": affinity_groups,
            "has_bindmount": has_bindmount_tag,
            "all_tags": tags
        }

    def detect_mount_points(self, config: Dict) -> Dict:
        """
        Detect mount points in LXC container configuration.
        Returns info about bind mounts and storage-backed mount points.

        Mount point types:
        - Bind mounts: /host/path,mp=/container/path
        - Storage-backed: volume:storage-volume,mp=/container/path
        - Shared bind mounts: /host/path,mp=/container/path,shared=1 (can be migrated if path exists on target)

        The 'shared=1' flag indicates the mount point is available on all nodes,
        allowing migration with 'pct migrate --force' or automatic migration.
        """
        mount_points = []
        has_bind_mount = False
        has_storage_mount = False
        has_shared_mount = False
        has_unshared_bind_mount = False

        # Check for mount point keys (mp0, mp1, mp2, etc.)
        for key in config.keys():
            if key.startswith('mp') and key[2:].isdigit():
                mp_config = config[key]

                # Bind mounts start with / (absolute paths on host)
                # Storage-backed mounts start with storage:volume format
                if isinstance(mp_config, str):
                    # Parse mount point: "source,mp=target,options" format
                    parts = mp_config.split(',')
                    source = parts[0] if parts else ""

                    # Check for shared=1 flag in options
                    is_shared = any('shared=1' in part for part in parts)

                    # Extract mount target path
                    mp_path = ""
                    for part in parts:
                        if part.startswith('mp='):
                            mp_path = part[3:]
                            break

                    is_bind = source.startswith('/')
                    mount_info = {
                        "key": key,
                        "config": mp_config,
                        "is_bind_mount": is_bind,
                        "source": source,
                        "mount_path": mp_path,
                        "is_shared": is_shared
                    }

                    mount_points.append(mount_info)

                    if is_bind:
                        has_bind_mount = True
                        if is_shared:
                            has_shared_mount = True
                        else:
                            has_unshared_bind_mount = True
                    else:
                        has_storage_mount = True

        return {
            "mount_points": mount_points,
            "has_mount_points": len(mount_points) > 0,
            "has_bind_mount": has_bind_mount,
            "has_storage_mount": has_storage_mount,
            "has_shared_mount": has_shared_mount,
            "has_unshared_bind_mount": has_unshared_bind_mount,
            "mount_count": len(mount_points)
        }

    DISK_PREFIXES = ('scsi', 'ide', 'virtio', 'sata', 'rootfs', 'mp')

    def detect_local_disks(self, config: Dict) -> Dict:
        """
        Detect passthrough disks in VM/CT configuration that prevent migration.

        Disk types that prevent migration:
        - Passthrough disks: /dev/disk/by-id/*, /dev/sd* (direct hardware access)

        Note: local-lvm, local-zfs, and other storage types CAN be migrated
        as Proxmox handles storage replication during migration.
        """
        passthrough_disks = []

        # Check for disk keys (scsi0-N, ide0-N, virtio0-N, sata0-N, rootfs, mp*)
        for key, disk_config in config.items():
            # Check if key is a disk/storage key
            if key.startswith(self.DISK_PREFIXES):
                if isinstance(disk_config, str):
                    # Parse disk config
                    parts = disk_config.split(',')
                    source = parts[0] if parts else ""

                    # Check for passthrough disks (direct device paths)
                    if source.startswith('/dev/'):
                        passthrough_disks.append({
                            "key": key,
                            "device": source,
                            "type": "passthrough"
                        })

        has_passthrough = bool(passthrough_disks)
        passthrough_count = len(passthrough_disks)
        return {
            "passthrough_disks": passthrough_disks,
            "has_passthrough": has_passthrough,
            "is_pinned": has_passthrough,
            "pinned_reason": "Hardware passthrough disks" if has_passthrough else None,
            "passthrough_count": passthrough_count,
            "total_pinned_disks": passthrough_count
        }

    @staticmethod
    def _extract_rrd_values(rrd_data, key, scale=100, filter_fn=None):
        """Extract and scale values from RRD data points."""
        if filter_fn:
            return [filter_fn(d) for d in rrd_data if filter_fn(d) is not None]
        return [d[key] * scale for d in rrd_data if key in d and d[key] is not None]

    @staticmethod
    def _detect_trend(values, threshold=10):
        """Detect trend from a list of values: 'rising', 'falling', or 'stable'."""
        if not values:
            return "stable"
        recent_size = max(1, len(values) // 5)
        recent_avg = sum(values[-recent_size:]) / recent_size
        older_avg = sum(values[:recent_size]) / recent_size
        diff = recent_avg - older_avg
        if diff > threshold:
            return "rising"
        elif diff < -threshold:
            return "falling"
        return "stable"

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
            mem_filter = lambda d: (d["memused"] / d["memtotal"] * 100) if "memused" in d and "memtotal" in d and d["memtotal"] > 0 else None
            cpu_values_day = self._extract_rrd_values(rrd_day, "cpu")
            mem_values_day = self._extract_rrd_values(rrd_day, None, filter_fn=mem_filter)
            iowait_values_day = self._extract_rrd_values(rrd_day, "iowait")
            load_values_day = self._extract_rrd_values(rrd_day, "loadavg", scale=1)

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
            mem_filter = lambda d: (d["memused"] / d["memtotal"] * 100) if "memused" in d and "memtotal" in d and d["memtotal"] > 0 else None
            cpu_values_week = self._extract_rrd_values(rrd_week, "cpu")
            mem_values_week = self._extract_rrd_values(rrd_week, None, filter_fn=mem_filter)
            iowait_values_week = self._extract_rrd_values(rrd_week, "iowait")

            if cpu_values_week:
                metrics["avg_cpu_week"] = sum(cpu_values_week) / len(cpu_values_week)
                metrics["max_cpu_week"] = max(cpu_values_week)
                metrics["cpu_trend"] = self._detect_trend(cpu_values_week)

            if mem_values_week:
                metrics["avg_mem_week"] = sum(mem_values_week) / len(mem_values_week)
                metrics["max_mem_week"] = max(mem_values_week)
                metrics["mem_trend"] = self._detect_trend(mem_values_week)

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
            if storage.get("enabled", 1):  # Only enabled storage
                total_gb = storage.get("total", 0) / (1024**3)
                used_gb = storage.get("used", 0) / (1024**3)
                avail_gb = storage.get("avail", 0) / (1024**3)
                usage_pct = (used_gb / total_gb * 100) if total_gb > 0 else 0

                storage_info.append({
                    "storage": storage.get("storage", "unknown"),
                    "type": storage.get("type", "unknown"),
                    "content": storage.get("content", ""),
                    "active": bool(storage.get("active", 0)),
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
        pool_membership = {
            str(member.get("vmid")): pool.get("poolid", "")
            for pool in resource_pools
            for member in pool.get("members", [])
            if member.get("vmid")
        }

        # Parse cluster health
        cluster_health = {
            "quorate": False,
            "nodes": 0,
            "online_nodes": 0
        }
        for item in cluster_status:
            if item.get("type") == "cluster":
                cluster_health["quorate"] = bool(item.get("quorate", 0))
                cluster_health["nodes"] = item.get("nodes", 0)
            elif item.get("type") == "node":
                if bool(item.get("online", 0)):
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

            # Get config for tags and mount points
            config = self.get_guest_config(node_name, vmid, guest_type_raw)
            tags_data = self.parse_tags(config.get("tags", ""))

            # Detect mount points for containers only
            mount_point_info = {}
            if guest_type == "CT":
                mount_point_info = self.detect_mount_points(config)

            # Detect local/passthrough disks for both VMs and CTs
            local_disk_info = self.detect_local_disks(config)

            # Get RRD data for I/O metrics - skip if guest is stopped and optimization enabled
            disk_read_bps = 0
            disk_write_bps = 0
            net_in_bps = 0
            net_out_bps = 0

            if not (self.skip_stopped_rrd and guest_status != "running"):
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

                    # Phase 3a: Summarize guest RRD for behavioral profiling
                    guest_rrd_summary = self._summarize_guest_rrd(rrd_data)
                    if guest_rrd_summary:
                        try:
                            from proxbalance.guest_profiles import update_guest_profile
                            update_guest_profile(str(vmid), guest_rrd_summary, node_name)
                        except Exception:
                            pass  # Graceful degradation

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
                "agent_info": agent_info if agent_info else None,
                "mount_points": mount_point_info,
                "local_disks": local_disk_info
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
        # Calculate committed (allocated) memory per node from guest maxmem values
        for node_name, node_data in self.nodes.items():
            committed_mem_gb = 0.0
            for vmid in node_data.get("guests", []):
                guest = self.guests.get(str(vmid), {})
                committed_mem_gb += guest.get("mem_max_gb", 0)
            node_data["committed_mem_gb"] = round(committed_mem_gb, 2)
            total_mem_gb = node_data.get("total_mem_gb", 1)
            node_data["mem_overcommit_ratio"] = round(
                committed_mem_gb / total_mem_gb, 2
            ) if total_mem_gb > 0 else 0.0

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


def _load_previous_node_statuses():
    """Load previous node statuses from cache for change detection."""
    try:
        if not os.path.exists(CACHE_FILE):
            return {}
        with open(CACHE_FILE, 'r') as f:
            old_data = json.load(f)
        return {
            name: node.get("status", "unknown")
            for name, node in old_data.get("nodes", {}).items()
        }
    except Exception:
        return {}


def _check_node_status_changes(config, old_statuses, new_data):
    """Detect node status changes and send notifications."""
    try:
        from notifications import send_notification
        new_nodes = new_data.get("nodes", {})
        for name, node in new_nodes.items():
            new_status = node.get("status", "unknown")
            old_status = old_statuses.get(name)
            if old_status is None:
                # New node discovered — no notification needed
                continue
            if old_status != new_status:
                if new_status != "online":
                    send_notification(config, "node_status", {
                        "node": name,
                        "status": "offline",
                        "previous_status": old_status,
                    })
                elif old_status != "online":
                    send_notification(config, "node_status", {
                        "node": name,
                        "status": "online",
                        "previous_status": old_status,
                    })
    except Exception as e:
        print(f"Warning: Failed to check node status changes: {e}", file=sys.stderr)


def _check_resource_thresholds(config, new_data):
    """Check if any node exceeds configured resource thresholds and notify."""
    try:
        from notifications import send_notification
        safety = config.get("automated_migrations", {}).get("safety_checks", {})
        cpu_threshold = safety.get("max_node_cpu_percent", 85)
        mem_threshold = safety.get("max_node_memory_percent", 90)

        for name, node in new_data.get("nodes", {}).items():
            cpu_pct = node.get("cpu_percent", 0)
            mem_pct = node.get("mem_percent", 0)
            # Use metrics values if top-level not available
            if not cpu_pct and "metrics" in node:
                cpu_pct = node["metrics"].get("current_cpu", 0)
            if not mem_pct and "metrics" in node:
                mem_pct = node["metrics"].get("current_mem", 0)

            if cpu_pct > cpu_threshold:
                send_notification(config, "resource_threshold", {
                    "node": name,
                    "resource": "CPU",
                    "value": cpu_pct,
                    "threshold": cpu_threshold,
                })
            if mem_pct > mem_threshold:
                send_notification(config, "resource_threshold", {
                    "node": name,
                    "resource": "Memory",
                    "value": mem_pct,
                    "threshold": mem_threshold,
                })
    except Exception as e:
        print(f"Warning: Failed to check resource thresholds: {e}", file=sys.stderr)


def collect_data():
    """Collect cluster data and save to cache"""
    try:
        print(f"[{datetime.utcnow()}] Starting cluster data collection...")
        config = load_config()

        print(f"[{datetime.utcnow()}] Using Proxmox host: {config['proxmox_host']}")
        print(f"[{datetime.utcnow()}] Authentication method: {config.get('proxmox_auth_method', 'api_token')}")

        # Capture previous node statuses before collecting new data
        old_statuses = _load_previous_node_statuses()

        collector = ProxmoxAPICollector(config)
        data = collector.analyze_cluster()

        # Preserve first_collected_at from existing cache
        try:
            if os.path.exists(CACHE_FILE):
                with open(CACHE_FILE, 'r') as f:
                    existing = json.load(f)
                if existing.get('first_collected_at'):
                    data['first_collected_at'] = existing['first_collected_at']
        except Exception:
            pass
        if 'first_collected_at' not in data:
            data['first_collected_at'] = data['collected_at']

        # Write to cache file atomically
        temp_file = CACHE_FILE + '.tmp'
        with open(temp_file, 'w') as f:
            json.dump(data, f, indent=2)

        # Atomic rename
        os.rename(temp_file, CACHE_FILE)

        print(f"[{datetime.utcnow()}] Data collection complete. Cache updated.")
        print(f"[{datetime.utcnow()}] Collected data for {data['summary']['total_nodes']} nodes and {data['summary']['total_guests']} guests")

        # --- Persistent Metrics Store (trend-based migration data) ---
        try:
            from proxbalance.metrics_store import append_node_sample, append_guest_sample, compress_old_samples

            for node_name, node_data in data.get("nodes", {}).items():
                if node_data.get("status") != "online":
                    continue
                metrics = node_data.get("metrics", {})
                storage_list = node_data.get("storage", [])
                avg_storage = 0.0
                if storage_list:
                    usage_vals = [s.get("usage_pct", 0) for s in storage_list if s.get("usage_pct") is not None]
                    avg_storage = sum(usage_vals) / len(usage_vals) if usage_vals else 0.0

                append_node_sample(node_name, {
                    "cpu": metrics.get("current_cpu", node_data.get("cpu_percent", 0)),
                    "memory": metrics.get("current_mem", node_data.get("mem_percent", 0)),
                    "iowait": metrics.get("current_iowait", 0),
                    "load_avg": metrics.get("avg_load", 0),
                    "guest_count": len(node_data.get("guests", [])),
                    "storage_usage_pct": round(avg_storage, 2),
                })

            for vmid_str, guest_data in data.get("guests", {}).items():
                if guest_data.get("status") != "running":
                    continue
                append_guest_sample(vmid_str, {
                    "cpu": guest_data.get("cpu_current", 0),
                    "memory": round(guest_data.get("mem_used_gb", 0) / max(guest_data.get("mem_max_gb", 1), 0.01) * 100, 2),
                    "disk_read_bps": guest_data.get("disk_read_bps", 0),
                    "disk_write_bps": guest_data.get("disk_write_bps", 0),
                    "net_in_bps": guest_data.get("net_in_bps", 0),
                    "net_out_bps": guest_data.get("net_out_bps", 0),
                    "node": guest_data.get("node", ""),
                })

            comp_summary = compress_old_samples()
            if comp_summary.get("nodes_compressed", 0) > 0 or comp_summary.get("guests_compressed", 0) > 0:
                print(f"[{datetime.utcnow()}] Metrics store compressed: {comp_summary}")
        except Exception as e:
            print(f"Warning: Failed to update metrics store: {e}", file=sys.stderr)

        # --- Notifications ---
        # Node status changes
        _check_node_status_changes(config, old_statuses, data)

        # Resource threshold breaches
        _check_resource_thresholds(config, data)

        # Collector success notification (off by default — on_collector_status is False)
        try:
            from notifications import send_notification
            perf = data.get("performance", {})
            send_notification(config, "collector_status", {
                "status": "success",
                "node_count": data["summary"]["total_nodes"],
                "guest_count": data["summary"]["total_guests"],
                "duration": perf.get("total_time", 0),
            })
        except Exception:
            pass

        return True

    except (FileNotFoundError, ValueError) as e:
        print(f"\n{'='*70}", file=sys.stderr)
        print(f"CONFIGURATION ERROR", file=sys.stderr)
        print(f"{'='*70}", file=sys.stderr)
        print(f"\n{str(e)}\n", file=sys.stderr)

        # Send collector failure notification
        try:
            _cfg = load_config() if 'config' not in dir() else config
            from notifications import send_notification
            send_notification(_cfg, "collector_status", {
                "status": "failure",
                "error": str(e),
            })
        except Exception:
            pass

        return False

    except Exception as e:
        print(f"\n{'='*70}", file=sys.stderr)
        print(f"RUNTIME ERROR", file=sys.stderr)
        print(f"{'='*70}", file=sys.stderr)
        print(f"\n{str(e)}\n", file=sys.stderr)
        import traceback
        traceback.print_exc()
        print(f"\n{'='*70}\n", file=sys.stderr)

        # Send collector failure notification
        try:
            _cfg = load_config() if 'config' not in dir() else config
            from notifications import send_notification
            send_notification(_cfg, "collector_status", {
                "status": "failure",
                "error": str(e),
            })
        except Exception:
            pass

        return False


if __name__ == '__main__':
    success = collect_data()
    sys.exit(0 if success else 1)
