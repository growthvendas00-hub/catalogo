import { getPublicOrderByToken } from "@/lib/orders";

export const runtime = "nodejs";
const postgresUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!postgresUuid.test(token)) return Response.json({ error: "Pedido não encontrado." }, { status: 404 });
  const order = await getPublicOrderByToken(token);
  if (!order) return Response.json({ error: "Pedido não encontrado." }, { status: 404 });
  return Response.json(order, { headers: { "Cache-Control": "no-store" } });
}
