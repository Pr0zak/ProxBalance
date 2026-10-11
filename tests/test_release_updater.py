"""Tests for release_updater: version ordering, release selection, checksums,
the update check per channel, and refusing bad input or a tampered bundle."""

import hashlib
import io
import os
import sys
import tarfile

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import release_updater as ru  # noqa: E402
from update_manager import UpdateManager  # noqa: E402


def rel(tag, prerelease=False, draft=False, assets=()):
    return {
        "tag_name": tag, "name": f"{tag} — test", "prerelease": prerelease, "draft": draft,
        "html_url": f"https://example/{tag}", "published_at": "2026-10-11T00:00:00Z", "body": "notes",
        "assets": [{"name": a, "browser_download_url": f"https://example/{a}"} for a in assets],
    }


# -- versions -------------------------------------------------------------

def test_parse_version_rejects_non_semver():
    assert ru.parse_version("main") is None
    assert ru.parse_version("v2.15") is None
    assert ru.parse_version("") is None
    assert ru.parse_version(None) is None


@pytest.mark.parametrize("newer,older", [
    ("v2.15.1", "v2.15.0"),
    ("v2.16.0", "v2.15.9"),
    ("v3.0.0", "v2.99.99"),
    ("v2.16.0", "v2.16.0-rc.2"),       # final beats its pre-releases
    ("v2.16.0-rc.10", "v2.16.0-rc.9"),  # numeric parts compare as numbers
    ("v2.16.0-rc.1", "v2.16.0-beta.1"),
    ("2.16.0", "v2.15.0"),             # leading v optional
])
def test_is_newer_ordering(newer, older):
    assert ru.is_newer(newer, older)
    assert not ru.is_newer(older, newer)


def test_is_newer_equal_and_unparseable():
    assert not ru.is_newer("v2.15.0", "v2.15.0")
    assert ru.is_newer("v2.15.0", "main@666c069")   # a branch build is older than any release
    assert not ru.is_newer("nightly", "v2.15.0")


# -- release selection ----------------------------------------------------

RELEASES = [
    rel("v2.14.0"),
    rel("v2.16.0-rc.1", prerelease=True),
    rel("v2.15.0"),
    rel("v2.17.0", draft=True),
    rel("v2.16.0-rc.2"),               # suffix but not flagged on GitHub
    rel("not-a-version"),
]


def test_stable_skips_prereleases_drafts_and_junk():
    assert ru.select_latest_release(RELEASES, "stable")["tag_name"] == "v2.15.0"


def test_beta_includes_prereleases_but_not_drafts():
    assert ru.select_latest_release(RELEASES, "beta")["tag_name"] == "v2.16.0-rc.2"


def test_no_releases():
    assert ru.select_latest_release([], "stable") is None
    assert ru.select_latest_release(None, "beta") is None


def test_summary_marks_prebuilt_only_with_bundle_and_checksums():
    full = ru.summarize_release(rel("v2.16.0", assets=("proxbalance-web-v2.16.0.tar.gz", "SHA256SUMS")))
    assert full["prebuilt"] and full["web_asset_url"].endswith("proxbalance-web-v2.16.0.tar.gz")
    no_sums = ru.summarize_release(rel("v2.16.0", assets=("proxbalance-web-v2.16.0.tar.gz",)))
    assert not no_sums["prebuilt"]
    wrong_name = ru.summarize_release(rel("v2.16.0", assets=("proxbalance-web-v2.15.0.tar.gz", "SHA256SUMS")))
    assert not wrong_name["prebuilt"]
    assert ru.summarize_release(None) is None


def test_normalize_channel():
    assert ru.normalize_channel("beta") == "beta"
    assert ru.normalize_channel("dev") == "dev"
    assert ru.normalize_channel("nightly") == "stable"
    assert ru.normalize_channel(None) == "stable"


def test_parse_checksums():
    digest = "a" * 64
    text = f"{digest}  proxbalance-web-v2.16.0.tar.gz\n{'b' * 64} *other.txt\ngarbage line\n"
    sums = ru.parse_checksums(text)
    assert sums == {"proxbalance-web-v2.16.0.tar.gz": digest, "other.txt": "b" * 64}


# -- update check per channel ---------------------------------------------

