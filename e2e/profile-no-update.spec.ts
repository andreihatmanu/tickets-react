import { test, expect } from "@playwright/test";

test("developer no ve la acción de fijar fecha compromiso", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Perfil simulado").selectOption("developer");

  await expect(
    page.getByRole("button", { name: "Fijar fecha compromiso" })
  ).toHaveCount(0);
});