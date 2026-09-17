import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const mercadoPagoApi = "https://api.mercadopago.com";

type CreatePreferenceInput = {
  orderId: string;
  checkoutAttemptId: string;
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

type PreferenceResponse = { id?: string; init_point?: string; message?: string; error?: string };

export type MercadoPagoPayment = {
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
};

type PaymentSearchResponse = { results?: MercadoPagoPayment[]; message?: string; error?: string };

export class PaymentAssociationError extends Error {
  constructor() {
    super("O pagamento não pertence ao pedido informado.");
    this.name = "PaymentAssociationError";
  }
}

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
  try { return new URL(imageUrl, origin).toString(); } catch { return undefined; }
}

export async function createMercadoPagoPreference(input: CreatePreferenceInput) {
  const orderUrl = `${input.origin}/pedido/${input.publicToken}`;
  const response = await fetch(`${mercadoPagoApi}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": input.checkoutAttemptId,
    },
    body: JSON.stringify({
      items: [{
        id: input.productId,
        title: input.productName,
        description: input.productDescription,
        picture_url: absoluteImageUrl(input.productImageUrl, input.origin),
        currency_id: "BRL",
        quantity: input.quantity,
        unit_price: input.unitPrice,
      }],
      payer: { name: input.customerName, email: input.customerEmail },
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
  if (!response.ok || !data.id) throw new Error(data.message || data.error || `Mercado Pago respondeu ${response.status}.`);
  if (!data.init_point) throw new Error("O Mercado Pago não retornou a URL do checkout.");
  return { preferenceId: data.id, checkoutUrl: data.init_point };
}

export function validateMercadoPagoSignature(input: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string;
}, secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET) {
  if (!secret || !input.xSignature || !input.xRequestId || !input.dataId) return false;
  const parts = Object.fromEntries(input.xSignature.split(",").map((part) => {
    const [key, ...value] = part.trim().split("=");
    return [key, value.join("=")];
  }));
  const timestamp = parts.ts;
  const received = parts.v1;
  if (!timestamp || !received || !/^[a-f0-9]{64}$/i.test(received)) return false;
  const template = `id:${input.dataId.toLowerCase()};request-id:${input.xRequestId};ts:${timestamp};`;
  const expected = createHmac("sha256", secret).update(template).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function validatePaymentAssociation(payment: MercadoPagoPayment, expectedOrderId?: string) {
  if (!payment.id || !payment.external_reference) throw new Error("Pagamento sem identificação de pedido.");
  if (expectedOrderId && payment.external_reference !== expectedOrderId) throw new PaymentAssociationError();
  return { orderId: payment.external_reference, paymentId: String(payment.id) };
}

export async function fetchMercadoPagoPayment(paymentId: string): Promise<MercadoPagoPayment> {
  const response = await fetch(`${mercadoPagoApi}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${accessToken()}` }, cache: "no-store",
  });
  const payment = (await response.json()) as MercadoPagoPayment;
  if (!response.ok || !payment.id || !payment.external_reference) {
    throw new Error(payment.message || payment.error || `Pagamento ${paymentId} não encontrado.`);
  }
  return payment;
}

export async function persistMercadoPagoPayment(payment: MercadoPagoPayment, expectedOrderId?: string) {
  const association = validatePaymentAssociation(payment, expectedOrderId);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("record_mercado_pago_payment", {
    p_order_id: association.orderId,
    p_payment_id: association.paymentId,
    p_status: payment.status || "pending",
    p_status_detail: payment.status_detail ?? null,
    p_transaction_amount: Number(payment.transaction_amount ?? 0),
    p_payment_method: payment.payment_method_id ?? null,
    p_payment_type: payment.payment_type_id ?? null,
    p_date_approved: payment.date_approved ?? null,
  });
  if (error) throw new Error(error.message);
  const result = Array.isArray(data) ? data[0] : data;
  return {
    orderId: association.orderId,
    paymentId: association.paymentId,
    paymentStatus: String(result?.payment_status ?? payment.status ?? "pending"),
    changed: Boolean(result?.changed),
  };
}

export async function syncMercadoPagoPayment(paymentId: string, expectedOrderId?: string) {
  return persistMercadoPagoPayment(await fetchMercadoPagoPayment(paymentId), expectedOrderId);
}

async function findPaymentIdByOrder(orderId: string) {
  const url = new URL(`${mercadoPagoApi}/v1/payments/search`);
  url.searchParams.set("external_reference", orderId);
  url.searchParams.set("sort", "date_created");
  url.searchParams.set("criteria", "desc");
  url.searchParams.set("limit", "1");
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken()}` }, cache: "no-store" });
  const data = (await response.json()) as PaymentSearchResponse;
  if (!response.ok) throw new Error(data.message || data.error || "Não foi possível consultar o pagamento.");
  const payment = data.results?.[0];
  if (!payment?.id) throw new Error("Nenhum pagamento foi encontrado para este pedido.");
  return String(payment.id);
}

export async function reconcileMercadoPagoOrder(orderId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: order, error } = await supabase.from("orders").select("id,mercado_pago_payment_id").eq("id", orderId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) throw new Error("Pedido não encontrado.");
  const paymentId = order.mercado_pago_payment_id || await findPaymentIdByOrder(orderId);
  return syncMercadoPagoPayment(String(paymentId), orderId);
}
