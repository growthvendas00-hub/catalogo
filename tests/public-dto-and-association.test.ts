import { describe, expect, it } from "vitest";
import { mapPublicProduct } from "@/lib/catalog";
import { mapPublicOrder } from "@/lib/orders";
import { PaymentAssociationError, validatePaymentAssociation } from "@/lib/mercado-pago";

describe("public data boundaries", () => {
  it("maps the processed image without exposing the original", () => {
    const product = mapPublicProduct({ id: "p", name: "Peça", slug: "peca", category: "Tradicional", price: 10, active: true, sort_order: 1, main_image_url: "public-old", processed_image_url: "public-final", original_image_url: "private-original", original_image_path: "secret/path", product_images: [], product_colors: [], product_sizes: [], product_measurements: [] });
    expect(product.mainImageUrl).toBe("public-final");
    expect(product).not.toHaveProperty("originalImageUrl");
    expect(JSON.stringify(product)).not.toContain("secret/path");
  });
  it("returns a PublicOrder without customer PII", () => {
    const order = mapPublicOrder({ public_token: "token", product_name: "Peça", product_slug: "peca", quantity: 1, unit_price: 10, total_amount: 10, payment_status: "pending", fulfillment_status: "new", created_at: "now", updated_at: "now", customer_name: "Segredo", customer_email: "secret@example.com", customer_phone: "11999999999" });
    expect(order).not.toHaveProperty("customerName");
    expect(JSON.stringify(order)).not.toContain("secret@example.com");
  });
  it("rejects token A with payment B before persistence", () => {
    expect(() => validatePaymentAssociation({ id: "pay-b", external_reference: "order-b" }, "order-a")).toThrow(PaymentAssociationError);
  });
});
