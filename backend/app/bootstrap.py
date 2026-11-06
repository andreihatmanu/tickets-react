from .seed import TICKETS
from .adapters.outbound.memory import InMemoryTicketRepository, SystemClock
from .application.use_cases import ListTickets, GetTicket, SetTicketDueDate
repository = InMemoryTicketRepository(TICKETS)
clock = SystemClock()
list_tickets = ListTickets(repository, clock)
get_ticket = GetTicket(repository)
set_ticket_due_date = SetTicketDueDate(repository, clock)
