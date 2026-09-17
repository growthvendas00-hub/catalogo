import { describe, expect, it } from "vitest";
import { checkoutFingerprint, checkoutSchema, normalizePhone, resolveCheckoutAttempt, validateProductSelection } from "@/lib/checkout-domain";

const input = {
  checkoutAttemptId: "550e8400-e29b-41d4-a716-446655440000",
  productId: "10000000-0000-0000-0000-000000000001",
  size: "M", color: "Preto", quantity: 2,
  customer: { name: "Cliente Teste", email: "TESTE@example.com", phone: "+55 (11) 99999-9999", notes: "" },
  price: 0.01,
};

describe("checkout validation", () => {
  it("normalizes phones and rejects letters", () => {
    expect(normalizePhone(input.customer.phone)).toBe("+5511999999999");
    expect(normalizePhone("telefone abc")).toBeNull();
  });
  it("strips a client supplied price", () => {
    const parsed = checkoutSchema.parse(input);
    expect(parsed).not.toHaveProperty("price");
    expect(parsed.customer.email).toBe("teste@example.com");
  });
  it("rejects invalid quantity, inactive product, size and color", () => {
    expect(checkoutSchema.safeParse({ ...input, quantity: 0 }).success).toBe(false);
    const base = { active: true, price: 90, promotionalPrice: null, sizes: ["M"], colors: ["Preto"] };
    expect(validateProductSelection({ ...base, active: false }, input).error).toBe("inactive");
    expect(validateProductSelection(base, { ...input, size: "GG" }).error).toBe("size");
    expect(validateProductSelection(base, { ...input, color: "Azul" }).error).toBe("color");
  });
  it("always derives the charge from the trusted product", () => {
    expect(validateProductSelection({ active: true, price: 90, promotionalPrice: 75, sizes: ["M"], colors: ["Preto"] }, input)).toMatchObject({ ok: true, unitPrice: 75, totalAmount: 150 });
  });
  it("keeps the same fingerprint for the same intent", () => {
    const first = checkoutSchema.parse(input);
    expect(checkoutFingerprint(first)).toBe(checkoutFingerprint({ ...first }));
    expect(checkoutFingerprint({ ...first, quantity: 3 })).not.toBe(checkoutFingerprint(first));
  });
  it("reuses one order for the same attempt and creates for a new attempt", () => {
    const fingerprint = checkoutFingerprint(checkoutSchema.parse(input));
    expect(resolveCheckoutAttempt({ checkout_fingerprint: fingerprint, checkout_url: "https://checkout" }, fingerprint)).toEqual({ action: "reuse", checkoutUrl: "https://checkout" });
    expect(resolveCheckoutAttempt(null, fingerprint)).toEqual({ action: "create" });
  });
});
