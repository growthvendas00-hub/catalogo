import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(path.resolve("supabase/migrations/20260917222234_secure_catalog_payments_operations.sql"), "utf8").toLowerCase();

describe("database security and atomicity contract", () => {
  it("keeps originals private and checkout attempts unique", () => {
    expect(sql).toContain("'product-originals',\n  false");
    expect(sql).toContain("unique index if not exists orders_checkout_attempt_id_uidx");
  });
  it("normalizes payment attempts and makes replays unique", () => {
    expect(sql).toContain("create table if not exists public.payment_attempts");
    expect(sql).toContain("external_payment_id text not null unique");
    expect(sql).toContain("on conflict (external_payment_id) do update");
  });
  it("saves all product relations inside one RPC transaction", () => {
    expect(sql).toContain("function public.save_product_with_relations");
    for (const table of ["product_images", "product_colors", "product_sizes", "product_measurements"]) expect(sql).toContain(`delete from public.${table}`);
  });
  it("duplicates every relation, starts inactive and omits private originals", () => {
    expect(sql).toContain("function public.duplicate_product_with_relations");
    expect(sql).toContain("care_instructions, observations, false");
    for (const table of ["product_images", "product_colors", "product_sizes", "product_measurements"]) expect(sql).toContain(`insert into public.${table}`);
    const duplicateBody = sql.split("function public.duplicate_product_with_relations")[1];
    expect(duplicateBody).not.toContain("original_image_path");
  });
  it("does not grant anonymous access to orders", () => {
    expect(readFileSync(path.resolve("supabase/migrations/202609150001_orders_and_payments.sql"), "utf8").toLowerCase()).toContain("revoke all on public.orders from anon");
  });
});
