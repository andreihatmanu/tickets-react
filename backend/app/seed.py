from datetime import date, datetime, timedelta, timezone
from uuid import uuid4
from .models import Ticket

TEAMS = ["Payments", "Infrastructure", "Platform", "Data", "Mobile", "Security Champions"]
USERS = ["ana.garcia@example.com", "jdoe@example.com", "maria.lopez@example.com", "devops@example.com"]
ASSETS = ["payments-api", "customer-db", "None", "auth-service", "mobile-gateway", "k8s-prod"]
STATES = ["REPORTED", "IN_PROGRESS", "PENDING_SECURITY", "DONE"]
SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]


def build_seed() -> list[Ticket]:
    today = date.today()
    now = datetime.now(timezone.utc).replace(microsecond=0)
    tickets = []
    for i in range(60):
        state = STATES[i % len(STATES)]
        target = today + timedelta(days=((i % 19) - 9))
        assigned = TEAMS[(i + 1) % len(TEAMS)] if i % 7 else None
        tickets.append(Ticket(
            id=str(uuid4()),
            key=f"SEC-{1024 + i}",
            title=[
                "Log4j vulnerable version in payments-api",
                "Unpatched dependency detected",
                "Exposed administrative endpoint",
                "Weak TLS configuration",
                "Container image contains critical CVE",
                "Secrets detected in repository",
            ][i % 6],
            asset=ASSETS[i % len(ASSETS)],
            creatorTeam=TEAMS[i % len(TEAMS)],
            assignedTeam=assigned,
            assignee=USERS[i % len(USERS)],
            severity=SEVERITIES[i % len(SEVERITIES)],
            state=state,
            restricted=(i % 5 == 0),
            targetDate=target,
            dueDate=(today + timedelta(days=(i % 12 + 1))) if i % 3 == 0 else None,
            createdAt=now - timedelta(days=i + 3),
            lastModified=now - timedelta(hours=i * 5),
        ))

    # Ticket exclusivo para la prueba E2E.
    tickets.append(Ticket(
        id=str(uuid4()),
        key="SEC-1090",
        title="Ticket para prueba de actualización",
        asset="payments-api",
        creatorTeam="Payments",
        assignedTeam="Payments",
        assignee="ana.garcia@example.com",
        severity="HIGH",
        state="REPORTED",
        restricted=False,
        targetDate=today + timedelta(days=10),
        dueDate=None,
        createdAt=now,
        lastModified=now + timedelta(seconds=1),
    ))

    return tickets

TICKETS = build_seed()
