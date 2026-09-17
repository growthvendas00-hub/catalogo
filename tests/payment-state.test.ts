import { describe, expect, it } from "vitest";
import { derivePaymentTransition } from "@/lib/payment-state";

const base = { currentStatus: "pending", currentPaymentId: "pay-1", currentPaidAt: null, incomingStatus: "approved", incomingPaymentId: "pay-1", incomingPaidAt: "2026-09-17T12:00:00Z", expectedAmount: 100, receivedAmount: 100 };

describe("payment state consolidation", () => {
  it("marks amount mismatch", () => expect(derivePaymentTransition({ ...base, receivedAmount: 99 }).status).toBe("amount_mismatch"));
  it("does not regress approved by a different rejected payment", () => {
    expect(derivePaymentTransition({ ...base, currentStatus: "approved", currentPaymentId: "pay-1", currentPaidAt: base.incomingPaidAt, incomingPaymentId: "pay-2", incomingStatus: "rejected" })).toMatchObject({ changed: false, status: "approved", paymentId: "pay-1", paidAt: base.incomingPaidAt });
  });
  it.each(["refunded", "charged_back"])("allows %s for the same approved payment and preserves paid_at", (status) => {
    expect(derivePaymentTransition({ ...base, currentStatus: "approved", currentPaidAt: base.incomingPaidAt, incomingStatus: status })).toMatchObject({ changed: true, status, paidAt: base.incomingPaidAt });
  });
});
