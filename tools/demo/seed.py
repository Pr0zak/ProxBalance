"""
Write past history for the demo cluster into a fresh ProxBalance database.

Run from the ProxBalance directory with its venv, after ``scenario.py init``
and before the first collection::

    venv/bin/python tools/demo/seed.py

It fills, from the same load model the fake API uses: node and guest metric
history (90 days), score history (30 days), past migrations with their
outcomes, automation runs (3 days), the change log, alerts and a silence.
Everything it writes is made up.
"""

import json
import os
import sys
import uuid
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
sys.path.insert(0, APP)

import scenario as sc  # noqa: E402
from proxbalance.db import get_connection, init_db  # noqa: E402

STEP = 1800  # 30-minute model series


def iso(ts: float) -> str:
    return datetime.fromtimestamp(ts, timezone.utc).isoformat()


def iso_z(ts: float) -> str:
    return datetime.fromtimestamp(ts, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def build_series(state, now, days):
    """30-minute node series: {node: [(ts, cpu%, mem%, iowait%, psi_io, load, guests)]}."""
    out = {}
    start = now - days * sc.DAY
    for node in sc.NODES:
        members = sc.node_members(state, node)
        rows = []
        t = start
        while t <= now:
            s = sc.node_sample(state, node, t, members)
            count = sum(1 for v in members if sc.node_of(state, v, t) == node)
            rows.append((t, s["cpu"] * 100, s["mem"] / s["maxmem"] * 100, s["iowait"] * 100,
                         s["psi_io"], s["loadavg"], count))
            t += STEP
        out[node] = rows
    return out


def at(series, node, ts):
    """Series row nearest to ``ts``."""
    rows = series[node]
    i = int(round((ts - rows[0][0]) / STEP))
    return rows[max(0, min(i, len(rows) - 1))]


def avg(series, node, ts, hours, col):
    rows = series[node]
    i = int(round((ts - rows[0][0]) / STEP))
    lo = max(0, i - int(hours * 3600 / STEP))
    vals = [r[col] for r in rows[lo:i + 1]]
    return sum(vals) / len(vals) if vals else 0


def seed_metrics(conn, state, now):
    """Raw node samples every 30 min for 90 days (5 min for the last 2 days)."""
    nodes = []
    for node in sc.NODES:
        members = sc.node_members(state, node)
        storage = sum(u for _, _, _, u in sc.NODES[node]["local"]) / len(sc.NODES[node]["local"]) * 100
        t = now - 90 * sc.DAY
        while t < now - 60:
            step = 300 if t > now - 2 * sc.DAY else STEP
            s = sc.node_sample(state, node, t, members)
            count = sum(1 for v in members if sc.node_of(state, v, t) == node)
            nodes.append((node, t, round(s["cpu"] * 100, 2), round(s["mem"] / s["maxmem"] * 100, 2),
                          round(s["iowait"] * 100, 2), round(s["loadavg"], 2), count, round(storage, 2),
                          round(s["psi_io"], 2)))
            t += step
    conn.executemany(
        "INSERT INTO node_metrics (node_name, ts, cpu, memory, iowait, load_avg, guest_count, storage_usage_pct, io_pressure) "
        "VALUES (?,?,?,?,?,?,?,?,?)", nodes)
    guests = []
    for vmid, g in sc.GUESTS.items():
        if state["guests"][str(vmid)]["status"] != "running":
            continue
        t = now - 30 * sc.DAY
        while t < now - 60:
            cpu = sc.guest_cpu(vmid, t)
            io = sc.guest_io(vmid, t)
            guests.append((str(vmid), t, sc.node_of(state, vmid, t), round(cpu * 100, 2),
                           round(sc.guest_mem(vmid, t, now) * 100, 2),
                           round((2e5 + io * 4e8) * (0.5 + cpu), 1), round((1e5 + io * 2e8) * (0.5 + cpu), 1),
                           round(5e4 + cpu * 3e6, 1), round(4e4 + cpu * 2e6, 1)))
            t += STEP if t < now - 2 * sc.DAY else 600
    conn.executemany(
        "INSERT INTO guest_metrics (vmid, ts, node, cpu, memory, disk_read_bps, disk_write_bps, net_in_bps, net_out_bps) "
        "VALUES (?,?,?,?,?,?,?,?,?)", guests)
    conn.commit()
    print(f"metrics: {len(nodes)} node rows, {len(guests)} guest rows")


def seed_profiles(conn, state, now):
    rows = []
    for vmid, g in sc.GUESTS.items():
        if state["guests"][str(vmid)]["status"] != "running":
            continue
        for k in range(56):
            t = now - k * 6 * 3600
            cpus = [sc.guest_cpu(vmid, t - i * 300) * 100 for i in range(12)]
            mems = [sc.guest_mem(vmid, t - i * 300, now) * 100 for i in range(12)]

            def stats(v):
                s = sorted(v)
                return json.dumps({"min": round(s[0], 1), "max": round(s[-1], 1), "avg": round(sum(s) / len(s), 1),
                                   "p95": round(s[int(len(s) * 0.95) - 1], 1), "samples": 60})
            rows.append((str(vmid), sc.node_of(state, vmid, t), iso(t), stats(cpus), stats(mems)))
    conn.executemany("INSERT INTO guest_profiles (vmid, node, timestamp, cpu_json, mem_json) VALUES (?,?,?,?,?)", rows)
    conn.commit()
    print(f"profiles: {len(rows)}")


def seed_scores(conn, series, now):
    try:
        from proxbalance.scoring import calculate_node_health_score
    except Exception:  # noqa: BLE001
        calculate_node_health_score = None
    rows = []
    t = now - 30 * sc.DAY
    while t < now - 60:
        snap, scores = {}, []
        for node in sc.NODES:
            r = at(series, node, t)
            metrics = {
                "current_cpu": r[1], "current_mem": r[2], "current_iowait": r[3],
                "recent_cpu": r[1], "recent_iowait": r[3],
                "avg_cpu": avg(series, node, t, 24, 1), "max_cpu": r[1], "avg_mem": avg(series, node, t, 24, 2),
                "avg_iowait": avg(series, node, t, 24, 3), "avg_load": r[5],
                "avg_cpu_week": avg(series, node, t, 168, 1), "avg_mem_week": avg(series, node, t, 168, 2),
                "avg_iowait_week": avg(series, node, t, 168, 3), "has_historical": True,
            }
            node_d = {"name": node, "status": "online", "cpu_cores": sc.NODES[node]["cores"],
                      "total_mem_gb": sc.NODES[node]["mem_gb"], "metrics": metrics, "storage": []}
            score = None
            if calculate_node_health_score:
                try:
                    score = calculate_node_health_score(node_d, metrics)
                except Exception:  # noqa: BLE001
                    score = None
            if score is None:
                score = max(0.0, (r[1] - 30) * 0.8) + max(0.0, (r[2] - 50) * 0.9) + r[3] * 0.6
            snap[node] = {"score": round(score, 2), "suitability": round(max(0, 100 - min(score, 100)), 1),
                          "cpu": round(r[1], 1), "mem": round(r[2], 1)}
            scores.append(score)
        health = round(max(0, 100 - sum(scores) / len(scores)), 1)
        rows.append((iso(t), json.dumps(snap), health, 2 if snap["draco"]["cpu"] > 60 else 0))
        t += STEP
    conn.executemany("INSERT INTO score_history (timestamp, nodes_json, cluster_health, recommendation_count) VALUES (?,?,?,?)", rows)
    conn.commit()
    print(f"score history: {len(rows)}")


REASON = {
    "cpu": "{name} should move to {dst} because {src} has elevated CPU usage ({scpu:.0f}% CPU, {smem:.0f}% mem), while {dst} has more capacity ({tcpu:.0f}% CPU, {tmem:.0f}% mem).",
    "mem": "{name} should move to {dst} because {src} is running low on memory ({smem:.0f}% used), while {dst} has more room ({tmem:.0f}% used).",
    "rule": "{name} should move to {dst} because {src} also runs another exclude_dns guest (anti-affinity rule).",
    "manual": "Moved by hand from the dashboard.",
}


def seed_moves(conn, state, series, now):
    """Migration history, outcomes, change-log entries and automation runs for past moves."""
    hist, outcomes, audit, runs = [], [], [], []
    for days, vmid, src, dst, why in sc.PAST_MOVES:
        g = sc.GUESTS[vmid]
        ts = now - days * sc.DAY
        start = ts - 60
        dur = round(20 + g["mem"] * 4.5)
        pre_s, pre_t = at(series, src, start - STEP), at(series, dst, start - STEP)
        name = g["name"]
        reason = REASON[why].format(name=name, src=src, dst=dst, scpu=pre_s[1], smem=pre_s[2], tcpu=pre_t[1], tmem=pre_t[2])
        mid = str(uuid.uuid5(uuid.NAMESPACE_URL, f"pb-demo/{vmid}/{days}"))
        kind = "qemu" if g["t"] == "qemu" else "lxc"
        upid = f"UPID:{src}:0001A2B3:00C0FFEE:{int(start):08X}:{'qmigrate' if kind == 'qemu' else 'vzmigrate'}:{vmid}:proxbalance@pam!demo:"
        manual = why == "manual"
        conf = round(78 + 18 * sc._h("conf", vmid), 1)
        extra = {"name": name, "confidence_score": conf, "initiated_by": "manual" if manual else "automated",
                 "reasoning": {"score_improvement": round(20 + 60 * sc._h("si", vmid), 2), "confidence_score": conf,
                               "cost_benefit": round(100 + 30 * sc._h("cb", vmid), 2), "risk_score": round(5 + 10 * sc._h("rk", vmid), 1),
                               "has_conflict": False}}
        hist.append((mid, vmid, name, "VM" if kind == "qemu" else "CT", src, dst, iso(ts), "completed", upid, reason,
                     None, 0, None, None, float(dur), None, json.dumps(extra)))
        audit.append((iso_z(ts), "user" if manual else "automation", "migration.done", str(vmid),
                      f"Moved {vmid} ({name}) {src} → {dst}",
                      json.dumps({"vmid": vmid, "source_node": src, "target_node": dst, "status": "completed",
                                  "duration_seconds": dur, "reason": reason, "task_id": upid}),
                      "192.168.1.50" if manual else None, f"migration:{mid}"))
        if not manual:
            runs.append((ts, "success", [{
                "vmid": vmid, "name": name, "type": "VM" if kind == "qemu" else "CT", "source_node": src, "target_node": dst,
                "action": "executed", "status": "completed", "reason": reason, "confidence_score": conf,
                "priority_rank": 1, "total_candidates": 3}]))

        def snap(t, el=None):
            s, d = at(series, src, t), at(series, dst, t)
            out = {"timestamp": iso_z(t),
                   "source_node": {"cpu": round(s[1], 2), "mem": round(s[2], 2), "iowait": round(s[3], 2), "guest_count": s[6]},
                   "target_node": {"cpu": round(d[1], 2), "mem": round(d[2], 2), "iowait": round(d[3], 2), "guest_count": d[6]}}
            if el is not None:
                out.update({"elapsed_seconds": el, "late": False})
            return out
        pre = snap(start - STEP)
        p5, p1, p24 = snap(ts + 600, 600), snap(ts + 3600, 3600), snap(ts + 86400 - STEP, 86400)
        if days < 1:
            continue
        d5 = round(pre["source_node"]["cpu"] - p5["source_node"]["cpu"], 2)
        d24 = round(pre["source_node"]["cpu"] - p24["source_node"]["cpu"], 2)
        verdict = "beneficial" if d24 >= 5 else ("harmful" if d24 <= -5 else "neutral")
        outcomes.append((f"{vmid}_{iso_z(start)}", str(vmid), src, dst, "VM" if kind == "qemu" else "CT", "completed",
                         json.dumps(pre), json.dumps(p5), json.dumps(p1), json.dumps(p24),
                         extra["reasoning"]["score_improvement"],
                         json.dumps({"source_cpu_delta": d5, "source_mem_delta": round(pre["source_node"]["mem"] - p5["source_node"]["mem"], 2)}),
                         json.dumps({"source_cpu_delta": d24, "source_mem_delta": round(pre["source_node"]["mem"] - p24["source_node"]["mem"], 2)}),
                         round(50 + 40 * sc._h("acc", vmid), 1), verdict,
                         json.dumps({"source_cpu_direction": "falling" if d24 > 0 else "rising"}), json.dumps(p5)))

    # One failed move, retried successfully later (shows in history and the change log).
    tf = now - 4.6 * sc.DAY
    mid = str(uuid.uuid5(uuid.NAMESPACE_URL, "pb-demo/fail"))
    err = "migration aborted: target storage local-lvm on vega has 3.1 GB free, needs 30 GB"
    hist.append((mid, 203, "photoprism", "CT", "draco", "vega", iso(tf), "failed", None, "photoprism should move to vega because draco has elevated CPU usage.",
                 None, 0, None, None, 14.0, err, json.dumps({"name": "photoprism", "initiated_by": "automated"})))
    audit.append((iso_z(tf), "automation", "migration.failed", "203", "Move of 203 (photoprism) draco → vega failed",
                  json.dumps({"vmid": 203, "error": err}), None, f"migration:{mid}"))
    runs.append((tf, "failed", [{"vmid": 203, "name": "photoprism", "type": "CT", "source_node": "draco", "target_node": "vega",
                                 "action": "failed", "error": err, "reason": "draco has elevated CPU usage"}]))

    conn.executemany(
        "INSERT INTO migration_history (migration_id, vmid, guest_name, guest_type, source_node, target_node, timestamp, status, task_id, "
        "reason, confidence, dry_run, trigger, run_id, duration_seconds, error_message, extra_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", hist)
    conn.executemany(
        "INSERT INTO migration_outcomes (key, vmid, source_node, target_node, guest_type, status, pre_migration_json, post_5min_json, "
        "post_1h_json, post_24h_json, predicted_improvement, actual_improvement_json, sustained_improvement_json, accuracy_pct, verdict, "
        "trend_evidence_json, post_migration_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", outcomes)
    conn.executemany("INSERT INTO audit_log (ts, source, action, subject, summary, details_json, actor, ref) VALUES (?,?,?,?,?,?,?,?)", audit)
    conn.commit()
    print(f"moves: {len(hist)} history, {len(outcomes)} outcomes ({', '.join(o[14] for o in outcomes)})")
    return runs


def seed_runs(conn, now, move_runs):
    """Automation runs every 15 minutes over the last 3 days."""
    rows = []
    special = {int(ts // 900): (status, decisions) for ts, status, decisions in move_runs}
    t = (now - 3 * sc.DAY) // 900 * 900
    while t < now - 900:
        local = sc._local_hour(t)
        slot = int(t // 900)
        window = f"In migration window: Any time (America/Chicago time: {int(local):02d}:{int(t % 3600 // 60):02d})"
        summary = {"timestamp": iso(t + 3), "migrations_executed": 0, "migrations_successful": 0,
                   "duration_seconds": 4, "mode": "live", "decisions": [],
                   "safety_checks": {"migration_window": window, "cluster_health": "Cluster safety checks passed",
                                     "running_migrations": 0, "target_inflow_cap": 0}}
        if slot in special:
            status, decisions = special[slot]
            summary["decisions"] = decisions
            if status == "success":
                summary["migrations_executed"] = summary["migrations_successful"] = len(decisions)
        elif 1 <= local < 3:
            status = "skipped"
            summary["safety_checks"]["migration_window"] = "In blackout: Nightly backups (01:00-03:00)"
        elif t > now - 5 * 3600 and 13 <= local <= 18:
            status = "no_action"
            summary["decisions"] = [{"vmid": 122, "name": "build-agent-1", "type": "VM", "source_node": "draco",
                                     "target_node": "cygnus", "action": "observing", "observations": 2, "required_observations": 3,
                                     "reason": "Seen on 2 of 3 checks"}]
        elif 14 <= local <= 17 and sc._h("held", slot) > 0.7:
            status = "no_action"
            summary["decisions"] = [{"vmid": 121, "name": "gitlab-runner-1", "type": "CT", "source_node": "draco",
                                     "target_node": "orion", "action": "filtered",
                                     "reason": "Required group affinity_req_gitlab would be split"}]
        else:
            status = "no_action"
        summary["status"] = status
        rows.append((None, iso(t + 3), status, json.dumps(summary)))
        t += 900
    conn.executemany("INSERT INTO automation_run_history (run_id, timestamp, status, summary_json) VALUES (?,?,?,?)", rows)
    last = json.loads(rows[-1][3])
    conn.execute("INSERT OR REPLACE INTO automation_state (key, value) VALUES ('last_run', ?)", (json.dumps(last),))
    conn.commit()
    print(f"runs: {len(rows)}")


def seed_audit_extra(conn, now):
    def at_days(d):
        return iso_z(now - d * sc.DAY)
    rows = [
        (at_days(20), "user", "config.save", "automated_migrations", "Changed settings: automation on",
         {"keys": ["automated_migrations.enabled"]}, "192.168.1.50"),
        (at_days(18.5), "user", "tag.add", "102", "Added tag exclude_web to 102 (web-02)", {"tag": "exclude_web"}, "192.168.1.50"),
        (at_days(14.1), "user", "maintenance.on", "cygnus", "cygnus entered maintenance", {}, "192.168.1.50"),
        (at_days(13.9), "user", "maintenance.off", "cygnus", "cygnus left maintenance", {}, "192.168.1.50"),
        (at_days(7.0), "system", "update.done", "v2.19.0", "Updated v2.18.0 → v2.19.0", {"from": "v2.18.0", "to": "v2.19.0"}, None),
        (at_days(6.95), "user", "config.save", "automated_migrations.mode", "Changed settings: mode → semi-automatic",
         {"keys": ["automated_migrations.mode"]}, "192.168.1.50"),
        (at_days(3.1), "user", "silence.add", "resource_threshold:vega/cpu", "Silenced vega CPU alerts for 24 h", {}, "192.168.1.50"),
        (at_days(2.0), "user", "automation.run_now", None, "Ran automation now", {}, "192.168.1.50"),
        (at_days(1.0), "system", "update.done", "v2.20.0", "Updated v2.19.0 → v2.20.0", {"from": "v2.19.0", "to": "v2.20.0"}, None),
        (at_days(0.9), "user", "approval.dismiss", "145", "Dismissed queued move of 145 (k8s-worker-3) draco → orion", {}, "192.168.1.50"),
    ]
    conn.executemany("INSERT INTO audit_log (ts, source, action, subject, summary, details_json, actor, ref) VALUES (?,?,?,?,?,?,?,NULL)",
                     [(a, b, c, d, e, json.dumps(f), g) for a, b, c, d, e, f, g in rows])
    conn.commit()


def seed_alerts(conn, now):
    def ts(h):
        return iso(now - h * 3600)
    rows = [
        ("resource_threshold:draco/cpu", "resource_threshold", "draco/cpu", "active", "draco CPU 88.4%", 88.4, 85, ts(3.2), ts(0.1), ts(3.2), None),
        ("resource_threshold:lyra/memory", "resource_threshold", "lyra/memory", "active", "lyra Memory 90.6%", 90.6, 90, ts(26), ts(0.1), ts(26), None),
        ("resource_threshold:vega/cpu", "resource_threshold", "vega/cpu", "resolved", "vega CPU 86.0%", 86.0, 85, ts(75), ts(70), ts(75), ts(70)),
    ]
    conn.executemany(
        "INSERT OR REPLACE INTO alert_state (fingerprint, alert_type, subject, status, label, value, threshold, first_seen, last_seen, "
        "notified_at, resolved_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)", rows)
    conn.execute("INSERT INTO alert_silences (fingerprint, alert_type, created_at, expires_at, until_resolved) VALUES (?,?,?,?,1)",
                 ("resource_threshold:lyra/memory", "resource_threshold", ts(20), None))
    conn.commit()


def main():
    init_db()
    conn = get_connection()
    for table in ("node_metrics", "guest_metrics", "guest_profiles", "score_history", "migration_history", "migration_outcomes",
                  "automation_run_history", "audit_log", "alert_state", "alert_silences", "approval_queue", "recommendation_tracking"):
        conn.execute(f"DELETE FROM {table}")
    conn.commit()
    state = sc.load_state()
    now = datetime.now(timezone.utc).timestamp()
    series = build_series(state, now, 40)
    seed_metrics(conn, state, now)
    seed_profiles(conn, state, now)
    seed_scores(conn, series, now)
    runs = seed_moves(conn, state, series, now)
    seed_runs(conn, now, runs)
    seed_audit_extra(conn, now)
    seed_alerts(conn, now)
    try:
        from proxbalance.metrics_store import compress_old_samples
        print("compress:", compress_old_samples())
    except Exception as e:  # noqa: BLE001
        print("compress skipped:", e)


if __name__ == "__main__":
    main()
