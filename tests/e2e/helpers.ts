import { expect, type Page } from "@playwright/test";

export function uniqueEmail(label: string) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@e2e.veltrix.local`;
}

export const PASSWORD = "Senha12345";

/** Signs up and completes onboarding. Requires e-mail confirmation disabled in the test project. */
export async function signUpAndOnboard(page: Page, opts: { name: string; company: string; modules: ("sales" | "scheduling")[] }) {
  const email = uniqueEmail(opts.name.split(" ")[0]!.toLowerCase());
  await page.goto("/signup");
  await page.getByLabel("Nome completo").fill(opts.name);
  await page.getByLabel("E-mail profissional").fill(email);
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.locator('input[name="acceptTerms"]').check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.waitForURL("**/onboarding");
  await page.getByLabel("Nome da empresa").fill(opts.company);
  for (const m of ["sales", "scheduling"] as const) {
    const box = page.locator(`input[name="modules"][value="${m}"]`);
    if (opts.modules.includes(m)) await box.check();
    else await box.uncheck();
  }
  await page.getByRole("button", { name: /Criar empresa/ }).click();
  await page.waitForURL(/\/app$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(opts.name.split(" ")[0]!);
  return email;
}

export async function createCustomer(page: Page, name: string, email?: string) {
  await page.goto("/app/customers/new");
  await page.getByLabel("Nome", { exact: true }).fill(name);
  if (email) await page.getByLabel(/^E-mail/).fill(email);
  await page.getByRole("button", { name: "Salvar" }).click();
  await page.waitForURL(/\/app\/customers\/[0-9a-f-]{36}\?created=1/);
  return page.url().split("/").pop()!.split("?")[0]!;
}
