export function resolveSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  const candidate = configuredUrl || vercelUrl || "http://localhost:3000";
  const normalized = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
  try { return new URL(normalized); } catch { return new URL("http://localhost:3000"); }
}
