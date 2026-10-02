import { cookies } from "next/headers";
import { z } from "zod";
import { checkoutFingerprint, checkoutSchema, resolveCheckoutAttempt } from "@/lib/checkout-domain";
import { hasCheckoutEnv } from "@/lib/env";
import { createMercadoPagoPreference, resolvePublicOrigin } from "@/lib/mercado-pago";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_CHECKOUT_BODY_BYTES = 16 * 1024;

type CheckoutOrder = {
  id: string; public_token: string; product_id: string; product_name: string;
  product_image_url: string | null; selected_model: string | null; quantity: number;
  unit_price: number; total_amount: number; customer_name: string; customer_email: string;
  checkout_url: string | null; checkout_fingerprint: string | null;
};
const existingOrderSelect = "id,public_token,product_id,product_name,product_image_url,selected_model,quantity,unit_price,total_amount,customer_name,customer_email,checkout_url,checkout_fingerprint";

function validationMessage(error: z.ZodError) {
  const messages: Record<string, string> = {
    checkoutAttemptId: "Atualize a página e tente novamente.", productId: "Esta peça não foi identificada.",
    model: "Selecione uma modelagem.", size: "Selecione um tamanho.", color: "Selecione uma cor.",
    quantity: "Escolha uma quantidade entre 1 e 10.", "customer.name": "Informe seu nome completo.",
    "customer.email": "Informe um e-mail válido.", "customer.phone": "Informe um WhatsApp válido, sem letras.",
  };
  return messages[error.issues[0]?.path.join(".") ?? ""] ?? "Revise os dados destacados antes de continuar.";
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-vercel-id") ?? crypto.randomUUID();
  if (!hasCheckoutEnv) return Response.json({ error: "O checkout ainda está sendo configurado." }, { status: 503 });
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return Response.json({ error: "Formato de dados inválido." }, { status: 415 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_CHECKOUT_BODY_BYTES) return Response.json({ error: "Dados do pedido muito grandes." }, { status: 413 });
  if (!sameOrigin(request)) return Response.json({ error: "Origem não autorizada." }, { status: 403 });

  let body: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_CHECKOUT_BODY_BYTES) return Response.json({ error: "Dados do pedido muito grandes." }, { status: 413 });
    body = JSON.parse(raw);
  } catch { return Response.json({ error: "Dados do pedido inválidos." }, { status: 400 }); }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: validationMessage(parsed.error) }, { status: 400 });
  const input = parsed.data;
  const fingerprint = checkoutFingerprint(input);
  const supabase = createSupabaseAdminClient();
  const { data: existing, error: existingError } = await supabase.from("orders").select(existingOrderSelect).eq("checkout_attempt_id", input.checkoutAttemptId).maybeSingle();
  if (existingError) return Response.json({ error: "Não foi possível consultar o pedido." }, { status: 500 });
  const attempt = resolveCheckoutAttempt(existing, fingerprint);
  if (attempt.action === "conflict") return Response.json({ error: "Esta tentativa já pertence a outro pedido. Atualize a página." }, { status: 409 });
  if (attempt.action === "reuse" && attempt.checkoutUrl) return Response.json({ checkoutUrl: attempt.checkoutUrl });

  let order = existing as CheckoutOrder | null;
  if (!order) {
    const couponCode = (await cookies()).get("laus_ref")?.value ?? null;
    const { data, error } = await supabase.rpc("create_checkout_order", { p_payload: { ...input, fingerprint }, p_coupon_code: couponCode });
    if (error) {
      const friendly = /estoque insuficiente/i.test(error.message) ? "A quantidade escolhida não está disponível." :
        /indisponível|inválid/i.test(error.message) ? error.message : "Não foi possível criar o pedido.";
      return Response.json({ error: friendly }, { status: /estoque|indisponível/i.test(error.message) ? 409 : 500 });
    }
    const created = Array.isArray(data) ? data[0] : data;
    const loaded = await supabase.from("orders").select(existingOrderSelect).eq("id", created.order_id).single();
    if (loaded.error || !loaded.data) return Response.json({ error: "Não foi possível carregar o pedido criado." }, { status: 500 });
    order = loaded.data as CheckoutOrder;
  }

  const { data: product } = await supabase.from("products").select("short_description").eq("id", order.product_id).maybeSingle();
  try {
    const preference = await createMercadoPagoPreference({
      orderId: order.id, checkoutAttemptId: input.checkoutAttemptId, publicToken: order.public_token,
      productId: order.product_id, productName: order.product_name, selectedModel: order.selected_model || input.model,
      productDescription: product?.short_description ?? "Peça Laus Sit", productImageUrl: order.product_image_url,
      quantity: Number(order.quantity), unitPrice: Number(order.unit_price), totalAmount: Number(order.total_amount),
      customerName: order.customer_name, customerEmail: order.customer_email, origin: resolvePublicOrigin(request.url),
    });
    const { error: updateError } = await supabase.from("orders").update({ mercado_pago_preference_id: preference.preferenceId, checkout_url: preference.checkoutUrl, payment_status: "pending", checkout_error: null }).eq("id", order.id);
    if (updateError) throw new Error(updateError.message);
    console.info(JSON.stringify({ level: "info", action: "checkout.preference", requestId, orderId: order.id, status: "created" }));
    return Response.json({ checkoutUrl: preference.checkoutUrl });
  } catch {
    await supabase.rpc("release_checkout_reservation", { p_order_id: order.id });
    await supabase.from("orders").update({ payment_status: "checkout_error", checkout_error: "provider_error" }).eq("id", order.id);
    console.error(JSON.stringify({ level: "error", action: "checkout.preference", requestId, orderId: order.id, status: "failed", errorCategory: "provider" }));
    return Response.json({ error: "O Mercado Pago não abriu. Tente novamente em instantes." }, { status: 502 });
  }
}
