
import { test, expect } from "@playwright/test";

test("lead puede actualizar la fecha y el ticket pasa a En curso", async ({
    page,
}) => {
    await page.goto("/");

    await page.getByLabel("Perfil simulado").selectOption("lead");

    // Esperar a que se cargue el listado.
    const buttons = page.getByRole("button", {
        name: "Fijar fecha compromiso",
    });

    await expect
        .poll(async () => buttons.count(), { timeout: 10000 })
        .toBeGreaterThan(0);


    const editableRows = page
        .locator("tr")
        .filter({
            has: page.getByRole("button", {
                name: "Fijar fecha compromiso",
            }),
        });

    const count = await editableRows.count();

    console.log("Tickets editables:", count);

    const row = page
        .locator("tr")
        .filter({ hasText: "SEC-1090" })
        .first();

    await expect(row).toBeVisible();


    const key = await row.locator("strong").innerText();

    const dueDateInput = row.locator(
        'input[aria-label^="Fecha compromiso"]'
    );

    await dueDateInput.fill("2027-12-15");

    const saveButton = row.getByRole("button", {
        name: "Fijar fecha compromiso",
    });

    await expect(saveButton).toBeEnabled();

    const patchPromise = page.waitForResponse(
        (response) =>
            response.request().method() === "PATCH" &&
            response.url().includes("/api/v1/tickets/"),
        { timeout: 15000 }
    );

    await saveButton.click();

    const patchResponse = await patchPromise;

    console.log("PATCH status:", patchResponse.status());

    expect(patchResponse.status()).toBe(200);

    const updatedRow = page
        .locator("tr")
        .filter({ hasText: key });

    await expect(updatedRow).toContainText("En curso");
});
