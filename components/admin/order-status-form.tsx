"use client";

import { useActionState } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { updateOrderAction } from "@/app/admin/order-actions";
import { fulfillmentStatusLabels } from "@/lib/order-status";
import type { ActionState } from "@/app/admin/actions";
import type { FulfillmentStatus } from "@/types/order";

const initialState: ActionState = { ok: false, message: "" };

export function OrderStatusForm({ id, status, notes }: { id: string; status: FulfillmentStatus; notes: string }) {
  const [state, action, pending] = useActionState(updateOrderAction, initialState);
  return (
    <form action={action} className="border-y fine-rule py-7">
      <input type="hidden" name="id" value={id} />
      <h2 className="eyebrow">Andamento interno</h2>
      <div className="mt-5 grid gap-5">
        <label className="admin-label">Situação
          <select className="admin-input" name="fulfillmentStatus" defaultValue={status}>
            {(Object.entries(fulfillmentStatusLabels) as [FulfillmentStatus, string][]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="admin-label">Observações internas
          <textarea className="admin-input min-h-28 normal-case tracking-normal" name="adminNotes" maxLength={1200} defaultValue={notes} placeholder="Prazo combinado, ajustes, retirada ou entrega" />
        </label>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <p role="status" className={`text-sm ${state.ok ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>{state.message}</p>
        <button className="button-primary" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={15} /> : <Save size={15} />}{pending ? "Salvando..." : "Salvar andamento"}</button>
      </div>
    </form>
  );
}

