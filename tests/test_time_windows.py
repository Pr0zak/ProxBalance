"""Schedule window matching in automigrate._window_matches, including overnight windows."""
import os
import sys
from datetime import datetime

import pytest
import pytz

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import automigrate  # noqa: E402

TZ = pytz.timezone('America/Chicago')


def at(day, hhmm):
    """Wall-clock time in Chicago on a weekday of the week of 2026-09-21 (a Monday)."""
    days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    h, m = map(int, hhmm.split(':'))
    return TZ.localize(datetime(2026, 9, 21 + days.index(day), h, m))


FRI_NIGHT = {'name': 'Night', 'days': ['Friday'], 'start_time': '22:00', 'end_time': '06:00'}
SUN_NIGHT = {'name': 'Sun', 'days': ['Sunday'], 'start_time': '22:00', 'end_time': '02:00'}
DAY = {'name': 'Day', 'days': ['Monday'], 'start_time': '03:00', 'end_time': '21:00'}


@pytest.mark.parametrize('window,day,hhmm,expected', [
    # Overnight: starts on the listed day, the tail belongs to the next day.
    (FRI_NIGHT, 'friday', '23:00', True),
    (FRI_NIGHT, 'saturday', '01:00', True),
    (FRI_NIGHT, 'saturday', '06:00', True),     # end is inclusive
    (FRI_NIGHT, 'saturday', '06:01', False),
    (FRI_NIGHT, 'friday', '01:00', False),      # Thursday is not listed
    (FRI_NIGHT, 'saturday', '23:00', False),    # Saturday is not a start day
    (FRI_NIGHT, 'friday', '21:59', False),
    # Week wrap: Sunday night runs into Monday morning.
    (SUN_NIGHT, 'monday', '01:30', True),
    (SUN_NIGHT, 'sunday', '01:30', False),
    # Same-day window unchanged.
    (DAY, 'monday', '03:00', True),
    (DAY, 'monday', '21:00', True),
    (DAY, 'monday', '21:01', False),
    (DAY, 'tuesday', '12:00', False),
])
def test_window_matches(window, day, hhmm, expected):
    assert automigrate._window_matches(window, at(day, hhmm)) is expected
