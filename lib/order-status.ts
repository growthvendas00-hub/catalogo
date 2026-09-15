import type { FulfillmentStatus } from "@/types/order";

export const paymentStatusLabels: Record<string, string> = {
  created: "Pedido iniciado",
  checkout_error: "Erro ao abrir pagamento",
  pending: "Pagamento pendente",
  approved: "Pagamento aprovado",
  authorized: "Pagamento autorizado",
  in_process: "Pagamento em análise",
  in_mediation: "Pagamento em mediação",
  rejected: "Pagamento recusado",
  cancelled: "Pagamento cancelado",
  refunded: "Pagamento devolvido",
  charged_back: "Pagamento contestado",
  amount_mismatch: "Valor divergente",
};

export const fulfillmentStatusLabels: Record<FulfillmentStatus, string> = {
  new: "Novo",
  in_production: "Em produção",
  ready: "Pronto",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

export function paymentLabel(status: string) {
  return paymentStatusLabels[status] ?? status;
}