def manager_with(monkeypatch, tmp_path, version_info, releases):
    um = UpdateManager(str(tmp_path))
    monkeypatch.setattr(um, "get_version_info", lambda: version_info)
    monkeypatch.setattr(ru, "get_releases", lambda repo, force=False: {"releases": releases, "error": None})
    return um


def vinfo(on_release, tag="v2.15.0", branch="main", version="v2.15.0"):
    return {"version": version, "commit": "666c0690", "branch": branch, "latest_tag": tag,
            "on_release": on_release, "last_commit_date": "2026-10-11"}


def test_stable_offers_newer_release(monkeypatch, tmp_path):
    um = manager_with(monkeypatch, tmp_path, vinfo(True, branch="HEAD"), RELEASES + [rel("v2.15.1")])
    result = um.check_for_updates(config={"updates": {"channel": "stable"}})
    assert result["update_available"] and result["latest_version"] == "v2.15.1"
    assert result["update_type"] == "release" and result["channel"] == "stable"


def test_stable_up_to_date(monkeypatch, tmp_path):
    um = manager_with(monkeypatch, tmp_path, vinfo(True, branch="HEAD"), RELEASES)
    result = um.check_for_updates(config={"updates": {"channel": "stable"}})
    assert not result["update_available"] and result["latest_version"] == "v2.15.0"


def test_missing_channel_defaults_to_stable(monkeypatch, tmp_path):
    um = manager_with(monkeypatch, tmp_path, vinfo(True, branch="HEAD"), RELEASES)
    assert um.check_for_updates(config={})["channel"] == "stable"


def test_branch_install_is_offered_the_release(monkeypatch, tmp_path):
    um = manager_with(monkeypatch, tmp_path, vinfo(False, version="v2.15.0-3-gabc1234"), RELEASES)
    result = um.check_for_updates(config={"updates": {"channel": "stable"}})
    assert result["update_available"] and result["update_type"] == "switch_to_release"
    assert result["latest_version"] == "v2.15.0"


def test_beta_offers_prerelease(monkeypatch, tmp_path):
    um = manager_with(monkeypatch, tmp_path, vinfo(True, branch="HEAD"), RELEASES)
    result = um.check_for_updates(config={"updates": {"channel": "beta"}})
    assert result["update_available"] and result["latest_version"] == "v2.16.0-rc.2"


def test_update_notification_sent_once_per_version(monkeypatch, tmp_path):
    sent = []
    import notifications
    monkeypatch.setattr(notifications, "send_notification", lambda cfg, ev, data: sent.append(data))
    um = manager_with(monkeypatch, tmp_path, vinfo(True, branch="HEAD"), RELEASES + [rel("v2.15.1")])
    cfg = {"updates": {"channel": "stable"}}
    for _ in range(3):
        um.check_for_updates(config=cfg)
    assert len(sent) == 1 and sent[0]["latest_version"] == "v2.15.1"


# -- refusing bad input ---------------------------------------------------

@pytest.mark.parametrize("target", [
    {"tag": "v2.16.0; rm -rf /"}, {"tag": "latest"}, {"branch": "--upload-pack=evil"},
    {"branch": "main && reboot"}, {},
])
def test_start_update_rejects_bad_targets(tmp_path, target):
    result = ru.start_update(target, str(tmp_path))
    assert result["success"] is False


def test_start_update_refuses_while_running(tmp_path):
    ru._write_json(str(tmp_path / ru.STATUS_FILE), {"state": "running", "pid": os.getpid()})
    assert ru.start_update({"tag": "v2.16.0"}, str(tmp_path))["success"] is False


def test_stale_running_status_reads_as_failed(tmp_path):
    ru._write_json(str(tmp_path / ru.STATUS_FILE), {"state": "running", "pid": 999999999})
    assert ru.read_status(str(tmp_path))["state"] == "failed"
    assert ru.read_status(str(tmp_path / "nowhere"))["state"] == "idle"


# -- web bundle verification ----------------------------------------------

def make_bundle(files):
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for name, content in files.items():
            info = tarfile.TarInfo(name)
            info.size = len(content)
            tar.addfile(info, io.BytesIO(content))
    return buf.getvalue()


def bundle_runner(tmp_path, monkeypatch, bundle, checksum_line):
    runner = object.__new__(ru.Runner)
    runner.repo = str(tmp_path)
    urls = {"https://x/SHA256SUMS": checksum_line.encode(), "https://x/web.tgz": bundle}
    monkeypatch.setattr(ru, "_http_get", lambda url, timeout, accept=None: urls[url])
    release = {"tag": "v2.16.0", "checksums_url": "https://x/SHA256SUMS", "web_asset_url": "https://x/web.tgz"}
    return runner, release


