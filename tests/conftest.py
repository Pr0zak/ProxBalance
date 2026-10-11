"""Shared pytest setup.

test_scoring_improvements.py is a standalone script (it prints a report and
calls sys.exit), so pytest must not import it; test_scoring_script.py runs it
as a subprocess instead.
"""

collect_ignore = ["test_scoring_improvements.py"]
