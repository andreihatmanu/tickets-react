from datetime import date, datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.application.use_cases import ListTickets, GetTicket, SetTicketDueDate
from app.domain.rules import User, Forbidden, NotFound, Conflict, InvalidDueDate


class FakeRepository:
    def __init__(self, rows):
        self.rows = {row.id: row for row in rows}
    def list_all(self):
        return list(self.rows.values())
    def get(self, ticket_id):
        return self.rows.get(ticket_id)
    def save(self, ticket):
        self.rows[ticket.id] = ticket
        return ticket


class FakeClock:
    def today(self):
        return date(2026, 11, 6)
    def now(self):
        return datetime(2026, 11, 6, 10, 0, tzinfo=timezone.utc)


def make_ticket(**overrides):
    values = dict(id=uuid4(), key='SEC-1001', title='SQL injection', asset='payments-api',
                  creatorTeam='Security', assignedTeam='Payments', severity='HIGH', state='REPORTED',
                  restricted=False, targetDate=date(2026, 11, 1), dueDate=None,
                  lastModified=datetime(2026, 10, 1, tzinfo=timezone.utc))
    values.update(overrides)
    return SimpleNamespace(**values)


def test_list_use_case_filters_search_and_counts_only_visible():
    visible = make_ticket(title='Critical SQL issue')
    hidden = make_ticket(restricted=True, creatorTeam='Other', assignedTeam='Other')
    repo = FakeRepository([visible, hidden])
    use_case = ListTickets(repo, FakeClock())
    rows, total = use_case.execute(User('Payments', frozenset({'tickets.read'})), q='sql', limit=10)
    assert [row.id for row in rows] == [visible.id]
    assert total == 1


def test_list_use_case_rejects_user_without_read_permission():
    use_case = ListTickets(FakeRepository([]), FakeClock())
    with pytest.raises(Forbidden):
        use_case.execute(User('Payments', frozenset()))


def test_get_use_case_returns_404_for_missing_or_invisible_ticket():
    ticket = make_ticket(restricted=True, creatorTeam='Other', assignedTeam='Other')
    use_case = GetTicket(FakeRepository([ticket]))
    with pytest.raises(NotFound):
        use_case.execute(User('Payments', frozenset({'tickets.read'})), ticket.id)
    with pytest.raises(NotFound):
        use_case.execute(User('Payments', frozenset({'tickets.read'})), uuid4())


def test_set_due_date_use_case_updates_ticket_and_transition():
    ticket = make_ticket()
    repo = FakeRepository([ticket])
    use_case = SetTicketDueDate(repo, FakeClock())
    updated = use_case.execute(User('Payments', frozenset({'tickets.update'})), ticket.id, date(2026, 11, 20))
    assert updated.state == 'IN_PROGRESS'
    assert updated.dueDate == date(2026, 11, 20)
    assert updated.lastModified == FakeClock().now()


def test_set_due_date_use_case_enforces_permission_visibility_and_date_rules():
    ticket = make_ticket()
    repo = FakeRepository([ticket])
    use_case = SetTicketDueDate(repo, FakeClock())
    with pytest.raises(Forbidden):
        use_case.execute(User('Payments', frozenset()), ticket.id, date(2026, 11, 20))
    with pytest.raises(InvalidDueDate):
        use_case.execute(User('Payments', frozenset({'tickets.update'})), ticket.id, date(2026, 11, 5))
    hidden = make_ticket(restricted=True, creatorTeam='Other', assignedTeam='Other')
    with pytest.raises(NotFound):
        SetTicketDueDate(FakeRepository([hidden]), FakeClock()).execute(
            User('Payments', frozenset({'tickets.update'})), hidden.id, date(2026, 11, 20))
    done = make_ticket(state='DONE')
    with pytest.raises(Conflict):
        SetTicketDueDate(FakeRepository([done]), FakeClock()).execute(
            User('Payments', frozenset({'tickets.update'})), done.id, date(2026, 11, 20))
