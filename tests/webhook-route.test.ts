import { beforeEach, describe, expect, it, vi } from "vitest";

const syncPayment = vi.hoisted(() => vi.fn(async () => ({ orderId: "order-1", paymentId: "pay-1", paymentStatus: "approved", changed: true })));
vi.mock("@/lib/mercado-pago", () => ({
  validateMercadoPagoSignature: ({ xSignature }: { xSignature: string | null }) => xSignature === "valid",
  syncMercadoPagoPayment: syncPayment,
}));

import { POST } from "@/app/api/webhooks/mercado-pago/route";

function request(signature: string | null) {
  const headers = new Headers({ "content-type": "application/json", "x-request-id": "rid" });
  if (signature) headers.set("x-signature", signature);
  return new Request("https://example.test/api/webhooks/mercado-pago", { method: "POST", headers, body: JSON.stringify({ type: "payment", data: { id: "pay-1" } }) });
}

describe("Mercado Pago webhook route", () => {
  beforeEach(() => syncPayment.mockClear());
  it("returns 401 for an invalid signature", async () => {
    expect((await POST(request("invalid"))).status).toBe(401);
    expect(syncPayment).not.toHaveBeenCalled();
  });
  it("accepts valid notifications and safely handles replay", async () => {
    expect((await POST(request("valid"))).status).toBe(200);
    expect((await POST(request("valid"))).status).toBe(200);
    expect(syncPayment).toHaveBeenCalledTimes(2);
  });
});
