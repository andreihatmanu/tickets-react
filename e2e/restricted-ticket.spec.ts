import { test, expect } from "@playwright/test";

const api = "http://127.0.0.1:3001";

const headers = (team: string, permissions: string) => ({
  "X-User-Team": team,
  "X-User-Permissions": permissions,
});

test("ticket restringido de otro equipo no aparece y su detalle devuelve 404", async ({
  page,
  request,
}) => {
  const response = await request.get(
    `${api}/api/v1/tickets?offset=0&limit=100`,
    {
      headers: headers(
        "Security Champions",
        "tickets.read,tickets.read.all,tickets.update"
      ),
    }
  );

  expect(response.ok()).toBeTruthy();

  const data = await response.json();

  const restricted = data.data.find(
    (ticket: {
      id: string;
      key: string;
      restricted: boolean;
      creatorTeam: string;
      assignedTeam: string | null;
    }) =>
      ticket.restricted &&
      ticket.creatorTeam !== "Payments" &&
      ticket.assignedTeam !== "Payments"
  );

  test.skip(!restricted, "No hay ticket restringido de otro equipo en el seed");

  await page.goto("/");
  await page.getByLabel("Perfil simulado").selectOption("developer");

  await expect(page.getByText(restricted.key)).toHaveCount(0);

  const detailResponse = await request.get(
    `${api}/api/v1/tickets/${restricted.id}`,
    {
      headers: headers("Payments", "tickets.read"),
    }
  );

  expect(detailResponse.status()).toBe(404);
});