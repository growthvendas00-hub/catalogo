import "server-only";
import { cache } from "react";
import { hasSupabaseEnv, hasSupabaseSecretEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Order, PublicOrder } from "@/types/order";

type DbOrder = Record<string, unknown>;
const orderSelect = "id,public_token,product_id,product_name,product_slug,product_image_url,selected_size,selected_color,quantity,unit_price,total_amount,customer_name,customer_email,customer_phone,customer_notes,payment_status,payment_status_detail,fulfillment_status,admin_notes,mercado_pago_preference_id,mercado_pago_payment_id,mercado_pago_payment_method,mercado_pago_payment_type,paid_at,created_at,updated_at";
const publicOrderSelect = "id,public_token,product_name,product_slug,product_image_url,selected_size,selected_color,quantity,unit_price,total_amount,payment_status,payment_status_detail,fulfillment_status,paid_at,created_at,updated_at";

export function mapOrder(row: DbOrder): Order {
  return {
    id: String(row.id),
    publicToken: String(row.public_token),
    productId: String(row.product_id),
    productName: String(row.product_name),
    productSlug: String(row.product_slug),
    productImageUrl: row.product_image_url ? String(row.product_image_url) : null,
    selectedSize: row.selected_size ? String(row.selected_size) : null,
    selectedColor: row.selected_color ? String(row.selected_color) : null,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    totalAmount: Number(row.total_amount),
    customerName: String(row.customer_name),
    customerEmail: String(row.customer_email),
    customerPhone: String(row.customer_phone),
    customerNotes: String(row.customer_notes ?? ""),
    paymentStatus: String(row.payment_status),
    paymentStatusDetail: row.payment_status_detail ? String(row.payment_status_detail) : null,
    fulfillmentStatus: row.fulfillment_status as Order["fulfillmentStatus"],
    adminNotes: String(row.admin_notes ?? ""),
    preferenceId: row.mercado_pago_preference_id ? String(row.mercado_pago_preference_id) : null,
    paymentId: row.mercado_pago_payment_id ? String(row.mercado_pago_payment_id) : null,
    paymentMethod: row.mercado_pago_payment_method ? String(row.mercado_pago_payment_method) : null,
    paymentType: row.mercado_pago_payment_type ? String(row.mercado_pago_payment_type) : null,
    paidAt: row.paid_at ? String(row.paid_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapPublicOrder(row: DbOrder): PublicOrder {
  return {
    publicToken: String(row.public_token),
    productName: String(row.product_name),
    productSlug: String(row.product_slug),
    productImageUrl: row.product_image_url ? String(row.product_image_url) : null,
    selectedSize: row.selected_size ? String(row.selected_size) : null,
    selectedColor: row.selected_color ? String(row.selected_color) : null,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    totalAmount: Number(row.total_amount),
    paymentStatus: String(row.payment_status),
    paymentStatusDetail: row.payment_status_detail ? String(row.payment_status_detail) : null,
    fulfillmentStatus: row.fulfillment_status as PublicOrder["fulfillmentStatus"],
    paidAt: row.paid_at ? String(row.paid_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export const getAdminOrders = cache(async (): Promise<Order[]> => {
  if (!hasSupabaseEnv) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(orderSelect)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Não foi possível carregar os pedidos: ${error.message}`);
  return (data ?? []).map((row) => mapOrder(row as DbOrder));
});

export const getAdminOrderById = cache(async (id: string): Promise<Order | null> => {
  if (!hasSupabaseEnv) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("orders").select(orderSelect).eq("id", id).maybeSingle();
  if (error) throw new Error(`Não foi possível carregar o pedido: ${error.message}`);
  return data ? mapOrder(data as DbOrder) : null;
});

export async function getPublicOrderContextByToken(token: string): Promise<{ orderId: string; order: PublicOrder } | null> {
  if (!hasSupabaseSecretEnv) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) return null;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("orders").select(publicOrderSelect).eq("public_token", token).maybeSingle();
  if (error) throw new Error(`Não foi possível carregar o pedido: ${error.message}`);
  return data ? { orderId: String(data.id), order: mapPublicOrder(data as DbOrder) } : null;
}

export async function getPublicOrderByToken(token: string): Promise<PublicOrder | null> {
  const context = await getPublicOrderContextByToken(token);
  return context?.order ?? null;
}
