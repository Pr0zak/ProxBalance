"""Right-sizing hints: rule boundaries, vetoes, history gates and the route."""

import time

import pytest
from flask import Flask

from proxbalance import db
from proxbalance.rightsizing import assess_guest, build_report, rightsizing_hints

NOW = 1_800_000_000.0
DAY = 86400.0
STEP = 3600.0  # one sample per hour keeps the fixtures small


def _runs(days=7.0, step=STEP):
    """Reference-node rows: one per collector run across the window."""
    n = int(days * DAY / step)
    return [{"ts": NOW - days * DAY + i * step + 1} for i in range(n)]


def _samples(cpu=5.0, mem=10.0, days=7.0, running=1.0, step=STEP, cpu_peaks=None):
    """Raw guest samples: ``running`` share of the runs, spread over ``days``."""
    n = int(days * DAY / step)
    out = []
    for i in range(n):
        # Evenly spread: keep sample i when the running total ticks over.
        if int((i + 1) * running + 1e-9) == int(i * running + 1e-9):
            continue
        out.append({"ts": NOW - days * DAY + i * step + 1, "cpu": cpu, "memory": mem})
    if cpu_peaks is not None:
        # Top 10% of samples at the peak value: drives p95 but barely moves the mean.
        for s in out[: max(1, len(out) // 10)]:
            s["cpu"] = cpu_peaks
    return out


def _ct(cores=4, mem_gb=8.0, **kw):
    return {"vmid": 101, "name": "ct", "node": "pve3", "type": "CT", "cpu_cores": cores, "mem_max_gb": mem_gb, **kw}


def _vm(agent, cores=4, mem_gb=8.0):
    return {"vmid": 201, "name": "vm", "node": "pve5", "type": "VM", "cpu_cores": cores,
            "mem_max_gb": mem_gb, "agent_running": agent}


def _kinds(hints):
    return [h["kind"] for h in hints]


# --- Idle CPU -------------------------------------------------------------

def test_idle_cpu_suggests_forty_percent_rounded_up():
    hints = rightsizing_hints(_ct(cores=4), _samples(cpu=3.0, mem=50.0), NOW, _runs())
    assert hints == [{"kind": "cpu", "current": 4, "suggested": 2, "avg_pct": 3.0, "p95_pct": 3.0,
                      "vcpus_freed": 2, "gb_freed": 0.0}]


def test_cpu_average_boundary_at_ten_percent():
    assert _kinds(rightsizing_hints(_ct(), _samples(cpu=9.9, mem=50), NOW, _runs())) == ["cpu"]
    assert rightsizing_hints(_ct(), _samples(cpu=10.0, mem=50), NOW, _runs()) == []


def test_p95_veto_above_sixty_percent():
    # Mean stays under 10% but the peaks put p95 above 60%.
    s = _samples(cpu=1.0, mem=50, cpu_peaks=61.0)
    a = assess_guest(_ct(cores=8), s, NOW, _runs())
    assert a["stats"]["cpu_avg_pct"] < 10
    assert a["stats"]["cpu_p95_pct"] > 60
    assert a["hints"] == []


def test_p95_at_sixty_is_allowed_and_suggestion_fits_the_peak():
    s = _samples(cpu=1.0, mem=50, cpu_peaks=60.0)
    a = assess_guest(_ct(cores=10), s, NOW, _runs())
    assert a["stats"]["cpu_p95_pct"] == 60.0
    # ceil(10 * 0.4) = 4, but p95 is 6 cores' worth, so it suggests 6.
    assert a["hints"][0]["suggested"] == 6


def test_never_below_one_vcpu_and_only_when_lower():
    assert _kinds(rightsizing_hints(_ct(cores=2), _samples(cpu=0.5, mem=50), NOW, _runs())) == ["cpu"]
    assert rightsizing_hints(_ct(cores=2), _samples(cpu=0.5, mem=50), NOW, _runs())[0]["suggested"] == 1
    # One vCPU: ceil(0.4) = 1 is not lower, so nothing.
    assert rightsizing_hints(_ct(cores=1), _samples(cpu=0.5, mem=50), NOW, _runs()) == []


def test_cpu_needs_more_than_half_the_window_running():
    # 40% running: not mostly stopped, but too little to judge CPU.
    hints = rightsizing_hints(_ct(), _samples(cpu=1.0, mem=50, running=0.4), NOW, _runs())
    assert hints == []
    hints = rightsizing_hints(_ct(), _samples(cpu=1.0, mem=50, running=0.6), NOW, _runs())
    assert _kinds(hints) == ["cpu"]


# --- Oversized memory -------------------------------------------------------

def test_memory_rounds_p95_plus_headroom_up_to_512mb():
    # 8 GB, 20% used = 1.6 GB; x1.3 = 2.08 GB = 2129.9 MB -> 2560 MB.
    hints = rightsizing_hints(_ct(cores=1), _samples(cpu=50, mem=20.0), NOW, _runs())
    assert len(hints) == 1
    h = hints[0]
    assert h["kind"] == "memory"
    assert h["suggested_mb"] == 2560
    assert h["suggested_gb"] == 2.5
    assert h["avg_gb"] == 1.6 and h["p95_gb"] == 1.6
    assert h["gb_freed"] == 5.5


def test_memory_never_below_512mb():
    h = rightsizing_hints(_ct(cores=1, mem_gb=2.0), _samples(cpu=50, mem=1.0), NOW, _runs())[0]
    assert h["suggested_mb"] == 512


def test_memory_boundary_at_thirty_percent():
    assert _kinds(rightsizing_hints(_ct(cores=1), _samples(cpu=50, mem=29.9), NOW, _runs())) == ["memory"]
    assert rightsizing_hints(_ct(cores=1), _samples(cpu=50, mem=30.0), NOW, _runs()) == []


def test_memory_no_hint_when_rounding_reaches_the_allocation():
    # 1 GB at 29%: 0.29 x 1.3 = 0.377 GB -> 512 MB, which is lower: hint.
    assert _kinds(rightsizing_hints(_ct(cores=1, mem_gb=1.0), _samples(cpu=50, mem=29), NOW, _runs())) == ["memory"]
    # 0.5 GB allocation: 512 MB is not lower: nothing.
    assert rightsizing_hints(_ct(cores=1, mem_gb=0.5), _samples(cpu=50, mem=10), NOW, _runs()) == []


def test_vm_without_agent_memory_is_skipped():
    a = assess_guest(_vm(agent=False, cores=1), _samples(cpu=50, mem=10), NOW, _runs())
    assert a["hints"] == []
    assert a["stats"]["mem_skipped"] == "no_guest_memory_data"


def test_vm_with_agent_but_full_reading_is_skipped():
    a = assess_guest(_vm(agent=True, cores=1), _samples(cpu=50, mem=99), NOW, _runs())
    assert a["hints"] == []


def test_vm_with_agent_gets_a_memory_hint():
    assert _kinds(rightsizing_hints(_vm(agent=True, cores=1), _samples(cpu=50, mem=10), NOW, _runs())) == ["memory"]


# --- Combined / first match -------------------------------------------------

def test_cpu_and_memory_are_independent():
    hints = rightsizing_hints(_ct(cores=4, mem_gb=8), _samples(cpu=2, mem=10), NOW, _runs())
    assert _kinds(hints) == ["cpu", "memory"]


def test_mostly_stopped_wins_for_both_resources():
    hints = rightsizing_hints(_ct(cores=4, mem_gb=8), _samples(cpu=2, mem=10, running=0.2), NOW, _runs())
    assert _kinds(hints) == ["stopped"]
    assert hints[0]["running_pct"] == pytest.approx(20, abs=1)


def test_mostly_stopped_boundary_at_thirty_percent():
    assert _kinds(rightsizing_hints(_ct(cores=1, mem_gb=1), _samples(cpu=50, mem=50, running=0.25), NOW, _runs())) == ["stopped"]
    assert rightsizing_hints(_ct(cores=1, mem_gb=1), _samples(cpu=50, mem=50, running=0.34), NOW, _runs()) == []


# --- History gates ---------------------------------------------------------

def test_under_three_days_of_history_gives_no_hint():
    a = assess_guest(_ct(), _samples(cpu=1, mem=5, days=2.9), NOW, _runs())
    assert a["status"] == "not_enough_history"
    assert a["hints"] == []
    a = assess_guest(_ct(), _samples(cpu=1, mem=5, days=3.1), NOW, _runs())
    assert a["status"] == "ok" and a["hints"]


def test_new_guest_running_is_measured_from_its_first_sample():
    # Created 4 days ago and always on since: running ~100%, not 4/7.
    a = assess_guest(_ct(), _samples(cpu=1, mem=50, days=4), NOW, _runs())
    assert a["running_pct"] > 95


def test_no_data_means_no_hint():
    a = assess_guest(_ct(), [], NOW, _runs())
    assert a["status"] == "no_data" and a["hints"] == []


def test_templates_are_skipped():
    a = assess_guest(_ct(template=1), _samples(cpu=1, mem=5), NOW, _runs())
    assert a["status"] == "template" and a["hints"] == []


def test_aggregated_rows_count_their_samples_and_use_their_p95():
    rows = [{"ts": NOW - 6 * DAY + i * 6 * 3600, "ts_start": NOW - 6 * DAY + i * 6 * 3600 - 3 * 3600,
             "ts_end": NOW - 6 * DAY + i * 6 * 3600 + 3 * 3600, "aggregated": True, "sample_count": 6,
             "cpu": {"avg": 2.0, "p95": 70.0 if i == 0 else 4.0, "min": 0, "max": 80},
             "memory": {"avg": 10.0, "p95": 12.0, "min": 9, "max": 13}} for i in range(24)]
    a = assess_guest(_ct(cores=4, mem_gb=8), rows, NOW, _runs())
    assert a["running_pct"] > 80
    assert a["stats"]["cpu_avg_pct"] == 2.0
    # One aggregate of 24 with p95 70 is under 5% of the weight: p95 stays 4.
    assert a["stats"]["cpu_p95_pct"] == 4.0
    assert _kinds(a["hints"]) == ["cpu", "memory"]


def test_cadence_estimated_without_reference_runs():
    a = assess_guest(_ct(), _samples(cpu=1, mem=50), NOW, None)
    assert a["running_pct"] > 95


# --- Report + route --------------------------------------------------------

def test_report_ranks_by_savings_and_totals():
    guests = {
        "1": _ct(cores=2, mem_gb=1, name="small"),
        "2": {**_ct(cores=8, mem_gb=16, name="big"), "tags": {"has_ignore": True}},
        "3": _ct(cores=2, mem_gb=2, name="parked"),
    }
    samples = {"1": _samples(cpu=1, mem=50), "2": _samples(cpu=1, mem=5), "3": _samples(cpu=1, mem=5, running=0.1)}
    nodes = {"pve3": {"cpu_cores": 4, "total_mem_gb": 32}}
    rep = build_report(guests, nodes, samples, _runs(), NOW)
    assert [g["name"] for g in rep["guests"]] == ["big", "small", "parked"]
    assert rep["guests"][0]["ignored"] is True
    assert rep["totals"]["vcpus_freed"] == 4 + 1
    assert rep["totals"]["mostly_stopped"] == 1
    assert rep["totals"]["assessed"] == 3


@pytest.fixture()
def tmp_db(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "get_db_path", lambda: str(tmp_path / "pb.db"))
    db.close_all()
    db._local.conn = None
    db.init_db()
    yield
    db.close_all()
    db._local.conn = None


class _Cache:
    def __init__(self, data):
        self.data = data

    def get(self):
        return self.data


def test_route_and_guest_history_payload(tmp_db):
    from proxbalance.routes.guests import guests_bp

    now = time.time()
    conn = db.get_connection()
    for i in range(int(5 * 24)):
        ts = now - 5 * DAY + i * STEP + 1
        conn.execute("INSERT INTO node_metrics (node_name, ts, cpu, memory) VALUES ('pve3', ?, 10, 10)", (ts,))
        conn.execute("INSERT INTO guest_metrics (vmid, ts, node, cpu, memory) VALUES ('101', ?, 'pve3', 2, 10)", (ts,))
    conn.commit()

    app = Flask(__name__)
    app.config["cache_manager"] = _Cache({
        "guests": {"101": _ct(cores=4, mem_gb=8, name="idle"), "102": _ct(name="nodata")},
        "nodes": {"pve3": {"cpu_cores": 4, "total_mem_gb": 32}},
    })
    app.register_blueprint(guests_bp)
    client = app.test_client()

    body = client.get("/api/insights/rightsizing").get_json()
    assert body["success"] is True
    assert [g["vmid"] for g in body["guests"]] == [101]
    assert [h["kind"] for h in body["guests"][0]["hints"]] == ["cpu", "memory"]
    assert body["totals"]["no_data"] == 1

    hist = client.get("/api/guests/101/history?hours=24").get_json()
    assert hist["rightsizing"]["status"] == "ok"
    assert [h["kind"] for h in hist["rightsizing"]["hints"]] == ["cpu", "memory"]
    assert client.get("/api/guests/102/history?hours=24").get_json()["rightsizing"]["status"] == "no_data"
