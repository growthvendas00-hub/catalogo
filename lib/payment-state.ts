export function shouldApplyPaymentState(input: {
  currentStatus: string;
  currentPaymentId: string | null;
  incomingStatus: string;
  incomingPaymentId: string;
}) {
  if (["refunded", "charged_back"].includes(input.currentStatus)) return false;
  if (input.currentStatus !== "approved") return true;
  if (input.currentPaymentId !== input.incomingPaymentId) return false;
  return ["approved", "refunded", "charged_back"].includes(input.incomingStatus);
}

export function derivePaymentTransition(input: {
  currentStatus: string;
  currentPaymentId: string | null;
  currentPaidAt: string | null;
  incomingStatus: string;
  incomingPaymentId: string;
  incomingPaidAt: string | null;
  expectedAmount: number;
  receivedAmount: number;
}) {
  const amountMatches = Math.round(input.expectedAmount * 100) === Math.round(input.receivedAmount * 100);
  const incomingStatus = amountMatches ? input.incomingStatus : "amount_mismatch";
  const changed = shouldApplyPaymentState({ ...input, incomingStatus });
  return {
    changed,
    status: changed ? incomingStatus : input.currentStatus,
    paymentId: changed ? input.incomingPaymentId : input.currentPaymentId,
    paidAt: changed && incomingStatus === "approved"
      ? input.currentPaidAt ?? input.incomingPaidAt
      : input.currentPaidAt,
  };
}
