from copy import deepcopy
from datetime import date, timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.seed import build_seed
from app import bootstrap

client = TestClient(app)

DEV = {
    "X-User-Team": "Payments",
    "X-User-Permissions": "tickets.read",
}
LEAD = {
    "X-User-Team": "Payments",
    "X-User-Permissions": "tickets.read,tickets.update",
}
SECURITY = {
    "X-User-Team": "Security Champions",
    "X-User-Permissions": "tickets.read,tickets.update,tickets.read.all",
}
NO_PERMISSIONS = {
    "X-User-Team": "Payments",
    "X-User-Permissions": "",
}


@pytest.fixture(autouse=True)
def reset_repository():
    """Aísla cada test: evita que un PATCH modifique el seed de otros tests."""
    original = bootstrap.repository._tickets
    bootstrap.repository._tickets = {
        ticket.id: deepcopy(ticket) for ticket in build_seed()
    }
    yield
    bootstrap.repository._tickets = original


def visible_to_payments(ticket):
    return (
        not ticket.restricted
        or ticket.creatorTeam == "Payments"
        or ticket.assignedTeam == "Payments"
    )


def problem_response(response, status_code):
    assert response.status_code == status_code
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["status"] == status_code


def test_get_me_returns_team_and_permissions_from_headers():
    response = client.get("/api/v1/me", headers=LEAD)

    assert response.status_code == 200
    assert response.json() == {
        "team": "Payments",
        "permissions": ["tickets.read", "tickets.update"],
    }


def test_list_returns_paginated_contract_shape():
    response = client.get("/api/v1/tickets", headers=DEV)

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"data", "pagination"}
    assert set(body["pagination"]) == {"offset", "limit", "totalElements"}
    assert body["pagination"]["offset"] == 0
    assert body["pagination"]["limit"] == 20
    assert len(body["data"]) <= 20
    assert body["pagination"]["totalElements"] >= len(body["data"])


def test_list_requires_read_permission():
    problem_response(client.get("/api/v1/tickets", headers=NO_PERMISSIONS), 403)


def test_list_counts_only_tickets_visible_to_user():
    response = client.get("/api/v1/tickets?limit=100", headers=DEV)
    expected = sum(visible_to_payments(ticket) for ticket in bootstrap.repository.list_all())

    assert response.status_code == 200
    assert response.json()["pagination"]["totalElements"] == expected


def test_restricted_ticket_is_not_in_list_for_unrelated_team():
    ticket = next(
        ticket for ticket in bootstrap.repository.list_all()
        if ticket.restricted
        and ticket.creatorTeam != "Payments"
        and ticket.assignedTeam != "Payments"
    )

    response = client.get(f"/api/v1/tickets?q={ticket.key}", headers=DEV)

    assert response.status_code == 200
    assert response.json()["pagination"]["totalElements"] == 0
    assert response.json()["data"] == []


def test_read_all_can_see_restricted_ticket():
    ticket = next(ticket for ticket in bootstrap.repository.list_all() if ticket.restricted)

    response = client.get(f"/api/v1/tickets?q={ticket.key}", headers=SECURITY)

    assert response.status_code == 200
    assert response.json()["pagination"]["totalElements"] == 1
    assert response.json()["data"][0]["id"] == str(ticket.id)


def test_get_ticket_returns_visible_ticket():
    ticket = next(ticket for ticket in bootstrap.repository.list_all() if visible_to_payments(ticket))

    response = client.get(f"/api/v1/tickets/{ticket.id}", headers=DEV)

    assert response.status_code == 200
    assert response.json()["id"] == str(ticket.id)


def test_get_ticket_returns_404_for_unknown_id():
    problem_response(client.get(f"/api/v1/tickets/{uuid4()}", headers=DEV), 404)


def test_get_ticket_returns_404_for_ticket_not_visible_to_user():
    ticket = next(
        ticket for ticket in bootstrap.repository.list_all()
        if ticket.restricted
        and ticket.creatorTeam != "Payments"
        and ticket.assignedTeam != "Payments"
    )

    problem_response(client.get(f"/api/v1/tickets/{ticket.id}", headers=DEV), 404)


def test_get_ticket_requires_read_permission():
    ticket = next(iter(bootstrap.repository.list_all()))
    problem_response(client.get(f"/api/v1/tickets/{ticket.id}", headers=NO_PERMISSIONS), 403)


def test_patch_without_update_permission_returns_403():
    ticket = next(ticket for ticket in bootstrap.repository.list_all() if ticket.state != "DONE")

    problem_response(
        client.patch(
            f"/api/v1/tickets/{ticket.id}",
            headers=DEV,
            json={"dueDate": (date.today() + timedelta(days=5)).isoformat()},
        ),
        403,
    )


def test_patch_unknown_ticket_returns_404():
    problem_response(
        client.patch(
            f"/api/v1/tickets/{uuid4()}",
            headers=LEAD,
            json={"dueDate": (date.today() + timedelta(days=5)).isoformat()},
        ),
        404,
    )


def test_patch_ticket_not_visible_returns_404():
    ticket = next(
        ticket for ticket in bootstrap.repository.list_all()
        if ticket.restricted
        and ticket.creatorTeam != "Payments"
        and ticket.assignedTeam != "Payments"
        and ticket.state != "DONE"
    )

    problem_response(
        client.patch(
            f"/api/v1/tickets/{ticket.id}",
            headers=LEAD,
            json={"dueDate": (date.today() + timedelta(days=5)).isoformat()},
        ),
        404,
    )


def test_patch_done_ticket_returns_409():
    ticket = next(
        ticket for ticket in bootstrap.repository.list_all()
        if ticket.state == "DONE" and visible_to_payments(ticket)
    )

    problem_response(
        client.patch(
            f"/api/v1/tickets/{ticket.id}",
            headers=LEAD,
            json={"dueDate": (date.today() + timedelta(days=5)).isoformat()},
        ),
        409,
    )


