const forcedDemoMode = process.env.NODE_ENV !== "production" && process.env.LAUS_SIT_DEMO_MODE === "1";

export const hasSupabaseEnv = !forcedDemoMode && Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const hasSupabaseSecretEnv = Boolean(process.env.SUPABASE_SECRET_KEY);
export const hasMercadoPagoEnv = Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN);
export const hasCheckoutEnv = hasSupabaseEnv && hasSupabaseSecretEnv && hasMercadoPagoEnv;
const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";
export const isDemoMode = !hasSupabaseEnv && (process.env.NODE_ENV !== "production" || isProductionBuild);
