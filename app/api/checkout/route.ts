import { z } from "zod";
import { checkoutFingerprint, checkoutSchema, resolveCheckoutAttempt, validateProductSelection } from "@/lib/checkout-domain";
import { hasCheckoutEnv } from "@/lib/env";
import { createMercadoPagoPreference, resolvePublicOrigin } from "@/lib/mercado-pago";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const MAX_CHECKOUT_BODY_BYTES = 16 * 1024;

type ProductRelation = { name: string };
type CheckoutOrder = {
  id: string;
  public_token: string;
  product_id: string;
  product_name: string;
  product_image_url: string | null;
  quantity: number;
  unit_price: number;
  customer_name: string;
  customer_email: string;
  checkout_url: string | null;
  checkout_fingerprint: string | null;
};

function validationMessage(error: z.ZodError) {
  const path = error.issues[0]?.path.join(".");
  const messages: Record<string, string> = {
    checkoutAttemptId: "Atualize a página e tente novamente.",
    productId: "Esta peça não foi identificada. Atualize a página e tente novamente.",
    size: "Selecione um tamanho.", color: "Selecione uma cor.",
    quantity: "Escolha uma quantidade entre 1 e 10.",
    "customer.name": "Informe seu nome completo.",
    "customer.email": "Informe um e-mail válido.",
    "customer.phone": "Informe um WhatsApp válido, sem letras.",
    "customer.notes": "As observações devem ter no máximo 600 caracteres.",
  };
  return messages[path ?? ""] ?? "Revise os dados destacados antes de continuar.";
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}

const existingOrderSelect = "id,public_token,product_id,product_name,product_image_url,quantity,unit_price,customer_name,customer_email,checkout_url,checkout_fingerprint";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-vercel-id") ?? crypto.randomUUID();
  if (!hasCheckoutEnv) return Response.json({ error: "O checkout ainda está sendo configurado." }, { status: 503 });
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    return Response.json({ error: "Formato de dados inválido." }, { status: 415 });
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_CHECKOUT_BODY_BYTES) return Response.json({ error: "Dados do pedido muito grandes." }, { status: 413 });
  if (!sameOrigin(request)) return Response.json({ error: "Origem não autorizada." }, { status: 403 });

  let body: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_CHECKOUT_BODY_BYTES) {
      return Response.json({ error: "Dados do pedido muito grandes." }, { status: 413 });
    }
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Dados do pedido inválidos." }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    console.warn(JSON.stringify({ level: "warning", action: "checkout.validate", requestId, status: "rejected", errorCategory: "validation" }));
    return Response.json({ error: validationMessage(parsed.error) }, { status: 400 });
  }

  const input = parsed.data;
  const fingerprint = checkoutFingerprint(input);
  const supabase = createSupabaseAdminClient();
  const { data: existing, error: existingError } = await supabase
    .from("orders").select(existingOrderSelect).eq("checkout_attempt_id", input.checkoutAttemptId).maybeSingle();
  if (existingError) return Response.json({ error: "Não foi possível consultar o pedido." }, { status: 500 });
  const attempt = resolveCheckoutAttempt(existing, fingerprint);
  if (attempt.action === "conflict") {
    return Response.json({ error: "Esta tentativa já pertence a outro pedido. Atualize a página." }, { status: 409 });
  }
  if (attempt.action === "reuse" && attempt.checkoutUrl) return Response.json({ checkoutUrl: attempt.checkoutUrl });

  let productDescription = "";
  let order = existing as CheckoutOrder | null;
  if (!order) {
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id,name,slug,short_description,price,promotional_price,main_image_url,processed_image_url,active,product_sizes(name),product_colors(name)")
      .eq("id", input.productId).eq("active", true).maybeSingle();
    if (productError) return Response.json({ error: "Não foi possível consultar esta peça." }, { status: 500 });
    if (!product) return Response.json({ error: "Esta peça não está mais disponível." }, { status: 404 });

    const selection = validateProductSelection({
      active: product.active,
      price: Number(product.price),
      promotionalPrice: product.promotional_price == null ? null : Number(product.promotional_price),
      sizes: ((product.product_sizes ?? []) as ProductRelation[]).map((item) => item.name),
      colors: ((product.product_colors ?? []) as ProductRelation[]).map((item) => item.name),
    }, input);
    if (!selection.ok && selection.error === "size") return Response.json({ error: "Selecione um tamanho disponível." }, { status: 400 });
    if (!selection.ok && selection.error === "color") return Response.json({ error: "Selecione uma cor disponível." }, { status: 400 });
    if (!selection.ok) return Response.json({ error: "O preço desta peça precisa ser revisado." }, { status: 409 });
    const { unitPrice, totalAmount } = selection;
    productDescription = product.short_description;
    const { data: inserted, error: orderError } = await supabase.from("orders").insert({
      checkout_attempt_id: input.checkoutAttemptId, checkout_fingerprint: fingerprint,
      product_id: product.id, product_name: product.name, product_slug: product.slug,
      product_image_url: product.processed_image_url || product.main_image_url,
      selected_size: input.size || null, selected_color: input.color || null,
      quantity: input.quantity, unit_price: unitPrice, total_amount: totalAmount,
      customer_name: input.customer.name, customer_email: input.customer.email,
      customer_phone: input.customer.phone, customer_notes: input.customer.notes,
      payment_status: "created",
    }).select(existingOrderSelect).single();

    if (orderError?.code === "23505") {
      const raced = await supabase.from("orders").select(existingOrderSelect).eq("checkout_attempt_id", input.checkoutAttemptId).single();
      if (raced.error || raced.data.checkout_fingerprint !== fingerprint) {
        return Response.json({ error: "Não foi possível retomar o pedido." }, { status: 409 });
      }
      order = raced.data as CheckoutOrder;
      if (order.checkout_url) return Response.json({ checkoutUrl: order.checkout_url });
    } else if (orderError || !inserted) {
      return Response.json({ error: "Não foi possível criar o pedido." }, { status: 500 });
    } else order = inserted as CheckoutOrder;
  }

  try {
    const preference = await createMercadoPagoPreference({
      orderId: order.id, checkoutAttemptId: input.checkoutAttemptId, publicToken: order.public_token,
      productId: order.product_id, productName: order.product_name,
      productDescription, productImageUrl: order.product_image_url,
      quantity: Number(order.quantity), unitPrice: Number(order.unit_price),
      customerName: order.customer_name, customerEmail: order.customer_email,
      origin: resolvePublicOrigin(request.url),
    });
    const { error: updateError } = await supabase.from("orders").update({
      mercado_pago_preference_id: preference.preferenceId,
      checkout_url: preference.checkoutUrl, payment_status: "pending", checkout_error: null,
    }).eq("id", order.id);
    if (updateError) throw new Error(updateError.message);
    console.info(JSON.stringify({ level: "info", action: "checkout.preference", requestId, orderId: order.id, preferenceId: preference.preferenceId, status: "created" }));
    return Response.json({ checkoutUrl: preference.checkoutUrl });
  } catch {
    console.error(JSON.stringify({ level: "error", action: "checkout.preference", requestId, orderId: order.id, status: "failed", errorCategory: "provider" }));
    await supabase.from("orders").update({ payment_status: "checkout_error", checkout_error: "provider_error" }).eq("id", order.id);
    return Response.json({ error: "O Mercado Pago não abriu. Tente novamente em instantes." }, { status: 502 });
  }
}
