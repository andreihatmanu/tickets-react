from datetime import date, datetime, timezone
from types import SimpleNamespace
import pytest
from app.domain.rules import User, is_visible, is_expired, set_due_date, Conflict, InvalidDueDate

def ticket(**overrides):
    values = dict(restricted=True, creatorTeam="Security", assignedTeam="Payments", state="REPORTED",
                  targetDate=date(2026, 1, 1), dueDate=None, lastModified=None)
    values.update(overrides)
    return SimpleNamespace(**values)

def test_restricted_visibility_uses_team_or_read_all():
    t = ticket()
    assert is_visible(t, User("Payments", frozenset()))
    assert is_visible(t, User("Other", frozenset({"tickets.read.all"})))
    assert not is_visible(t, User("Other", frozenset()))

def test_expired_means_past_target_and_not_done():
    assert is_expired(ticket(targetDate=date(2025, 1, 1)), date(2026, 1, 1))
    assert not is_expired(ticket(state="DONE", targetDate=date(2025, 1, 1)), date(2026, 1, 1))

def test_setting_due_date_transitions_and_updates_timestamp():
    t = ticket()
    now = datetime.now(timezone.utc)
    set_due_date(t, date(2026, 2, 1), date(2026, 1, 1), now)
    assert t.state == "IN_PROGRESS" and t.dueDate == date(2026, 2, 1) and t.lastModified == now

def test_done_and_past_due_date_are_rejected():
    with pytest.raises(Conflict): set_due_date(ticket(state="DONE"), date(2026, 2, 1), date(2026, 1, 1), datetime.now(timezone.utc))
    with pytest.raises(InvalidDueDate): set_due_date(ticket(), date(2025, 12, 31), date(2026, 1, 1), datetime.now(timezone.utc))


def test_due_date_same_day_is_allowed():
    t = ticket()
    today = date(2026, 1, 1)
    set_due_date(t, today, today, datetime(2026, 1, 1, tzinfo=timezone.utc))
    assert t.dueDate == today
