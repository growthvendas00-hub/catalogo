"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import { slugify } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ActionState = { ok: boolean; message: string; fieldErrors?: Record<string, string[]> };

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Informe o nome da peça."),
  slug: z.string().trim().min(2, "Informe o slug."),
  category: z.enum(["Baby Look", "Tradicional", "Oversized"]),
  price: z.coerce.number().nonnegative("Informe um preço válido."),
  promotionalPrice: z.union([z.literal(""), z.coerce.number().nonnegative()]).optional(),
  shortDescription: z.string().trim().min(5, "Escreva uma descrição curta."),
  description: z.string().trim().min(5, "Escreva a descrição completa."),
  active: z.boolean(),
  sortOrder: z.coerce.number().int().nonnegative(),
  mainImageUrl: z.string().trim().min(1, "Informe a imagem principal."),
  mainImageAlt: z.string().trim().min(2, "Informe o texto alternativo."),
  fabric: z.string().trim(), composition: z.string().trim(), threadType: z.string().trim(),
  gsm: z.string().trim(), fit: z.string().trim(), printingMethod: z.string().trim(),
  finish: z.string().trim(), technicalNotes: z.string().trim(), careInstructions: z.string().trim(), observations: z.string().trim(),
  sizes: z.array(z.string()),
  colors: z.array(z.object({ name: z.string().min(1), hex: z.string().nullable().optional() })),
  measurements: z.array(z.object({ size: z.string().min(1), width: z.coerce.number().nonnegative(), length: z.coerce.number().nonnegative(), extra: z.record(z.string(), z.union([z.string(), z.number()])).optional() })),
  images: z.array(z.object({ url: z.string().min(1), alt: z.string(), sortOrder: z.number().optional() })),
}).superRefine((value, context) => {
  if (value.active && value.price < 0.5) context.addIssue({ code: "custom", path: ["price"], message: "Produto ativo precisa custar ao menos R$ 0,50." });
  if (value.active && value.promotionalPrice !== "" && Number(value.promotionalPrice) < 0.5) context.addIssue({ code: "custom", path: ["promotionalPrice"], message: "Promoção ativa precisa custar ao menos R$ 0,50." });
});

function jsonField<T>(formData: FormData, name: string, fallback: T): T {
  try { return JSON.parse(String(formData.get(name) ?? "")) as T; } catch { return fallback; }
}

export async function loginAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv) redirect("/admin/produtos");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: "E-mail ou senha inválidos." };
  const { data: { user } } = await supabase.auth.getUser();
  const { data: admin } = await supabase.from("admin_profiles").select("user_id").eq("user_id", user!.id).maybeSingle();
  if (!admin) { await supabase.auth.signOut(); return { ok: false, message: "Este usuário não possui acesso administrativo." }; }
  redirect("/admin/produtos");
}

export async function logoutAction() {
  if (hasSupabaseEnv) { const supabase = await createSupabaseServerClient(); await supabase.auth.signOut(); }
  redirect("/admin/login");
}

