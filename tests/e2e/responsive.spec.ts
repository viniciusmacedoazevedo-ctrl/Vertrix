import { expect, test } from "@playwright/test";
import { signUpAndOnboard } from "./helpers";

test("mobile: landing and app navigation work without horizontal overflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await signUpAndOnboard(page, { name: "Lia Mobile", company: "Lia Studio", modules: ["sales", "scheduling"] });
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Clientes" }).click();
  await expect(page).toHaveURL(/\/app\/customers$/);
  const appOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(appOverflow).toBeLessThanOrEqual(1);
});
