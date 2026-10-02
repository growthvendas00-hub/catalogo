import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildWhatsAppUrl, CUSTOM_QUOTE_MESSAGE, renderWhatsAppTemplate } from "@/lib/whatsapp";

describe("personalized quote WhatsApp", () => {
  it("builds the seller link with the required ready-to-send message", () => {
    expect(buildWhatsAppUrl("+55 (21) 99999-9999", CUSTOM_QUOTE_MESSAGE)).toBe(
      "https://wa.me/5521999999999?text=Oi%2C%20vim%20do%20site%20e%20quero%20fazer%20um%20or%C3%A7amento%20de%20um%20personalizado.",
    );
  });

  it("does not create a link from an invalid number", () => {
    expect(buildWhatsAppUrl("123", CUSTOM_QUOTE_MESSAGE)).toBeNull();
  });

  it("prefixes Brazilian numbers and never uses @", () => {
    const url = buildWhatsAppUrl("(27) 99999-9999", "Teste");
    expect(url).toBe("https://wa.me/5527999999999?text=Teste");
    expect(url).not.toContain("@");
  });

  it("renders every accepted order variable", () => {
    expect(renderWhatsAppTemplate("{nome}|{vendedora}|{numero}|{produto}|{total}|{status}|{cupom}", {
      nome: "Ana", vendedora: "Bia", numero: "ABC12345", produto: "Camiseta", total: "R$ 80,00", status: "Aprovado", cupom: "ANA10",
    })).toBe("Ana|Bia|ABC12345|Camiseta|R$ 80,00|Aprovado|ANA10");
  });

  it("blocks personalized products in the payment API", () => {
    const migration = readFileSync(path.resolve("supabase/migrations/20261002090000_operational_closeout.sql"), "utf8");
    expect(migration).toContain("v_product.category = 'Personalizadas'");
    expect(migration).toContain("raise exception 'Produto indisponível.'");
  });
});
