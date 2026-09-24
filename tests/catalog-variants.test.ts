import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getStartingPrice } from "@/lib/product-pricing";

const migration = readFileSync(path.resolve("supabase/migrations/20260920210000_catalog_taxonomy_variants_legal_settings.sql"), "utf8").toLowerCase();

describe("religious catalog and model pricing", () => {
  it("uses the least active model price in the storefront", () => {
    expect(getStartingPrice([
      { model: "Tradicional", price: 80, promotionalPrice: null, active: true },
      { model: "Baby Look", price: 85, promotionalPrice: 75, active: true },
      { model: "Oversized", price: 95, promotionalPrice: null, active: true },
    ])).toBe(75);
  });

  it("ignores inactive models when deriving the storefront price", () => {
    expect(getStartingPrice([
      { model: "Tradicional", price: 80, promotionalPrice: null, active: true },
      { model: "Baby Look", price: 40, promotionalPrice: null, active: false },
      { model: "Oversized", price: 95, promotionalPrice: null, active: true },
    ])).toBe(80);
  });

  it("migrates taxonomy, variants, order snapshots and legal settings", () => {
    expect(migration).toContain("create table if not exists public.product_variants");
    expect(migration).toContain("add column if not exists selected_model");
    expect(migration).toContain("'cristianismo', 'matriz africana', 'ocultismo e misticismo'");
    expect(migration).toContain("insert into public.product_variants");
    expect(migration).toContain("delete from public.product_variants");
    expect(migration).toContain("add column if not exists legal_name");
  });

  it.each(["privacidade", "termos-de-uso", "trocas-e-devolucoes", "entrega"])("ships the %s legal page", (route) => {
    expect(() => readFileSync(path.resolve("app", route, "page.tsx"), "utf8")).not.toThrow();
  });
});
