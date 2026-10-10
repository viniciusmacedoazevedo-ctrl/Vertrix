import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

/**
 * Hosts allowed to submit Server Actions when the app sits behind a proxy whose
 * public host differs from the forwarded one (GitHub Codespaces, some PaaS).
 */
function allowedActionOrigins(): string[] {
  const origins = new Set<string>();
  for (const value of (process.env.SERVER_ACTIONS_ALLOWED_ORIGINS ?? "").split(",")) {
    if (value.trim()) origins.add(value.trim());
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    try {
      origins.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).host);
    } catch {
      // ignored: validated at runtime by src/lib/env.ts
    }
  }
  if (process.env.CODESPACE_NAME && process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN) {
    origins.add(`${process.env.CODESPACE_NAME}-3000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`);
    origins.add("localhost:3000");
  }
  return [...origins];
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // The Anthropic SDK is only used on the server.
  serverExternalPackages: ["@anthropic-ai/sdk"],
  experimental: {
    serverActions: { allowedOrigins: allowedActionOrigins() },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
