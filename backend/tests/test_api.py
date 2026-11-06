from fastapi.testclient import TestClient
from app.main import app
from app.seed import TICKETS

client = TestClient(app)
DEV = {"X-User-Team": "Payments", "X-User-Permissions": "tickets.read"}
LEAD = {"X-User-Team": "Payments", "X-User-Permissions": "tickets.read,tickets.update"}
SEC = {"X-User-Team": "Security Champions", "X-User-Permissions": "tickets.read,tickets.update,tickets.read.all"}

def test_seed_has_at_least_50_varied_tickets():
    assert len(TICKETS) >= 50
    assert {t.state for t in TICKETS} == {"REPORTED", "IN_PROGRESS", "PENDING_SECURITY", "DONE"}
    assert {t.severity for t in TICKETS} == {"CRITICAL", "HIGH", "MEDIUM", "LOW"}
    assert any(t.restricted for t in TICKETS)
    assert any(t.asset == "None" for t in TICKETS)
    assert any(t.targetDate < __import__("datetime").date.today() and t.state != "DONE" for t in TICKETS)

def test_list_returns_contract_shape():
    response = client.get("/api/v1/tickets", headers=DEV)
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"data", "pagination"}
    assert body["pagination"]["limit"] == 20

def test_restricted_ticket_is_hidden_from_unrelated_team():
    restricted = next(t for t in TICKETS if t.restricted and t.creatorTeam != "Payments" and t.assignedTeam != "Payments")
    response = client.get("/api/v1/tickets?q=" + restricted.key, headers=DEV)
    assert response.status_code == 200
    assert response.json()["pagination"]["totalElements"] == 0

def test_read_all_sees_restricted_ticket():
    restricted = next(t for t in TICKETS if t.restricted)
    response = client.get("/api/v1/tickets?q=" + restricted.key, headers=SEC)
    assert response.status_code == 200
    assert response.json()["pagination"]["totalElements"] == 1

def test_developer_cannot_update_due_date():
    ticket = next(t for t in TICKETS if t.state != "DONE")
    response = client.patch(f"/api/v1/tickets/{ticket.id}", headers=DEV, json={"dueDate": "2026-11-15"})
    assert response.status_code == 403
    assert response.headers["content-type"].startswith("application/problem+json")

def test_reported_ticket_moves_to_in_progress():
    ticket = next(t for t in TICKETS if t.state == "REPORTED" and (not t.restricted or "Payments" in {t.creatorTeam, t.assignedTeam}))
    response = client.patch(f"/api/v1/tickets/{ticket.id}", headers=LEAD, json={"dueDate": "2026-11-15"})
    assert response.status_code == 200
    assert response.json()["state"] == "IN_PROGRESS"

def test_done_ticket_returns_conflict():
    ticket = next(t for t in TICKETS if t.state == "DONE" and not t.restricted)
    response = client.patch(f"/api/v1/tickets/{ticket.id}", headers=LEAD, json={"dueDate": "2026-11-15"})
    assert response.status_code == 409

def test_invalid_query_returns_problem_details():
    response = client.get("/api/v1/tickets?limit=101", headers=DEV)
    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["status"] == 422


def test_read_requires_permission():
    response = client.get("/api/v1/tickets", headers={"X-User-Team": "Payments", "X-User-Permissions": ""})
    assert response.status_code == 403
    assert response.headers["content-type"].startswith("application/problem+json")

def test_due_date_requires_date_format():
    ticket = next(t for t in TICKETS if t.state != "DONE" and not t.restricted)
    response = client.patch(
        f"/api/v1/tickets/{ticket.id}",
        headers=LEAD,
        json={"dueDate": "2026-11-15T10:00:00Z"},
    )
    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")


def test_get_ticket_returns_visible_ticket():
    ticket = next(t for t in TICKETS if not t.restricted or t.creatorTeam == "Payments" or t.assignedTeam == "Payments")
    response = client.get(f"/api/v1/tickets/{ticket.id}", headers=DEV)
    assert response.status_code == 200
    assert response.json()["id"] == str(ticket.id)

def test_get_ticket_hides_restricted_ticket():
    ticket = next(t for t in TICKETS if t.restricted and t.creatorTeam != "Payments" and t.assignedTeam != "Payments")
    assert client.get(f"/api/v1/tickets/{ticket.id}", headers=DEV).status_code == 404

def test_assigned_team_filter_and_stable_sort():
    first = client.get("/api/v1/tickets?assignedTeam=Payments&sort=KEY&direction=ASC", headers=DEV).json()
    second = client.get("/api/v1/tickets?assignedTeam=Payments&sort=KEY&direction=ASC", headers=DEV).json()
    assert first == second
    assert all(row["assignedTeam"] == "Payments" for row in first["data"])

def test_expired_only_excludes_done():
    body = client.get("/api/v1/tickets?expiredOnly=true", headers=DEV).json()
    from datetime import date
    assert all(row["state"] != "DONE" and row["targetDate"] < date.today().isoformat() for row in body["data"])

def test_due_date_in_past_returns_422():
    ticket = next(t for t in TICKETS if t.state != "DONE" and (not t.restricted or t.creatorTeam == "Payments" or t.assignedTeam == "Payments"))
    response = client.patch(f"/api/v1/tickets/{ticket.id}", headers=LEAD, json={"dueDate": "2000-01-01"})
    assert response.status_code == 422
