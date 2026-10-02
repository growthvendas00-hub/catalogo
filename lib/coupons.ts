export type CouponRule = { type: "percentage" | "fixed"; value: number; maxDiscount?: number | null };

export function calculateCouponDiscount(subtotal: number, coupon: CouponRule) {
  if (!Number.isFinite(subtotal) || subtotal <= 0 || !Number.isFinite(coupon.value) || coupon.value <= 0) return 0;
  const raw = coupon.type === "percentage" ? subtotal * Math.min(coupon.value, 100) / 100 : coupon.value;
  const capped = coupon.maxDiscount == null ? raw : Math.min(raw, coupon.maxDiscount);
  return Number(Math.min(subtotal, Math.max(0, capped)).toFixed(2));
}
