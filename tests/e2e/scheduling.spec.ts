import { expect, test } from "@playwright/test";
import { createCustomer, signUpAndOnboard } from "./helpers";

test("set up services, staff and hours, book internally and through the public page", async ({ page, browser }) => {
  await signUpAndOnboard(page, { name: "Rafael Souza", company: `Barbearia Central ${Date.now()}`, modules: ["scheduling"] });

  // Scheduling-only companies don't see the sales module.
  await expect(page.getByRole("link", { name: "Oportunidades" })).toHaveCount(0);
  await page.goto("/app/schedule");
  await expect(page.getByText("Configure sua agenda")).toBeVisible();

  // Service.
  await page.goto("/app/schedule/services/new");
  await page.getByLabel("Nome").fill("Corte de cabelo");
  await page.getByLabel("Duração (minutos)").fill("30");
  await page.getByLabel(/Preço/).fill("45,00");
  await page.getByRole("button", { name: "Salvar" }).click();
  await page.waitForURL("**/app/schedule/services");
  await expect(page.getByText("Corte de cabelo")).toBeVisible();

  // Professional + working hours every day 09–12 and 13–18.
  await page.goto("/app/schedule/professionals/new");
  await page.getByLabel("Nome").fill("Rafa");
  await page.getByRole("button", { name: "Salvar" }).click();
  await page.waitForURL(/\/app\/schedule\/professionals\/[0-9a-f-]{36}\?created=1/);
  for (let i = 0; i < 7; i++) {
    const day = page.locator("li").filter({ has: page.getByRole("button", { name: "Adicionar intervalo" }) }).nth(i);
    await day.getByRole("button", { name: "Adicionar intervalo" }).click();
    const times = day.locator('input[type="time"]');
    await times.nth(0).fill("09:00");
    await times.nth(1).fill("12:00");
    await day.getByRole("button", { name: "Adicionar intervalo" }).click();
    await times.nth(2).fill("13:00");
    await times.nth(3).fill("18:00");
  }
  await page.getByRole("button", { name: "Salvar horários" }).click();
  await expect(page.getByText("Horários salvos.")).toBeVisible();

  // Internal appointment using a suggested slot (tomorrow).
  await createCustomer(page, "Ana Cliente", "ana@example.com");
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  await page.goto(`/app/schedule/appointments/new?date=${tomorrow}`);
  await page.getByLabel("Cliente").selectOption({ label: "Ana Cliente" });
  await page.getByRole("option", { name: /^0?9:00$/ }).first().click();
  await page.getByRole("button", { name: "Salvar" }).click();
  await page.waitForURL(/\/app\/schedule\/appointments\/[0-9a-f-]{36}\?created=1/);
  await expect(page.getByRole("status").filter({ hasText: "Agendamento criado." })).toBeVisible();

  // Double booking through the UI is refused.
  await page.goto(`/app/schedule/appointments/new?date=${tomorrow}`);
  await page.getByLabel("Cliente").selectOption({ label: "Ana Cliente" });
  await page.locator('input[name="time"]').fill("09:15");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText(/conflita com outro agendamento/)).toBeVisible();

  // Enable public booking.
  await page.goto("/app/schedule/booking");
  await page.getByLabel("Página de agendamento ativa").check();
  await page.getByLabel("Antecedência mínima (minutos)").fill("0");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Configurações de agendamento salvas.")).toBeVisible();
  await page.reload();
  const link = await page.locator("code").textContent();
  const slug = link!.split("/book/")[1]!;

  // Anonymous visitor books.
  const visitor = await browser.newContext();
  const vp = await visitor.newPage();
  await vp.goto(`/book/${slug}`);
  await expect(vp.getByRole("heading", { level: 1 })).toContainText("Barbearia Central");
  await vp.getByRole("button", { name: /Corte de cabelo/ }).click();
  const dayButtons = vp.locator('section[aria-labelledby="step-time"] button[aria-pressed]');
  await dayButtons.nth(1).click(); // tomorrow
  const firstSlot = vp.getByRole("option").first();
  await expect(firstSlot).toBeVisible();
  // 09:00 is taken by the internal appointment, so the first free slot is later.
  await expect(vp.getByRole("option", { name: /^0?9:00$/ })).toHaveCount(0);
  await firstSlot.click();
  await vp.getByLabel("Nome completo").fill("Visitante Teste");
  await vp.getByLabel("E-mail").fill("visitante@example.com");
  await vp.locator('input[name="consent"]').check();
  await vp.getByRole("button", { name: "Confirmar agendamento" }).click();
  await expect(vp.getByText("Agendamento registrado!")).toBeVisible();
  await visitor.close();

  // Owner sees it in the calendar and the customer was created from the booking page.
  await page.goto(`/app/schedule?view=day&date=${tomorrow}`);
  await expect(page.getByRole("link", { name: /Visitante Teste/ })).toBeVisible();
  await page.goto("/app/customers?source=booking_page");
  await expect(page.getByRole("link", { name: "Visitante Teste" }).first()).toBeVisible();
});
