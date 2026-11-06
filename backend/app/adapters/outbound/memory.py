from datetime import datetime, date, timezone
class InMemoryTicketRepository:
    def __init__(self, tickets): self._tickets = {t.id: t for t in tickets}
    def list_all(self): return list(self._tickets.values())
    def get(self, ticket_id): return self._tickets.get(ticket_id)
    def save(self, ticket): self._tickets[ticket.id] = ticket; return ticket
class SystemClock:
    def today(self): return date.today()
    def now(self): return datetime.now(timezone.utc)
