from dataclasses import dataclass
from datetime import date
from typing import Iterable

@dataclass(frozen=True)
class User:
    team: str
    permissions: frozenset[str]

class DomainError(Exception):
    status_code = 400
class Forbidden(DomainError): status_code = 403
class NotFound(DomainError): status_code = 404
class Conflict(DomainError): status_code = 409
class InvalidDueDate(DomainError): status_code = 422

def is_visible(ticket, user: User) -> bool:
    return (not ticket.restricted or 'tickets.read.all' in user.permissions
            or user.team in {ticket.creatorTeam, ticket.assignedTeam})

def is_expired(ticket, today: date) -> bool:
    return ticket.state != 'DONE' and ticket.targetDate < today

def set_due_date(ticket, due_date: date, today: date, modified_at) -> None:
    if ticket.state == 'DONE':
        raise Conflict('DONE tickets cannot be updated')
    if due_date < today:
        raise InvalidDueDate('dueDate cannot be earlier than today')
    ticket.dueDate = due_date
    if ticket.state == 'REPORTED':
        ticket.state = 'IN_PROGRESS'
    ticket.lastModified = modified_at