def test_bundle_installs_when_checksum_matches(tmp_path, monkeypatch):
    bundle = make_bundle({"assets/js/app.js": b"js" * 10, "assets/css/tailwind.css": b"css"})
    line = f"{hashlib.sha256(bundle).hexdigest()}  proxbalance-web-v2.16.0.tar.gz"
    runner, release = bundle_runner(tmp_path, monkeypatch, bundle, line)
    runner._install_bundle(release)
    assert (tmp_path / "assets/js/app.js").read_bytes() == b"js" * 10
    assert (tmp_path / "assets/css/tailwind.css").read_bytes() == b"css"


def test_bundle_rejected_on_checksum_mismatch(tmp_path, monkeypatch):
    bundle = make_bundle({"assets/js/app.js": b"js", "assets/css/tailwind.css": b"css"})
    runner, release = bundle_runner(tmp_path, monkeypatch, bundle, f"{'0' * 64}  proxbalance-web-v2.16.0.tar.gz")
    with pytest.raises(ru.UpdateFailed, match="Checksum mismatch"):
        runner._install_bundle(release)
    assert not (tmp_path / "assets/js/app.js").exists()


def test_bundle_rejected_when_files_missing(tmp_path, monkeypatch):
    bundle = make_bundle({"assets/js/app.js": b"js", "../../etc/passwd": b"x"})
    line = f"{hashlib.sha256(bundle).hexdigest()}  proxbalance-web-v2.16.0.tar.gz"
    runner, release = bundle_runner(tmp_path, monkeypatch, bundle, line)
    with pytest.raises(ru.UpdateFailed, match="tailwind.css missing"):
        runner._install_bundle(release)
    assert not (tmp_path.parent.parent / "etc/passwd").exists()


# -- backup ---------------------------------------------------------------

def test_backup_compresses_database_and_keeps_three(tmp_path, monkeypatch):
    import gzip
    import sqlite3
    db = tmp_path / "proxbalance.db"
    con = sqlite3.connect(db)
    con.execute("create table t (x text)")
    con.executemany("insert into t values (?)", [("metrics row " * 20,)] * 2000)
    con.commit()
    con.close()
    (tmp_path / "config.json").write_text("{}")
    web = tmp_path / "web"
    (web / "assets/js").mkdir(parents=True)
    (web / "assets/js/app.js").write_text("js")
    monkeypatch.setattr(ru, "WEBROOT", str(web))

    for i in range(5):
        runner = object.__new__(ru.Runner)
        runner.repo, runner.tag, runner.branch = str(tmp_path), f"v2.16.{i}", None
        runner.prev_branch, runner.prev_commit, runner.prev_label = "main", "abc", "v2.15.0"
        runner.status = ru.StatusWriter(str(tmp_path), runner.tag, "v2.15.0")
        monkeypatch.setattr(ru, "datetime", type("D", (), {"now": staticmethod(
            lambda tz=None, i=i: __import__("datetime").datetime(2026, 10, 11, 12, 0, i))}))
        runner.backup()

    root = tmp_path / ru.BACKUP_SUBDIR
    kept = sorted(p.name for p in root.iterdir())
    assert len(kept) == ru.BACKUPS_KEPT and kept[-1].endswith("v2.16.4")
    latest = root / kept[-1]
    assert not (latest / "proxbalance.db").exists()
    gz = latest / "proxbalance.db.gz"
    assert gz.stat().st_size < db.stat().st_size / 3
    restored = tmp_path / "restored.db"
    restored.write_bytes(gzip.decompress(gz.read_bytes()))
    assert sqlite3.connect(restored).execute("select count(*) from t").fetchone()[0] == 2000
    assert (latest / "web/assets/js/app.js").read_text() == "js"


def test_required_free_bytes_counts_database(tmp_path):
    assert ru.required_free_bytes(str(tmp_path)) == ru.MIN_FREE_BYTES
    (tmp_path / "proxbalance.db").write_bytes(b"x" * 1000)
    assert ru.required_free_bytes(str(tmp_path)) == ru.MIN_FREE_BYTES + 1000
