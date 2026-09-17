import { createHash } from "node:crypto";
import { z } from "zod";

export const postgresUuid = z.string().trim().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

export function normalizePhone(value: string) {
  const trimmed = value.trim();
  if (!/^[+\d\s().-]+$/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

export const checkoutSchema = z.object({
  checkoutAttemptId: z.uuid(),
  productId: postgresUuid,
  size: z.string().trim().max(40).optional().default(""),
  color: z.string().trim().max(80).optional().default(""),
  quantity: z.coerce.number().int().min(1).max(10),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.email().max(180).transform((value) => value.toLowerCase()),
    phone: z.string().trim().transform((value, context) => {
      const normalized = normalizePhone(value);
      if (!normalized) context.addIssue({ code: "custom", message: "Telefone inválido." });
      return normalized ?? "";
    }),
    notes: z.string().trim().max(600).optional().default(""),
  }),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export function checkoutFingerprint(input: CheckoutInput) {
  return createHash("sha256").update(JSON.stringify({
    productId: input.productId, size: input.size, color: input.color,
    quantity: input.quantity, customer: input.customer,
  })).digest("hex");
}

export function resolveCheckoutAttempt(existing: { checkout_fingerprint: string | null; checkout_url: string | null } | null, fingerprint: string) {
  if (!existing) return { action: "create" as const };
  if (existing.checkout_fingerprint !== fingerprint) return { action: "conflict" as const };
  return { action: "reuse" as const, checkoutUrl: existing.checkout_url };
}

export function validateProductSelection(product: {
  active: boolean;
  price: number;
  promotionalPrice?: number | null;
  sizes: string[];
  colors: string[];
}, input: Pick<CheckoutInput, "size" | "color" | "quantity">) {
  if (!product.active) return { ok: false as const, error: "inactive" };
  if (product.sizes.length > 0 && !product.sizes.includes(input.size)) return { ok: false as const, error: "size" };
  if (product.colors.length > 0 && !product.colors.includes(input.color)) return { ok: false as const, error: "color" };
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 10) return { ok: false as const, error: "quantity" };
  const unitPrice = Number(product.promotionalPrice ?? product.price);
  if (!Number.isFinite(unitPrice) || unitPrice < 0.5) return { ok: false as const, error: "price" };
  return { ok: true as const, unitPrice, totalAmount: Number((unitPrice * input.quantity).toFixed(2)) };
}
