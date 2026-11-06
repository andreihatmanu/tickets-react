from datetime import date, datetime
from enum import Enum
from uuid import UUID
from typing import Annotated
from pydantic import BaseModel, ConfigDict, Field, EmailStr, field_validator

class TicketState(str, Enum):
    REPORTED = "REPORTED"
    IN_PROGRESS = "IN_PROGRESS"
    PENDING_SECURITY = "PENDING_SECURITY"
    DONE = "DONE"

class TicketSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class TicketStateFilter(str, Enum):
    ALL = "ALL"
    REPORTED = "REPORTED"
    IN_PROGRESS = "IN_PROGRESS"
    PENDING_SECURITY = "PENDING_SECURITY"
    DONE = "DONE"

class SeverityFilter(str, Enum):
    ALL = "ALL"
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class TicketSort(str, Enum):
    TARGET_DATE = "TARGET_DATE"
    LAST_MODIFIED = "LAST_MODIFIED"
    SEVERITY = "SEVERITY"

class Direction(str, Enum):
    ASC = "ASC"
    DESC = "DESC"

class Ticket(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID = Field(description="Identificador UUID del ticket.", examples=["b7c1e0de-6f0a-4f43-9a55-0a2f6c1d8e11"], json_schema_extra={"maxLength": 36})
    key: str = Field(pattern=r"^SEC-[0-9]{4,6}$", max_length=16, description="Clave legible del ticket.", examples=["SEC-1024"])
    title: str = Field(min_length=1, max_length=200, description="Resumen del hallazgo de seguridad.", examples=["Log4j vulnerable version in payments-api"])
    asset: str = Field(min_length=1, max_length=100, description='Activo afectado o "None" si se desconoce.', examples=["payments-api"])
    creatorTeam: str = Field(min_length=1, max_length=100, description="Equipo que creó el ticket.", examples=["Security Champions"])
    assignedTeam: str | None = Field(max_length=100, description="Equipo asignado; null si no está asignado.", examples=["Payments", None])
    assignee: EmailStr = Field(max_length=254, description="Correo del responsable asignado.", examples=["jdoe@example.com"])
    severity: TicketSeverity = Field(description="Severidad del hallazgo.", examples=["HIGH"])
    state: TicketState = Field(description="Estado del flujo de trabajo.", examples=["REPORTED"])
    restricted: bool = Field(description="Indica si el ticket solo es visible para equipos autorizados.", examples=[False])
    targetDate: date = Field(description="Fecha objetivo inmutable calculada al crear el ticket.", examples=["2026-11-30"], json_schema_extra={"maxLength": 10})
    dueDate: datetime | None = Field(description="Fecha compromiso del equipo o null.", examples=["2026-11-15T10:00:00Z", None], json_schema_extra={"maxLength": 35})
    createdAt: datetime = Field(description="Instante de creación del ticket.", examples=["2026-10-01T09:12:00Z"], json_schema_extra={"maxLength": 35})
    lastModified: datetime = Field(description="Instante de última modificación.", examples=["2026-10-20T15:40:00Z"], json_schema_extra={"maxLength": 35})

class TicketPage(BaseModel):
    data: list[Ticket] = Field(max_length=100, description="Tickets visibles de la página actual.", examples=[[]])
    pagination: "Pagination" = Field(description="Metadatos de paginación.")

class Pagination(BaseModel):
    offset: int = Field(ge=0, le=2_147_483_647, description="Elementos omitidos.", examples=[0])
    limit: int = Field(ge=1, le=100, description="Tamaño de página.", examples=[20])
    totalElements: int = Field(ge=0, le=2_147_483_647, description="Total visible que coincide.", examples=[134])

TicketPage.model_rebuild()

class DueDateUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    dueDate: datetime | None = Field(description="Fecha compromiso ISO 8601 o null para eliminarla.", examples=["2026-11-15T10:00:00Z", None], json_schema_extra={"maxLength": 35})

    @field_validator("dueDate")
    @classmethod
    def require_timezone(cls, value):
        if value is not None and (value.tzinfo is None or value.utcoffset() is None):
            raise ValueError("dueDate must include a timezone (RFC 3339)")
        return value

class CurrentUser(BaseModel):
    team: str = Field(min_length=1, max_length=100, description="Equipo al que pertenece el usuario.", examples=["Payments"])
    permissions: list[Annotated[str, Field(max_length=100)]] = Field(max_length=20, description="Permisos efectivos.", examples=[["tickets.read", "tickets.update"]])

class Problem(BaseModel):
    type: str = Field(default="about:blank", max_length=500, description="URI que identifica el tipo de problema.", examples=["about:blank"], json_schema_extra={"format": "uri"})
    title: str = Field(min_length=1, max_length=200, description="Resumen breve del problema.", examples=["Forbidden"])
    status: int = Field(ge=400, le=599, description="Código HTTP.", examples=[403])
    detail: str = Field(min_length=1, max_length=1000, description="Explicación del error.", examples=["Missing tickets.update permission"])
    instance: str | None = Field(default=None, max_length=500, description="Ruta que produjo el problema.", examples=["/api/v1/tickets/00000000-0000-0000-0000-000000000001"])
