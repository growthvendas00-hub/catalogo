import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { calculateCouponDiscount } from "@/lib/coupons";
import { CATALOG_FILTERS } from "@/types/catalog";

const sql=readFileSync(path.resolve("supabase/migrations/20261002090000_operational_closeout.sql"),"utf8").toLowerCase();

describe("operational closeout",()=>{
  it("keeps the exact category order",()=>expect(CATALOG_FILTERS).toEqual(["Todas","Matriz africana","Ocultismo e misticismo","Cristianismo","Personalizadas"]));
  it("calculates percentage, fixed and capped discounts",()=>{
    expect(calculateCouponDiscount(100,{type:"percentage",value:10})).toBe(10);
    expect(calculateCouponDiscount(80,{type:"fixed",value:100})).toBe(80);
    expect(calculateCouponDiscount(200,{type:"percentage",value:50,maxDiscount:30})).toBe(30);
  });
  it("locks coupons and inventory and counts approved use idempotently",()=>{
    expect(sql).toContain("where c.code=upper(trim(p_coupon_code)) for update");
    expect(sql).toContain("limit 1 for update");
    expect(sql).toContain("payment_id text unique");
    expect(sql).toContain("set status='approved',payment_id=p_payment_id");
  });
  it("enforces seller-only order reads and anonymous denial",()=>{
    expect(sql).toContain("seller_id = (select auth.uid())");
    expect(sql).toContain("revoke all on public.seller_profiles");
  });
  it("stores attribution without pii and exposes the two checkout rpcs",()=>{
    expect(sql).toContain("create table if not exists public.attribution_visits");
    expect(sql).not.toContain("attribution_visits (\n  email");
    expect(sql).toContain("function public.create_checkout_order");
    expect(sql).toContain("function public.release_checkout_reservation");
  });
});
