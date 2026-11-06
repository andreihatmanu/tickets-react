from dataclasses import dataclass
from uuid import UUID
from ..domain.rules import User, is_visible, is_expired, Forbidden, NotFound, set_due_date

@dataclass
class ListTickets:
    repository: object
    clock: object
    def execute(self, user: User, offset=0, limit=20, q='', state=None, severity=None,
                assigned_team=None, expired_only=False, sort='LAST_MODIFIED', direction='DESC'):
        if not ({'tickets.read', 'tickets.read.all'} & user.permissions):
            raise Forbidden('Missing tickets.read permission')
        rows = [t for t in self.repository.list_all() if is_visible(t, user)]
        if q:
            needle = q.casefold()
            rows = [t for t in rows if any(needle in str(v or '').casefold() for v in (t.key,t.title,t.asset))]
        if state: rows = [t for t in rows if t.state == state]
        if severity: rows = [t for t in rows if t.severity == severity]
        if assigned_team: rows = [t for t in rows if t.assignedTeam == assigned_team]
        if expired_only: rows = [t for t in rows if is_expired(t, self.clock.today())]
        fields = {'KEY': lambda t: t.key, 'SEVERITY': lambda t: {'CRITICAL':0,'HIGH':1,'MEDIUM':2,'LOW':3}[t.severity],
                  'STATE': lambda t: t.state, 'TARGET_DATE': lambda t: t.targetDate,
                  'LAST_MODIFIED': lambda t: t.lastModified}
        # UUID is a deterministic tie-breaker, preventing page overlap for equal sort values.
        rows.sort(key=lambda t: str(t.id))
        rows.sort(key=fields[sort], reverse=direction == 'DESC')
        total = len(rows)
        return rows[offset:offset+limit], total

@dataclass
class GetTicket:
    repository: object
    def execute(self, user: User, ticket_id: UUID):
        if not ({'tickets.read', 'tickets.read.all'} & user.permissions):
            raise Forbidden('Missing tickets.read permission')
        ticket = self.repository.get(ticket_id)
        if ticket is None or not is_visible(ticket, user): raise NotFound('Ticket not found')
        return ticket

@dataclass
class SetTicketDueDate:
    repository: object
    clock: object
    def execute(self, user: User, ticket_id: UUID, due_date):
        if 'tickets.update' not in user.permissions: raise Forbidden('Missing tickets.update permission')
        ticket = self.repository.get(ticket_id)
        if ticket is None or not is_visible(ticket, user): raise NotFound('Ticket not found')
        set_due_date(ticket, due_date, self.clock.today(), self.clock.now())
        return self.repository.save(ticket)
