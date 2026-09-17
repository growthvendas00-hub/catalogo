"use client";

import { useActionState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { reconcilePaymentAction } from "@/app/admin/order-actions";
import type { ActionState } from "@/app/admin/actions";

const initialState: ActionState = { ok: false, message: "" };

export function ReconcilePaymentForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(reconcilePaymentAction, initialState);
  return (
    <form action={action} className="mt-5">
      <input type="hidden" name="id" value={orderId} />
      <button className="button-secondary w-full" disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" size={15} /> : <RefreshCw size={15} />}
        {pending ? "Consultando..." : "Reconciliar pagamento"}
      </button>
      {state.message && <p role="status" className={`mt-2 text-xs leading-relaxed ${state.ok ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>{state.message}</p>}
    </form>
  );
}
