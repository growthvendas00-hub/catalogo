import "server-only";
import { redirect } from "next/navigation";
import { hasSupabaseEnv, isDemoMode } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  if (isDemoMode) return { id: "demo-admin", email: "demo@laus-sit.local" };
  if (!hasSupabaseEnv) throw new Error("Supabase não configurado em produção.");

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) redirect("/admin/login?erro=sem-acesso");
  return user;
}

export async function requireSeller() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/vendedor/login");
  const { data: profile } = await supabase.from("seller_profiles").select("user_id,name,whatsapp,email,active").eq("user_id", user.id).eq("active", true).maybeSingle();
  if (!profile) redirect("/vendedor/login?erro=sem-acesso");
  return { user, profile };
}