def test_patch_due_date_in_past_returns_422():
    ticket = next(
        ticket for ticket in bootstrap.repository.list_all()
        if ticket.state != "DONE" and visible_to_payments(ticket)
    )

    problem_response(
        client.patch(
            f"/api/v1/tickets/{ticket.id}",
            headers=LEAD,
            json={"dueDate": "2000-01-01"},
        ),
        422,
    )


def test_patch_rejects_datetime_when_date_is_required():
    ticket = next(
        ticket for ticket in bootstrap.repository.list_all()
        if ticket.state != "DONE" and visible_to_payments(ticket)
    )

    problem_response(
        client.patch(
            f"/api/v1/tickets/{ticket.id}",
            headers=LEAD,
            json={"dueDate": "2030-11-15T10:00:00Z"},
        ),
        422,
    )


def test_patch_reported_ticket_sets_due_date_and_moves_to_in_progress():
    ticket = next(
        ticket for ticket in bootstrap.repository.list_all()
        if ticket.state == "REPORTED" and visible_to_payments(ticket)
    )
    due_date = date.today() + timedelta(days=10)
    old_modified = ticket.lastModified

    response = client.patch(
        f"/api/v1/tickets/{ticket.id}",
        headers=LEAD,
        json={"dueDate": due_date.isoformat()},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["dueDate"] == due_date.isoformat()
    assert body["state"] == "IN_PROGRESS"
    assert body["lastModified"] != old_modified.isoformat()


def test_patch_rejects_unexpected_body_properties():
    ticket = next(
        ticket for ticket in bootstrap.repository.list_all()
        if ticket.state != "DONE" and visible_to_payments(ticket)
    )

    problem_response(
        client.patch(
            f"/api/v1/tickets/{ticket.id}",
            headers=LEAD,
            json={
                "dueDate": (date.today() + timedelta(days=5)).isoformat(),
                "state": "DONE",
            },
        ),
        422,
    )


def test_assigned_team_filter_returns_only_matching_tickets():
    response = client.get("/api/v1/tickets?assignedTeam=Payments&limit=100", headers=DEV)

    assert response.status_code == 200
    assert all(ticket["assignedTeam"] == "Payments" for ticket in response.json()["data"])


def test_expired_only_returns_expired_non_done_tickets():
    response = client.get("/api/v1/tickets?expiredOnly=true&limit=100", headers=DEV)

    assert response.status_code == 200
    assert all(
        ticket["state"] != "DONE" and ticket["targetDate"] < date.today().isoformat()
        for ticket in response.json()["data"]
    )


def test_expired_only_false_does_not_filter_expired_tickets():
    all_response = client.get("/api/v1/tickets?limit=100", headers=DEV)
    false_response = client.get("/api/v1/tickets?expiredOnly=false&limit=100", headers=DEV)

    assert false_response.status_code == 200
    assert false_response.json() == all_response.json()


def test_search_is_case_insensitive_and_searches_key_title_and_asset():
    ticket = next(ticket for ticket in bootstrap.repository.list_all() if visible_to_payments(ticket))

    for field_value in (ticket.key, ticket.title, ticket.asset):
        if field_value == "None":
            continue
        response = client.get(
            f"/api/v1/tickets?q={field_value.swapcase()}", headers=DEV
        )
        assert response.status_code == 200
        assert any(row["id"] == str(ticket.id) for row in response.json()["data"])


def test_search_accepts_256_characters():
    response = client.get(f"/api/v1/tickets?q={'x' * 256}", headers=DEV)
    assert response.status_code == 200


def test_search_rejects_more_than_256_characters():
    problem_response(
        client.get(f"/api/v1/tickets?q={'x' * 257}", headers=DEV), 422
    )


@pytest.mark.parametrize("sort", ["KEY", "SEVERITY", "STATE", "TARGET_DATE", "LAST_MODIFIED"])
@pytest.mark.parametrize("direction", ["ASC", "DESC"])
def test_each_sort_option_is_deterministic(sort, direction):
    url = f"/api/v1/tickets?limit=100&sort={sort}&direction={direction}"

    first = client.get(url, headers=DEV)
    second = client.get(url, headers=DEV)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == second.json()


def test_pagination_has_no_duplicate_tickets_between_pages():
    first = client.get("/api/v1/tickets?offset=0&limit=10&sort=KEY&direction=ASC", headers=DEV)
    second = client.get("/api/v1/tickets?offset=10&limit=10&sort=KEY&direction=ASC", headers=DEV)

    assert first.status_code == second.status_code == 200
    first_ids = [ticket["id"] for ticket in first.json()["data"]]
    second_ids = [ticket["id"] for ticket in second.json()["data"]]
    assert set(first_ids).isdisjoint(second_ids)


def test_invalid_list_parameters_return_422():
    invalid_urls = [
        "/api/v1/tickets?offset=-1",
        "/api/v1/tickets?limit=0",
        "/api/v1/tickets?limit=101",
        "/api/v1/tickets?state=UNKNOWN",
        "/api/v1/tickets?severity=UNKNOWN",
        "/api/v1/tickets?sort=UNKNOWN",
        "/api/v1/tickets?direction=SIDEWAYS",
        "/api/v1/tickets?expiredOnly=not-a-boolean",
        "/api/v1/tickets?assignedTeam=",
    ]

    for url in invalid_urls:
        problem_response(client.get(url, headers=DEV), 422)


def test_invalid_ticket_uuid_returns_422():
    problem_response(client.get("/api/v1/tickets/not-a-uuid", headers=DEV), 422)
