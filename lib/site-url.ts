export function resolveSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  const candidate = configuredUrl || vercelUrl || (process.env.NODE_ENV === "production" ? "https://laussit.vercel.app" : "http://localhost:3000");
  const normalized = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
  try { return new URL(normalized); } catch { return new URL(process.env.NODE_ENV === "production" ? "https://laussit.vercel.app" : "http://localhost:3000"); }
}
