import { syncMercadoPagoPayment, validateMercadoPagoSignature } from "@/lib/mercado-pago";

export const runtime = "nodejs";

type WebhookBody = {
  type?: string;
  topic?: string;
  data?: { id?: string | number };
};

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? request.headers.get("x-vercel-id") ?? crypto.randomUUID();
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 32 * 1024) return Response.json({ error: "Notificação inválida." }, { status: 413 });
  const url = new URL(request.url);
  let body: WebhookBody = {};
  try {
    body = (await request.json()) as WebhookBody;
  } catch {
    // Algumas notificações antigas enviam o ID apenas na URL.
  }

  const eventType = body.type || body.topic || url.searchParams.get("type") || url.searchParams.get("topic");
  if (eventType && eventType !== "payment") return Response.json({ received: true });

  const dataId =
    url.searchParams.get("data.id") ||
    url.searchParams.get("id") ||
    (body.data?.id == null ? "" : String(body.data.id));
  if (!dataId) return Response.json({ error: "Pagamento não informado." }, { status: 400 });

  const validSignature = validateMercadoPagoSignature({
    xSignature: request.headers.get("x-signature"),
    xRequestId: request.headers.get("x-request-id"),
    dataId,
  });
  if (!validSignature) {
    console.warn(JSON.stringify({ level: "warning", action: "payment.webhook", requestId, paymentId: dataId, status: "unauthorized", errorCategory: "signature" }));
    return Response.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  try {
    const result = await syncMercadoPagoPayment(dataId);
    console.info(JSON.stringify({ level: "info", action: "payment.webhook", requestId, orderId: result.orderId, paymentId: result.paymentId, status: result.paymentStatus }));
    return Response.json({ received: true, status: result.paymentStatus });
  } catch {
    console.error(JSON.stringify({ level: "error", action: "payment.webhook", requestId, paymentId: dataId, status: "failed", errorCategory: "sync" }));
    return Response.json({ error: "Não foi possível sincronizar o pagamento." }, { status: 500 });
  }
}
