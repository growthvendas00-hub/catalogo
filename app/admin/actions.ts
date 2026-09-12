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
  const row = {
    name: data.name, slug: data.slug, category: data.category, price: data.price,
    promotional_price: data.promotionalPrice === "" ? null : data.promotionalPrice,
    short_description: data.shortDescription, description: data.description,
    active: data.active, sort_order: data.sortOrder, main_image_url: data.mainImageUrl,
    main_image_alt: data.mainImageAlt, fabric: data.fabric, composition: data.composition,
    thread_type: data.threadType, gsm: data.gsm, fit: data.fit, printing_method: data.printingMethod,
    finish: data.finish, technical_notes: data.technicalNotes, care_instructions: data.careInstructions,
    observations: data.observations,
  };
  const result = data.id
    ? await supabase.from("products").update(row).eq("id", data.id).select("id").single()
    : await supabase.from("products").insert(row).select("id").single();
  if (result.error) return { ok: false, message: `Não foi possível salvar: ${result.error.message}` };
  const productId = result.data.id;
  for (const table of ["product_images", "product_colors", "product_sizes", "product_measurements"]) {
    const { error } = await supabase.from(table).delete().eq("product_id", productId);
    if (error) return { ok: false, message: `Produto salvo, mas houve um erro ao atualizar detalhes: ${error.message}` };
  }
  const operations = [
    data.images.length ? supabase.from("product_images").insert(data.images.map((item, index) => ({ product_id: productId, image_url: item.url, alt_text: item.alt, sort_order: index }))) : null,
    data.colors.length ? supabase.from("product_colors").insert(data.colors.map((item, index) => ({ product_id: productId, name: item.name, hex: item.hex || null, sort_order: index }))) : null,
    data.sizes.length ? supabase.from("product_sizes").insert(data.sizes.map((name, index) => ({ product_id: productId, name, sort_order: index }))) : null,
    data.measurements.length ? supabase.from("product_measurements").insert(data.measurements.map((item, index) => ({ product_id: productId, size: item.size, width: item.width, length: item.length, extra: item.extra ?? {}, sort_order: index }))) : null,
  ].filter(Boolean);
  const relations = await Promise.all(operations);
  const relationError = relations.find((operation) => operation?.error)?.error;
  if (relationError) return { ok: false, message: `Produto salvo, mas houve um erro nos detalhes: ${relationError.message}` };
  revalidatePath("/"); revalidatePath("/admin/produtos"); revalidatePath(`/produto/${data.slug}`);
  return { ok: true, message: "Produto salvo." };
}

export async function deleteProductAction(id: string): Promise<ActionState> {
  await requireAdmin();
  if (!hasSupabaseEnv) return { ok: true, message: "Exclusão simulada. O catálogo demo permanece intacto." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
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
  const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
  if (error) return { ok: false, message: error.message };
  const { id: _id, created_at: _created, updated_at: _updated, ...copy } = data;
  void _id; void _created; void _updated;
  const suffix = Date.now().toString().slice(-6);
  const { error: insertError } = await supabase.from("products").insert({ ...copy, name: `${data.name} — cópia`, slug: `${data.slug}-copia-${suffix}`, active: false, sort_order: Number(data.sort_order) + 1 });
  if (insertError) return { ok: false, message: insertError.message };
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
