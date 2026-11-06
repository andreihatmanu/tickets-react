from datetime import datetime, timezone
from uuid import UUID
from typing import Annotated
from fastapi import FastAPI, Header, HTTPException, Query, Request, Depends, Security, Path
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer
from .models import Ticket, TicketPage, Pagination, DueDateUpdate, CurrentUser, Problem, TicketState, TicketSeverity, TicketStateFilter, SeverityFilter, TicketSort, Direction
from .seed import TICKETS

app = FastAPI(
    title="Mini Tickets API",
    version="1.0.0",
    description=(
        "API de Mini Tickets. Para esta prueba, la identidad se simula mediante "
        "X-User-Team y X-User-Permissions; el esquema bearer se conserva en el contrato "
        "como requisito de seguridad y no se exige un token real en el entorno demo."
    ),
    servers=[{"url": "https://127.0.0.1:3001", "description": "Servidor local HTTPS documentado"}],
)
bearer = HTTPBearer(auto_error=False)

def current_user(
    x_user_team: Annotated[str, Header(alias="X-User-Team", max_length=100, description="Equipo del usuario simulado.", examples=["Payments"])] = "Payments",
    x_user_permissions: Annotated[str, Header(alias="X-User-Permissions", max_length=300, description="Permisos separados por comas.", examples=["tickets.read,tickets.update"])] = "tickets.read",
    _token=Security(bearer),
) -> CurrentUser:
    return CurrentUser(team=x_user_team, permissions=[p.strip() for p in x_user_permissions.split(",") if p.strip()])

def visible(ticket: Ticket, user: CurrentUser) -> bool:
    return (
        not ticket.restricted
        or "tickets.read.all" in user.permissions
        or user.team in {ticket.creatorTeam, ticket.assignedTeam}
    )

def require_read(user: CurrentUser):
    if "tickets.read" not in user.permissions and "tickets.read.all" not in user.permissions:
        raise HTTPException(status_code=403, detail="Missing tickets.read permission")
    return user

def problem(status: int, title: str, detail: str, instance: str | None = None):
    return JSONResponse(
        status_code=status,
        media_type="application/problem+json",
        content=Problem(status=status, title=title, detail=detail, instance=instance).model_dump(exclude_none=True),
    )

@app.exception_handler(RequestValidationError)
async def validation_problem_handler(request: Request, exc: RequestValidationError):
    return problem(422, "Unprocessable Entity", "Request validation failed", request.url.path)

@app.exception_handler(HTTPException)
async def http_problem_handler(request: Request, exc: HTTPException):
    titles = {403: "Forbidden", 404: "Not Found", 409: "Conflict", 422: "Unprocessable Entity"}
    detail = exc.detail if isinstance(exc.detail, str) else "Request validation failed"
    return problem(exc.status_code, titles.get(exc.status_code, "Error"), detail, request.url.path)

@app.exception_handler( Exception )
async def unexpected_problem_handler(request: Request, exc: Exception):
    return problem(500, "Internal Server Error", "An unexpected error occurred", request.url.path)

@app.get("/api/v1/tickets", response_model=TicketPage, operation_id="listTickets", tags=["Tickets"], summary="Listar tickets", responses={403: {"model": Problem, "content": {"application/problem+json": {"schema": {"$ref": "#/components/schemas/Problem"}}}}, 422: {"model": Problem, "content": {"application/problem+json": {"schema": {"$ref": "#/components/schemas/Problem"}}}}})
def list_tickets(
    user: Annotated[CurrentUser, Depends(current_user)],
    offset: int = Query(0, ge=0, le=2_147_483_647, description="Número de elementos omitidos.", examples=[0]),
    limit: int = Query(20, ge=1, le=100, description="Número máximo de tickets por página.", examples=[20]),
    q: str = Query("", max_length=200, description="Búsqueda en clave, título, activo, equipos y responsable.", examples=["log4j"]),
    state: TicketStateFilter = Query(TicketStateFilter.ALL, description="Filtro de estado; ALL desactiva el filtro.", examples=["IN_PROGRESS"]),
    severity: SeverityFilter = Query(SeverityFilter.ALL, description="Filtro de severidad; ALL desactiva el filtro.", examples=["HIGH"]),
    sort: TicketSort = Query(TicketSort.LAST_MODIFIED, description="Campo de ordenación.", examples=["TARGET_DATE"]),
    direction: Direction = Query(Direction.DESC, description="Dirección de ordenación.", examples=["ASC"]),
):
    user = require_read(user)
    rows = [t for t in TICKETS if visible(t, user)]
    needle = q.casefold().strip()
    if needle:
        rows = [t for t in rows if needle in " ".join([t.key, t.title, t.asset, t.creatorTeam, t.assignedTeam or "", t.assignee]).casefold()]
    if state != TicketStateFilter.ALL:
        rows = [t for t in rows if t.state == state.value]
    if severity != SeverityFilter.ALL:
        rows = [t for t in rows if t.severity == severity.value]
    if sort == TicketSort.SEVERITY:
        order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        rows.sort(key=lambda t: order[t.severity], reverse=direction == Direction.DESC)
    elif sort == TicketSort.TARGET_DATE:
        rows.sort(key=lambda t: t.targetDate, reverse=direction == Direction.DESC)
    else:
        rows.sort(key=lambda t: t.lastModified, reverse=direction == Direction.DESC)
    total = len(rows)
    return TicketPage(data=rows[offset:offset + limit], pagination=Pagination(offset=offset, limit=limit, totalElements=total))