export async function saveProductAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const candidate = {
    id: String(formData.get("id") ?? "") || undefined,
    name: String(formData.get("name") ?? ""),
    slug: slugify(String(formData.get("slug") || formData.get("name") || "")),
    category: formData.get("category"),
    price: formData.get("price"),
    promotionalPrice: formData.get("promotionalPrice") ?? "",
    shortDescription: String(formData.get("shortDescription") ?? ""),
    description: String(formData.get("description") ?? ""),
    active: formData.get("active") === "on",
    sortOrder: formData.get("sortOrder") ?? 0,
    mainImageUrl: String(formData.get("mainImageUrl") ?? ""),
    mainImageAlt: String(formData.get("mainImageAlt") ?? ""),
    fabric: String(formData.get("fabric") ?? ""), composition: String(formData.get("composition") ?? ""), threadType: String(formData.get("threadType") ?? ""),
    gsm: String(formData.get("gsm") ?? ""), fit: String(formData.get("fit") ?? ""), printingMethod: String(formData.get("printingMethod") ?? ""), finish: String(formData.get("finish") ?? ""), technicalNotes: String(formData.get("technicalNotes") ?? ""), careInstructions: String(formData.get("careInstructions") ?? ""), observations: String(formData.get("observations") ?? ""),
    sizes: jsonField<string[]>(formData, "sizesJson", []),
    colors: jsonField(formData, "colorsJson", []),
    measurements: jsonField(formData, "measurementsJson", []),
    images: jsonField(formData, "imagesJson", []),
  };
  const parsed = productSchema.safeParse(candidate);
  if (!parsed.success) return { ok: false, message: "Revise os campos destacados e tente novamente.", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  if (!hasSupabaseEnv) return { ok: true, message: "Produto validado no modo demonstração. Alterações não são persistidas." };

  const data = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("save_product_with_relations", { p_product: data });
  if (error) return { ok: false, message: `Não foi possível salvar o produto e seus detalhes: ${error.message}` };
  revalidatePath("/"); revalidatePath("/admin/produtos"); revalidatePath(`/produto/${data.slug}`);
  return { ok: true, message: "Produto salvo." };
}

export async function deleteProductAction(id: string): Promise<ActionState> {
  await requireAdmin();
  if (!hasSupabaseEnv) return { ok: true, message: "Exclusão simulada. O catálogo demo permanece intacto." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error?.code === "23503") return { ok: false, message: "Esta peça já possui pedidos. Desative-a para preservar o histórico." };
  if (error) return { ok: false, message: "Não foi possível excluir a peça." };
  revalidatePath("/"); revalidatePath("/admin/produtos");
  return { ok: true, message: "Peça excluída." };
}

export async function toggleProductAction(id: string, active: boolean): Promise<ActionState> {
  await requireAdmin();
  if (!hasSupabaseEnv) return { ok: true, message: `${active ? "Ativação" : "Desativação"} simulada no modo demo.` };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("products").update({ active }).eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/"); revalidatePath("/admin/produtos");
  return { ok: true, message: active ? "Peça ativada." : "Peça desativada." };
}

export async function duplicateProductAction(id: string): Promise<ActionState> {
  await requireAdmin();
  if (!hasSupabaseEnv) return { ok: true, message: "Duplicação simulada no modo demo." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("duplicate_product_with_relations", { p_source_id: id });
  if (error) return { ok: false, message: `Não foi possível duplicar a peça completa: ${error.message}` };
  revalidatePath("/admin/produtos");
  return { ok: true, message: "Peça duplicada como inativa." };
}

export async function updatePositionAction(id: string, sortOrder: number): Promise<ActionState> {
  await requireAdmin();
  if (!hasSupabaseEnv) return { ok: true, message: "Posição validada no modo demo." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("products").update({ sort_order: sortOrder }).eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/"); revalidatePath("/admin/produtos");
  return { ok: true, message: "Posição atualizada." };
}

export async function saveSettingsAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const row = {
    id: 1,
    brand_name: String(formData.get("brandName") ?? "Laus Sit"),
    subtitle: String(formData.get("subtitle") ?? ""),
    institutional_text: String(formData.get("institutionalText") ?? ""),
    logo_url: String(formData.get("logoUrl") ?? "") || null,
    whatsapp: String(formData.get("whatsapp") ?? "") || null,
    instagram: String(formData.get("instagram") ?? "") || null,
    whatsapp_message: String(formData.get("whatsappMessage") ?? ""),
    footer_text: String(formData.get("footerText") ?? ""),
    show_colors: formData.get("showColors") === "on",
    show_measurements: formData.get("showMeasurements") === "on",
    show_technical_sheet: formData.get("showTechnicalSheet") === "on",
  };
  if (!hasSupabaseEnv) return { ok: true, message: "Configurações validadas no modo demo. Alterações não são persistidas." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("catalog_settings").upsert(row);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/"); revalidatePath("/admin/configuracoes");
  return { ok: true, message: "Configurações salvas." };
}
