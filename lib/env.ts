export const hasSupabaseEnv = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const hasSupabaseSecretEnv = Boolean(process.env.SUPABASE_SECRET_KEY);
export const hasMercadoPagoEnv = Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN);
export const hasCheckoutEnv = hasSupabaseEnv && hasSupabaseSecretEnv && hasMercadoPagoEnv;
export const isDemoMode = !hasSupabaseEnv;