@app.patch("/api/v1/tickets/{ticketId}", response_model=Ticket, operation_id="updateTicketDueDate", tags=["Tickets"], summary="Actualizar fecha compromiso", responses={403: {"model": Problem, "content": {"application/problem+json": {"schema": {"$ref": "#/components/schemas/Problem"}}}}, 404: {"model": Problem, "content": {"application/problem+json": {"schema": {"$ref": "#/components/schemas/Problem"}}}}, 409: {"model": Problem, "content": {"application/problem+json": {"schema": {"$ref": "#/components/schemas/Problem"}}}}, 422: {"model": Problem, "content": {"application/problem+json": {"schema": {"$ref": "#/components/schemas/Problem"}}}}})
def update_ticket_due_date(
    ticketId: Annotated[UUID, Path(description="UUID del ticket que se actualizará.")],
    payload: DueDateUpdate,
    user: Annotated[CurrentUser, Depends(current_user)],
):
    ticket = next((t for t in TICKETS if t.id == ticketId), None)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if not visible(ticket, user):
        raise HTTPException(status_code=404, detail="Ticket not found")
    if "tickets.update" not in user.permissions:
        raise HTTPException(status_code=403, detail="Missing tickets.update permission")
    if ticket.state == "DONE":
        raise HTTPException(status_code=409, detail="DONE tickets cannot be updated")
    ticket.dueDate = payload.dueDate
    if ticket.state == "REPORTED":
        ticket.state = TicketState.IN_PROGRESS
    ticket.lastModified = datetime.now(timezone.utc)
    return ticket

@app.get("/api/v1/me", response_model=CurrentUser, operation_id="getCurrentUser", tags=["Users"], summary="Obtener perfil actual", responses={422: {"model": Problem, "content": {"application/problem+json": {"schema": {"$ref": "#/components/schemas/Problem"}}}}})
def get_current_user(user: Annotated[CurrentUser, Depends(current_user)]):
    return user

# Recent FastAPI releases emit 3.1 by default; publish the agreed 3.0.3 document.
_original_openapi = app.openapi
def contract_openapi():
    schema = _original_openapi()
    schema["openapi"] = "3.0.3"
    def normalize_nullable(node):
        if isinstance(node, dict):
            if "$ref" in node and len(node) > 1:
                reference = node.pop("$ref")
                node["allOf"] = [{"$ref": reference}]
            for key, value in list(node.items()):
                if key == "anyOf" and isinstance(value, list):
                    non_null = [item for item in value if item.get("type") != "null"]
                    if len(non_null) == 1:
                        replacement = dict(non_null[0])
                        replacement["nullable"] = True
                        node.pop("anyOf")
                        node.update(replacement)
                else:
                    normalize_nullable(value)
        elif isinstance(node, list):
            for value in node:
                normalize_nullable(value)
    normalize_nullable(schema)
    for component_schema in schema.get("components", {}).get("schemas", {}).values():
        enum_values = component_schema.get("enum")
        if enum_values:
            component_schema["maxLength"] = max(len(value) for value in enum_values)
    # Keep the bearer requirement global, matching the contract-first document.
    security_schemes = schema.get("components", {}).get("securitySchemes", {})
    if "HTTPBearer" in security_schemes:
        security_schemes["bearerAuth"] = security_schemes.pop("HTTPBearer")
    schema["security"] = [{"bearerAuth": []}]
    for path_item in schema.get("paths", {}).values():
        for operation in path_item.values():
            if isinstance(operation, dict):
                operation.pop("security", None)
    # Runtime validation is serialized as RFC 9457 by the exception handler.
    for path_item in schema.get("paths", {}).values():
        for operation in path_item.values():
            if isinstance(operation, dict) and "responses" in operation:
                for response in operation["responses"].values():
                    content = response.get("content", {})
                    if "application/problem+json" in content:
                        content.pop("application/json", None)
    return schema
app.openapi = contract_openapi

@app.get("/health", include_in_schema=False)
def health():
    return {"status": "ok"}
