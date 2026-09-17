import { expect, test } from "@playwright/test";

test("catalog filters persist in the URL and mobile admin keeps labeled navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /vestir ideias/i })).toBeVisible();
  await page.getByRole("button", { name: "Oversized" }).click();
  await expect(page).toHaveURL(/categoria=Oversized/);
  await page.getByPlaceholder("BUSCAR MODELO").fill("algodão");
  await expect(page).toHaveURL(/q=algod%C3%A3o/);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/produtos");
  await expect(page.getByRole("navigation", { name: "Administração" }).getByText("Pedidos")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();
});
