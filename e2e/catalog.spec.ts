import { expect, test } from "@playwright/test";

test("catalog filters religions, prices from the cheapest model and exposes legal pages", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /vestir ideias/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cristianismo" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Matriz africana" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ocultismo e misticismo" })).toBeVisible();
  await expect(page.getByText(/A partir de R\$/).first()).toBeVisible();

  await page.goto("/produto/oversized-algodao-40-1");
  await expect(page.getByRole("heading", { name: "Modelagens e preços" })).toBeVisible();
  await expect(page.getByText("Tradicional", { exact: true })).toBeVisible();
  await expect(page.getByText("Baby Look", { exact: true })).toBeVisible();
  await expect(page.getByText("Oversized", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Termos de Uso" })).toBeVisible();

  await page.goto("/");
  await page.getByRole("button", { name: "Matriz africana" }).click();
  await expect(page).toHaveURL(/categoria=Matriz(?:%20|\+)africana/);
  await page.getByPlaceholder("BUSCAR PEÇA").fill("camiseta");
  await expect(page).toHaveURL(/q=camiseta/);

  await page.goto("/privacidade");
  await expect(page.getByRole("heading", { name: "Política de Privacidade" })).toBeVisible();
});

test("mobile catalog and admin remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Ocultismo e misticismo" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.goto("/admin/produtos");
  await expect(page.getByRole("navigation", { name: "Administração" }).getByText("Pedidos")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();
  await page.goto("/admin/produtos/novo");
  await expect(page.getByRole("group", { name: "Tradicional" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Baby Look" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Oversized" })).toBeVisible();
});
