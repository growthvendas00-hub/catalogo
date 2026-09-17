import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const mercadoPagoApi = "https://api.mercadopago.com";

type CreatePreferenceInput = {
  orderId: string;
  publicToken: string;
  productId: string;
  productName: string;
  productDescription: string;
  productImageUrl: string | null;
  quantity: number;
  unitPrice: number;
  customerName: string;
  customerEmail: string;
  origin: string;
};

type PreferenceResponse = {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
  message?: string;
  error?: string;
};

type PaymentResponse = {
  id?: number | string;
  status?: string;
  status_detail?: string;
  transaction_amount?: number;
  external_reference?: string;
  payment_method_id?: string;
  payment_type_id?: string;
  date_approved?: string | null;
  message?: string;
  error?: string;
  [key: string]: unknown;
};

function accessToken() {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) throw new Error("Mercado Pago não configurado.");
  return token;
}

export function resolvePublicOrigin(requestUrl: string) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    const normalized = /^https?:\/\//i.test(configured) ? configured : `https://${configured}`;
    return new URL(normalized).origin;
  }
  return new URL(requestUrl).origin;
}

function absoluteImageUrl(imageUrl: string | null, origin: string) {
  if (!imageUrl) return undefined;
  try {
    return new URL(imageUrl, origin).toString();
  } catch {
    return undefined;
  }
}

export async function createMercadoPagoPreference(input: CreatePreferenceInput) {
  const orderUrl = `${input.origin}/pedido/${input.publicToken}`;
  const response = await fetch(`${mercadoPagoApi}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": input.orderId,
    },
    body: JSON.stringify({
      items: [
        {
          id: input.productId,
          title: input.productName,
          description: input.productDescription,
          picture_url: absoluteImageUrl(input.productImageUrl, input.origin),
          currency_id: "BRL",
          quantity: input.quantity,
          unit_price: input.unitPrice,
        },
      ],
      payer: {
        name: input.customerName,
        email: input.customerEmail,
      },
      external_reference: input.orderId,
      notification_url: `${input.origin}/api/webhooks/mercado-pago`,
      back_urls: {
        success: `${orderUrl}?resultado=sucesso`,
        pending: `${orderUrl}?resultado=pendente`,
        failure: `${orderUrl}?resultado=falha`,
      },
      auto_return: "approved",
      statement_descriptor: "LAUS SIT",
      metadata: { order_id: input.orderId },
    }),
    cache: "no-store",
  });

  const data = (await response.json()) as PreferenceResponse;
  if (!response.ok || !data.id) {
    throw new Error(data.message || data.error || `Mercado Pago respondeu ${response.status}.`);
  }

  // Checkout Pro test purchases must also use the production init_point.
  // The legacy sandbox URL can enter a redirect loop after a test-buyer login.
  const checkoutUrl = data.init_point;
  if (!checkoutUrl) throw new Error("O Mercado Pago não retornou a URL do checkout.");

  return { preferenceId: data.id, checkoutUrl };
}

export function validateMercadoPagoSignature(input: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string;
}) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!input.xSignature || !input.xRequestId) return false;

  const parts = Object.fromEntries(
    input.xSignature.split(",").map((part) => {
      const [key, ...value] = part.trim().split("=");
      return [key, value.join("=")];
    }),
  );
  const timestamp = parts.ts;
  const received = parts.v1;
  if (!timestamp || !received) return false;

  const template = `id:${input.dataId.toLowerCase()};request-id:${input.xRequestId};ts:${timestamp};`;
  const expected = createHmac("sha256", secret).update(template).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function syncMercadoPagoPayment(paymentId: string) {
  const response = await fetch(`${mercadoPagoApi}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${accessToken()}` },
    cache: "no-store",
  });
  const payment = (await response.json()) as PaymentResponse;
  if (!response.ok || !payment.id || !payment.external_reference) {
    throw new Error(payment.message || payment.error || `Pagamento ${paymentId} não encontrado.`);
  }

  const supabase = createSupabaseAdminClient();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id,total_amount")
    .eq("id", payment.external_reference)
    .maybeSingle();
  if (orderError) throw new Error(orderError.message);
  if (!order) throw new Error("Pedido associado ao pagamento não encontrado.");

  const expectedCents = Math.round(Number(order.total_amount) * 100);
  const receivedCents = Math.round(Number(payment.transaction_amount ?? 0) * 100);
  const amountMatches = expectedCents === receivedCents;
  const paymentStatus = amountMatches ? payment.status || "pending" : "amount_mismatch";

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      payment_status: paymentStatus,
      payment_status_detail: amountMatches ? payment.status_detail ?? null : "Valor recebido diverge do pedido.",
      mercado_pago_payment_id: String(payment.id),
      mercado_pago_payment_method: payment.payment_method_id ?? null,
      mercado_pago_payment_type: payment.payment_type_id ?? null,
      raw_payment: payment,
      paid_at: amountMatches && payment.status === "approved" ? payment.date_approved ?? new Date().toISOString() : null,
      checkout_error: null,
    })
    .eq("id", order.id);
  if (updateError) throw new Error(updateError.message);

  return { orderId: String(order.id), paymentStatus };
}
