"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";
import { hasSupabaseSecretEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";
import { CATALOG_CATEGORIES, GARMENT_MODELS } from "@/types/catalog";

const uuid = z.string().uuid();
const couponSchema = z.object({
  id: z.string().uuid().optional(), code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/),
  sourceName: z.string().trim().min(2).max(120), discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.coerce.number().positive(), maxDiscount: z.coerce.number().positive().nullable(),
  maxUses: z.coerce.number().int().positive().nullable(), startsAt: z.string(), endsAt: z.string(), active: z.boolean(),
  productId: z.string().uuid().nullable(), category: z.enum(CATALOG_CATEGORIES).nullable(),
  ownerType: z.enum(["admin", "seller"]), sellerId: z.string().uuid().nullable(),
}).superRefine((value, context) => {
  if (value.discountType === "percentage" && value.discountValue > 100) context.addIssue({ code: "custom", path: ["discountValue"], message: "Percentual máximo: 100%." });
  if (value.ownerType === "seller" && !value.sellerId) context.addIssue({ code: "custom", path: ["sellerId"], message: "Escolha o vendedor." });
});

function nullableNumber(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim(); return raw ? Number(raw.replace(",", ".")) : null;
}
function saoPauloTimestamp(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim(); return raw ? `${raw}:00-03:00` : null;
}

export async function saveCouponAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = couponSchema.safeParse({
    id: String(formData.get("id") ?? "") || undefined, code: formData.get("code"), sourceName: formData.get("sourceName"),
    discountType: formData.get("discountType"), discountValue: formData.get("discountValue"),
    maxDiscount: nullableNumber(formData.get("maxDiscount")), maxUses: nullableNumber(formData.get("maxUses")),
    startsAt: String(formData.get("startsAt") ?? ""), endsAt: String(formData.get("endsAt") ?? ""), active: formData.get("active") === "on",
    productId: String(formData.get("productId") ?? "") || null, category: String(formData.get("category") ?? "") || null,
    ownerType: formData.get("ownerType"), sellerId: String(formData.get("sellerId") ?? "") || null,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revise o cupom." };
  const value = parsed.data;
  const row = {
    code: value.code.toUpperCase(), source_name: value.sourceName, discount_type: value.discountType,
    discount_value: value.discountValue, max_discount: value.maxDiscount, max_uses: value.maxUses,
    starts_at: saoPauloTimestamp(value.startsAt), ends_at: saoPauloTimestamp(value.endsAt), active: value.active,
    product_id: value.productId, category: value.category, owner_type: value.ownerType,
    seller_id: value.ownerType === "seller" ? value.sellerId : null,
  };
  const supabase = await createSupabaseServerClient();
  const query = value.id ? supabase.from("coupons").update(row).eq("id", value.id) : supabase.from("coupons").insert(row);
  const { error } = await query;
  if (error) return { ok: false, message: error.code === "23505" ? "Este código já existe." : error.message };
  revalidatePath("/admin/cupons"); revalidatePath("/");
  return { ok: true, message: "Cupom salvo e pronto para gerar o link." };
}

export async function deleteCouponAction(formData: FormData) {
  await requireAdmin();
  const parsed = uuid.safeParse(formData.get("id"));
  if (!parsed.success) return;
  const supabase = await createSupabaseServerClient();
  await supabase.from("coupons").delete().eq("id", parsed.data);
  revalidatePath("/admin/cupons");
}

export async function saveInventoryAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = z.object({
    id: z.string().uuid().optional(), productId: z.string().uuid(), model: z.enum(GARMENT_MODELS).nullable(),
    size: z.string().trim().max(40).nullable(), color: z.string().trim().max(80).nullable(),
    quantity: z.coerce.number().int().min(0).nullable(), active: z.boolean(),
  }).safeParse({
    id: String(formData.get("id") ?? "") || undefined, productId: formData.get("productId"),
    model: String(formData.get("model") ?? "") || null, size: String(formData.get("size") ?? "") || null,
    color: String(formData.get("color") ?? "") || null, quantity: nullableNumber(formData.get("quantity")), active: formData.get("active") === "on",
  });
  if (!parsed.success) return { ok: false, message: "Revise produto, combinação e quantidade." };
  const { id, productId, ...selection } = parsed.data;
  const row = { product_id: productId, model: selection.model, size: selection.size, color: selection.color, quantity: selection.quantity, active: selection.active };
  const supabase = await createSupabaseServerClient();
  const query = id ? supabase.from("inventory_items").update(row).eq("id", id) : supabase.from("inventory_items").upsert(row, { onConflict: "product_id,model,size,color" });
  const { error } = await query;
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/estoque"); revalidatePath(`/produto/[slug]`, "page");
  return { ok: true, message: "Estoque salvo." };
}

export async function createSellerAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const phone = normalizeWhatsAppNumber(String(formData.get("whatsapp") ?? ""));
  const parsed = z.object({ name: z.string().trim().min(2).max(120), email: z.string().email(), password: z.string().min(8).optional(), userId: z.string().uuid().optional(), active: z.boolean() }).safeParse({
    name: formData.get("name"), email: formData.get("email"), password: String(formData.get("password") ?? "") || undefined,
    userId: String(formData.get("userId") ?? "") || undefined, active: formData.get("active") === "on",
  });
  if (!phone || !parsed.success) return { ok: false, message: "Informe nome, WhatsApp, e-mail e senha de ao menos 8 caracteres (ou UUID)." };
  let userId = parsed.data.userId;
  if (!userId && hasSupabaseSecretEnv && parsed.data.password) {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.createUser({ email: parsed.data.email.toLowerCase(), password: parsed.data.password, email_confirm: true });
    if (error) return { ok: false, message: `Auth: ${error.message}` };
    userId = data.user.id;
  }
  if (!userId) return { ok: false, message: "Crie o usuário no Supabase Auth e informe o UUID. O passo está no MANUAL_FINALIZACAO.md." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("seller_profiles").upsert({ user_id: userId, name: parsed.data.name, whatsapp: phone, email: parsed.data.email.toLowerCase(), active: parsed.data.active });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/vendedores");
  return { ok: true, message: "Vendedor criado e vinculado ao painel." };
}
