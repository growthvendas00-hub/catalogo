import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { validateMercadoPagoSignature } from "@/lib/mercado-pago";

const secret = "fixture-secret";
const requestId = "request-123";
const timestamp = "1712345678";
const dataId = "PAYMENT-ABC";
const digest = createHmac("sha256", secret)
  .update(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${timestamp};`)
  .digest("hex");

describe("Mercado Pago webhook signature", () => {
  it("fails closed without a configured secret", () => {
    expect(validateMercadoPagoSignature({ xSignature: `ts=${timestamp},v1=${digest}`, xRequestId: requestId, dataId }, "")).toBe(false);
  });

  it.each([
    { xSignature: null, xRequestId: requestId },
    { xSignature: `v1=${digest}`, xRequestId: requestId },
    { xSignature: `ts=${timestamp},v1=${digest}`, xRequestId: null },
    { xSignature: `ts=${timestamp},v1=${"0".repeat(64)}`, xRequestId: requestId },
  ])("rejects missing or invalid headers", (headers) => {
    expect(validateMercadoPagoSignature({ ...headers, dataId }, secret)).toBe(false);
  });

  it("accepts a valid fixture and lowercases data.id in the manifest", () => {
    expect(validateMercadoPagoSignature({ xSignature: `ts=${timestamp},v1=${digest}`, xRequestId: requestId, dataId }, secret)).toBe(true);
  });
});
