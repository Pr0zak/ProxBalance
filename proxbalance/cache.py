"""
In-memory cache with TTL for cluster data.
Reads from the JSON cache file on disk and keeps results in memory
to avoid repeated disk I/O within the TTL window.
"""

import json
import os
import sys
import time
import threading
from typing import Dict, Optional


class CacheManager:
    """In-memory cache with TTL for cluster data"""

    def __init__(self, cache_file: str, ttl_seconds: int = 60):
        self.cache_file = cache_file
        self.ttl_seconds = ttl_seconds
        self._cache = None
        self._cached_at = None
        self._lock = threading.Lock()

    def get(self) -> Optional[Dict]:
        """Get cached data or read from disk if expired"""
        with self._lock:
            now = time.time()

            # Return cached data if still valid
            if self._cache is not None and self._cached_at is not None:
                age = now - self._cached_at
                if age < self.ttl_seconds:
                    return self._cache

            # Cache expired or doesn't exist - read from disk
            try:
                if not os.path.exists(self.cache_file):
                    return None

                with open(self.cache_file, 'r') as f:
                    self._cache = json.load(f)
                    self._cached_at = now
                    return self._cache
            except Exception as e:
                print(f"Error reading cache: {str(e)}", file=sys.stderr)
                return None

    def invalidate(self):
        """Force cache refresh on next request"""
        with self._lock:
            self._cache = None
            self._cached_at = None
