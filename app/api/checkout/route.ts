import { z } from "zod";
import { hasCheckoutEnv } from "@/lib/env";
import { createMercadoPagoPreference, resolvePublicOrigin } from "@/lib/mercado-pago";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// PostgreSQL accepts UUID values that do not carry the RFC version/variant bits.
// The seeded catalog uses that valid PostgreSQL representation, so a strict
// `z.uuid()` check would reject a product that the database accepts.
const postgresUuid = z.string().trim().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
);

const checkoutSchema = z.object({
  productId: postgresUuid,
  size: z.string().trim().max(40).optional().default(""),
  color: z.string().trim().max(80).optional().default(""),
  quantity: z.coerce.number().int().min(1).max(10),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.email().max(180),
    phone: z.string().trim().min(8).max(30),
    notes: z.string().trim().max(600).optional().default(""),
  }),
});

type ProductRelation = { name: string };

function validationMessage(error: z.ZodError) {
  const path = error.issues[0]?.path.join(".");
  const messages: Record<string, string> = {
    productId: "Esta peça não foi identificada. Atualize a página e tente novamente.",
    size: "Selecione um tamanho.",
    color: "Selecione uma cor.",
    quantity: "Escolha uma quantidade entre 1 e 10.",
    "customer.name": "Informe seu nome completo.",
    "customer.email": "Informe um e-mail válido.",
    "customer.phone": "Informe seu WhatsApp com DDD.",
    "customer.notes": "As observações devem ter no máximo 600 caracteres.",
  };

  return messages[path ?? ""] ?? "Revise os dados destacados antes de continuar.";
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-vercel-id") ?? crypto.randomUUID();

  if (!hasCheckoutEnv) {
    return Response.json({ error: "O checkout ainda está sendo configurado." }, { status: 503 });
  }

  const requestOrigin = request.headers.get("origin");
  if (requestOrigin && new URL(requestOrigin).host !== new URL(request.url).host) {
    return Response.json({ error: "Origem não autorizada." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Dados do pedido inválidos." }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    console.warn(JSON.stringify({
      level: "warning",
      message: "Checkout validation failed",
      requestId,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        code: issue.code,
      })),
    }));
    return Response.json({ error: validationMessage(parsed.error) }, { status: 400 });
  }

  const input = parsed.data;
  const supabase = createSupabaseAdminClient();
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id,name,slug,short_description,price,promotional_price,main_image_url,active,product_sizes(name),product_colors(name)")
    .eq("id", input.productId)
    .eq("active", true)
    .maybeSingle();

  if (productError) {
    return Response.json({ error: "Não foi possível consultar esta peça." }, { status: 500 });
  }
  if (!product) {
    return Response.json({ error: "Esta peça não está mais disponível." }, { status: 404 });
  }

  const sizes = ((product.product_sizes ?? []) as ProductRelation[]).map((item) => item.name);
  const colors = ((product.product_colors ?? []) as ProductRelation[]).map((item) => item.name);
  if (sizes.length > 0 && !sizes.includes(input.size)) {
    return Response.json({ error: "Selecione um tamanho disponível." }, { status: 400 });
  }
  if (colors.length > 0 && !colors.includes(input.color)) {
    return Response.json({ error: "Selecione uma cor disponível." }, { status: 400 });
  }

  const unitPrice = Number(product.promotional_price ?? product.price);
  const totalAmount = Number((unitPrice * input.quantity).toFixed(2));
  if (!Number.isFinite(unitPrice) || unitPrice < 0.5) {
    return Response.json({ error: "O preço desta peça precisa ser revisado." }, { status: 409 });
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      product_id: product.id,
      product_name: product.name,
      product_slug: product.slug,
      product_image_url: product.main_image_url,
      selected_size: input.size || null,
      selected_color: input.color || null,
      quantity: input.quantity,
      unit_price: unitPrice,
      total_amount: totalAmount,
      customer_name: input.customer.name,
      customer_email: input.customer.email.toLowerCase(),
      customer_phone: input.customer.phone,
      customer_notes: input.customer.notes,
      payment_status: "created",
    })
    .select("id,public_token")
    .single();

  if (orderError || !order) {
    return Response.json({ error: "Não foi possível criar o pedido." }, { status: 500 });
  }

  try {
    const preference = await createMercadoPagoPreference({
      orderId: order.id,
      publicToken: order.public_token,
      productId: product.id,
      productName: product.name,
      productDescription: product.short_description,
      productImageUrl: product.main_image_url,
      quantity: input.quantity,
      unitPrice,
      customerName: input.customer.name,
      customerEmail: input.customer.email.toLowerCase(),
      origin: resolvePublicOrigin(request.url),
    });

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        mercado_pago_preference_id: preference.preferenceId,
        checkout_url: preference.checkoutUrl,
        payment_status: "pending",
      })
      .eq("id", order.id);
    if (updateError) throw new Error(updateError.message);

    console.info(JSON.stringify({
      level: "info",
      message: "Mercado Pago preference created",
      requestId,
      orderId: order.id,
      preferenceId: preference.preferenceId,
    }));
    return Response.json({ checkoutUrl: preference.checkoutUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao abrir o Mercado Pago.";
    console.error(JSON.stringify({
      level: "error",
      message: "Mercado Pago preference failed",
      requestId,
      orderId: order.id,
      error: message,
    }));
    await supabase
      .from("orders")
      .update({ payment_status: "checkout_error", checkout_error: message })
      .eq("id", order.id);
    return Response.json({ error: "O Mercado Pago não abriu. Tente novamente em instantes." }, { status: 502 });
  }
}
