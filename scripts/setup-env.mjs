#!/usr/bin/env node
/**
 * Writes .env.local from a running local Supabase stack (`npx supabase start`).
 * Detects GitHub Codespaces and uses the forwarded public URL for the site.
 * Existing optional values (ANTHROPIC_API_KEY, AI_MODEL, ...) are preserved.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

let status;
try {
  status = execSync("npx --yes supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
} catch {
  console.error("Could not read Supabase status. Run `npx supabase start` first (Docker must be running).");
  process.exit(1);
}

const vars = Object.fromEntries(
  status
    .split("\n")
    .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);
const apiUrl = vars.API_URL;
const anonKey = vars.ANON_KEY ?? vars.PUBLISHABLE_KEY;
if (!apiUrl || !anonKey) {
  console.error("Supabase status did not include API_URL/ANON_KEY. Is the stack running?");
  process.exit(1);
}

const codespace =
  process.env.CODESPACE_NAME && process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
    ? `https://${process.env.CODESPACE_NAME}-3000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
    : null;

const current = existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "";
const keep = current
  .split("\n")
  .filter((l) => l.trim() && !/^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|NEXT_PUBLIC_SITE_URL)=/.test(l));

const lines = [
  `NEXT_PUBLIC_SITE_URL=${codespace ?? "http://localhost:3000"}`,
  `NEXT_PUBLIC_SUPABASE_URL=${apiUrl}`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
  ...keep,
];
writeFileSync(".env.local", `${lines.join("\n")}\n`);
console.info(`.env.local written (site: ${codespace ?? "http://localhost:3000"}, supabase: ${apiUrl}). Restart \`npm run dev\`.`);
