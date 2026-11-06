from typing import Annotated
from uuid import UUID
from fastapi import FastAPI, Header, HTTPException, Query, Request, Depends
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer
from ...models import Ticket, TicketPage, Pagination, DueDateUpdate, CurrentUser, Problem, TicketStateFilter, SeverityFilter, TicketSort, Direction
from ...domain.rules import User, DomainError
from ...bootstrap import list_tickets as list_use_case, get_ticket as get_use_case, set_ticket_due_date as patch_use_case

app = FastAPI(title="Mini Tickets API", version="1.0.0", description="API Mini Tickets con arquitectura hexagonal.", servers=[{"url":"https://localhost:3001", "description":"Servidor local HTTPS documentado"}])
_bearer = HTTPBearer(auto_error=False)

def current_user(x_user_team: Annotated[str, Header(alias="X-User-Team", max_length=100)] = "Payments",
                 x_user_permissions: Annotated[str, Header(alias="X-User-Permissions", max_length=300)] = "tickets.read") -> CurrentUser:
    return CurrentUser(team=x_user_team, permissions=[p.strip() for p in x_user_permissions.split(",") if p.strip()])

def to_domain_user(user: CurrentUser) -> User:
    return User(user.team, frozenset(user.permissions))

def problem(status: int, title: str, detail: str, instance: str | None = None):
    return JSONResponse(status_code=status, media_type="application/problem+json",
        content=Problem(status=status, title=title, detail=detail, instance=instance).model_dump(exclude_none=True))

@app.exception_handler(RequestValidationError)
async def validation_problem_handler(request: Request, exc: RequestValidationError):
    return problem(422, "Unprocessable Entity", "Request validation failed", request.url.path)

@app.exception_handler(DomainError)
async def domain_problem_handler(request: Request, exc: DomainError):
    titles = {403:"Forbidden",404:"Not Found",409:"Conflict",422:"Unprocessable Entity"}
    return problem(exc.status_code, titles.get(exc.status_code,"Error"), str(exc), request.url.path)

@app.get("/api/v1/me", response_model=CurrentUser, operation_id="getCurrentUser", tags=["Users"])
def get_current_user(user: Annotated[CurrentUser, Depends(current_user)]): return user

@app.get("/api/v1/tickets", response_model=TicketPage, operation_id="listTickets", tags=["Tickets"], responses={403:{"model":Problem},422:{"model":Problem}})
def list_tickets(user: Annotated[CurrentUser, Depends(current_user)],
    offset: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100),
    q: str = Query("", max_length=256), state: TicketStateFilter = Query(TicketStateFilter.ALL),
    severity: SeverityFilter = Query(SeverityFilter.ALL), assignedTeam: str | None = Query(None, min_length=1, max_length=100),
    expiredOnly: bool = Query(False), sort: TicketSort = Query(TicketSort.LAST_MODIFIED),
    direction: Direction = Query(Direction.DESC)):
    rows, total = list_use_case.execute(to_domain_user(user), offset, limit, q,
        None if state == TicketStateFilter.ALL else state.value,
        None if severity == SeverityFilter.ALL else severity.value,
        assignedTeam, expiredOnly, sort.value, direction.value)
    return TicketPage(data=rows, pagination=Pagination(offset=offset, limit=limit, totalElements=total))

@app.get("/api/v1/tickets/{ticketId}", response_model=Ticket, operation_id="getTicket", tags=["Tickets"], responses={403:{"model":Problem},404:{"model":Problem},422:{"model":Problem}})
def get_ticket(ticketId: UUID, user: Annotated[CurrentUser, Depends(current_user)]):
    return get_use_case.execute(to_domain_user(user), ticketId)

@app.patch("/api/v1/tickets/{ticketId}", response_model=Ticket, operation_id="updateTicketDueDate", tags=["Tickets"], responses={403:{"model":Problem},404:{"model":Problem},409:{"model":Problem},422:{"model":Problem}})
def update_ticket_due_date(ticketId: UUID, payload: DueDateUpdate, user: Annotated[CurrentUser, Depends(current_user)]):
    return patch_use_case.execute(to_domain_user(user), ticketId, payload.dueDate)

@app.get("/health", include_in_schema=False)
def health(): return {"status":"ok"}

# El contrato publica bearer global; la demo sigue usando las cabeceras de identidad.
_original_openapi = app.openapi
def contract_openapi():
    schema = _original_openapi()
    schema["openapi"] = "3.0.3"
    schema.setdefault("components", {}).setdefault("securitySchemes", {})["bearerAuth"] = {"type":"http", "scheme":"bearer", "bearerFormat":"JWT"}
    schema["security"] = [{"bearerAuth": []}]
    for path_item in schema.get("paths", {}).values():
        for operation in path_item.values():
            if isinstance(operation, dict): operation.pop("security", None)
    return schema
app.openapi = contract_openapi
