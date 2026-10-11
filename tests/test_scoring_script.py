"""Run the script-style scoring checks as part of the pytest suite."""

import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def test_scoring_improvements_script_passes():
    result = subprocess.run(
        [sys.executable, os.path.join(HERE, "test_scoring_improvements.py")],
        capture_output=True, text=True, timeout=300, cwd=os.path.dirname(HERE),
    )
    assert result.returncode == 0, result.stdout[-4000:] + result.stderr[-2000:]
