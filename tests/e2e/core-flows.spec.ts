import { expect, test } from "@playwright/test";
import { createCustomer, PASSWORD, signUpAndOnboard } from "./helpers";

test.describe.configure({ mode: "serial" });

test("sign up, manage customers, opportunities and tasks; data persists and feeds the dashboard", async ({ page }) => {
  const email = await signUpAndOnboard(page, { name: "Marina Costa", company: "Costa Consultoria", modules: ["sales"] });

  // New account: real empty states, no fake numbers.
  await expect(page.getByText("Boas-vindas ao VELTRIX")).toBeVisible();
  await expect(page.getByRole("link", { name: /Clientes ativos/ })).toContainText("0");

  // Customer + duplicate e-mail handling.
  const customerId = await createCustomer(page, "Carlos Lima", "carlos@example.com");
  await expect(page.getByText("Cliente cadastrado.")).toBeVisible();
  await page.goto("/app/customers/new");
  await page.getByLabel("Nome", { exact: true }).fill("Carlos Duplicado");
  await page.getByLabel(/^E-mail/).fill("CARLOS@example.com");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Já existe um cliente ativo com este e-mail.")).toBeVisible();

  // Note on customer timeline.
  await page.goto(`/app/customers/${customerId}`);
  await page.getByLabel("Registrar observação").fill("Pediu orçamento de manutenção.");
  await page.getByRole("button", { name: "Adicionar observação" }).click();
  await expect(page.getByText("Pediu orçamento de manutenção.").last()).toBeVisible();

  // Opportunity with a follow-up due today.
  await page.goto(`/app/opportunities/new?customerId=${customerId}`);
  await page.getByLabel("Título").fill("Contrato de manutenção");
  await page.getByLabel(/Valor estimado/).fill("1.500,00");
  await page.getByLabel("Etapa").selectOption("proposal_sent");
  await page.getByLabel(/Data de acompanhamento/).fill(new Date().toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Salvar" }).click();
  await page.waitForURL(/\/app\/opportunities\/[0-9a-f-]{36}\?created=1/);
  await expect(page.getByText("Oportunidade criada.")).toBeVisible();

  // Task linked to the customer.
  await page.goto(`/app/tasks/new?customerId=${customerId}`);
  await page.getByLabel("Título").fill("Enviar proposta revisada");
  await page.getByLabel("Prioridade").selectOption("high");
  await page.getByRole("button", { name: "Salvar" }).click();
  await page.waitForURL(`**/app/customers/${customerId}`);
  await expect(page.getByRole("link", { name: "Enviar proposta revisada" })).toBeVisible();

  // Dashboard reflects real data after a full reload.
  await page.goto("/app");
  await page.reload();
  await expect(page.getByRole("link", { name: /Clientes ativos/ })).toContainText("1");
  await expect(page.getByRole("link", { name: /Oportunidades abertas/ })).toContainText("1");
  await expect(page.getByRole("link", { name: /Oportunidades abertas/ })).toContainText("R$");
  await expect(page.getByRole("link", { name: /Sem acompanhamento/ })).toContainText("1");
  await expect(page.getByRole("link", { name: /Contrato de manutenção/ }).first()).toBeVisible();

  // Complete the task from the dashboard and confirm it persisted.
  await page.getByRole("checkbox", { name: /Enviar proposta revisada/ }).click();
  await expect(page.getByRole("checkbox", { name: /Enviar proposta revisada/ })).toHaveAttribute("aria-checked", "true");
  await page.goto("/app/tasks?filter=done");
  await expect(page.getByRole("link", { name: "Enviar proposta revisada" })).toBeVisible();

  // Search and archive.
  await page.goto("/app/customers?q=carlos");
  await expect(page.getByRole("link", { name: "Carlos Lima" }).first()).toBeVisible();

  // Log out and back in: everything is still there.
  await page.getByRole("button", { name: "Sair" }).first().click();
  await page.waitForURL((u) => u.pathname === "/");
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/app$/);
  await page.goto(`/app/customers/${customerId}`);
  await expect(page.getByRole("heading", { name: "Carlos Lima" })).toBeVisible();
});

test("one company cannot open another company's records", async ({ browser }) => {
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await signUpAndOnboard(pageA, { name: "Alice Prado", company: "Empresa Alfa", modules: ["sales"] });
  const customerId = await createCustomer(pageA, "Cliente Confidencial");

  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await signUpAndOnboard(pageB, { name: "Bruno Reis", company: "Empresa Beta", modules: ["sales"] });
  const res = await pageB.goto(`/app/customers/${customerId}`);
  expect(res?.status()).toBe(404);
  await expect(pageB.getByText("Cliente Confidencial")).toHaveCount(0);
  await pageB.goto("/app/customers");
  await expect(pageB.getByText("Nenhum cliente ainda")).toBeVisible();
  const csv = await pageB.request.get("/api/export/customers?period=30d");
  expect(await csv.text()).not.toContain("Cliente Confidencial");

  await ctxA.close();
  await ctxB.close();
});

test("assistant explains how to enable it when no AI key is configured", async ({ page }) => {
  test.skip(Boolean(process.env.ANTHROPIC_API_KEY), "AI key configured in this environment");
  await signUpAndOnboard(page, { name: "Iara Melo", company: "Iara Agência", modules: ["sales"] });
  await page.goto("/app/assistant");
  await expect(page.getByText("Assistente não configurado")).toBeVisible();
  await expect(page.getByText(/ANTHROPIC_API_KEY/).first()).toBeVisible();
});
