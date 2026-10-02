import { onlyDigits } from "@/lib/format";

export const CUSTOM_QUOTE_MESSAGE = "Oi, vim do site e quero fazer um orçamento de um personalizado.";
export const DEFAULT_ORDER_WHATSAPP_TEMPLATE = "Oi {nome}, sou {vendedora} e estou entrando em contato sobre o seu pedido {numero}. Tudo bem?";
export const MESSAGE_TEMPLATE_VARIABLES = ["nome", "vendedora", "numero", "produto", "total", "status", "cupom"] as const;

export function normalizeWhatsAppNumber(phone: string | null | undefined) {
  const digits = onlyDigits(phone ?? "");
  if (/^\d{10,11}$/.test(digits)) return `55${digits}`;
  if (/^55\d{10,11}$/.test(digits)) return digits;
  return null;
}

export function buildWhatsAppUrl(phone: string | null | undefined, message: string) {
  const number = normalizeWhatsAppNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function renderWhatsAppTemplate(template: string, values: Partial<Record<(typeof MESSAGE_TEMPLATE_VARIABLES)[number], string>>) {
  return MESSAGE_TEMPLATE_VARIABLES.reduce(
    (message, variable) => message.replaceAll(`{${variable}}`, values[variable] ?? ""),
    template,
  );
}
