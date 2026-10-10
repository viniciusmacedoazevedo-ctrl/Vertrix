import { expect, test } from "@playwright/test";

test("landing page presents the product and switches language", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Nenhum cliente esquecido");
  await expect(page.getByText("Ilustração da interface")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Perguntas frequentes" })).toBeVisible();
  await page.getByRole("button", { name: "EN" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("No forgotten customers");
  await page.getByRole("button", { name: "PT" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Nenhum cliente esquecido");
});

test("legal pages and auth pages render", async ({ page }) => {
  for (const path of ["/privacy", "/terms", "/login", "/signup", "/forgot-password"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
  }
});

test("protected routes redirect to login", async ({ page }) => {
  await page.goto("/app/customers");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fcustomers/);
});

test("forgot password never reveals whether an account exists", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.getByLabel("E-mail").fill("nobody@e2e.veltrix.local");
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(page.getByText(/Se houver uma conta com este e-mail/)).toBeVisible();
});
