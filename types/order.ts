export type PaymentStatus =
  | "created"
  | "checkout_error"
  | "pending"
  | "approved"
  | "authorized"
  | "in_process"
  | "in_mediation"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "charged_back"
  | "amount_mismatch";

export type FulfillmentStatus = "new" | "in_production" | "ready" | "delivered" | "cancelled";

export type Order = {
  id: string;
  publicToken: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImageUrl: string | null;
  selectedSize: string | null;
  selectedColor: string | null;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNotes: string;
  paymentStatus: PaymentStatus | string;
  paymentStatusDetail: string | null;
  fulfillmentStatus: FulfillmentStatus;
  adminNotes: string;
  preferenceId: string | null;
  paymentId: string | null;
  paymentMethod: string | null;
  paymentType: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicOrder = Pick<
  Order,
  | "publicToken"
  | "productName"
  | "productSlug"
  | "productImageUrl"
  | "selectedSize"
  | "selectedColor"
  | "quantity"
  | "unitPrice"
  | "totalAmount"
  | "paymentStatus"
  | "paymentStatusDetail"
  | "fulfillmentStatus"
  | "paidAt"
  | "createdAt"
  | "updatedAt"
>;
