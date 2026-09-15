"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/app/admin/actions";

const fulfillmentSchema = z.object({
  id: z.string().uuid(),
  fulfillmentStatus: z.enum(["new", "in_production", "ready", "delivered", "cancelled"]),
  adminNotes: z.string().trim().max(1200),
});

export async function updateOrderAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = fulfillmentSchema.safeParse({
    id: formData.get("id"),
    fulfillmentStatus: formData.get("fulfillmentStatus"),
    adminNotes: formData.get("adminNotes"),
  });
  if (!parsed.success) return { ok: false, message: "Revise o andamento e as observações." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("orders")
    .update({
      fulfillment_status: parsed.data.fulfillmentStatus,
      admin_notes: parsed.data.adminNotes,
    })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, message: `Não foi possível atualizar: ${error.message}` };

  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${parsed.data.id}`);
  return { ok: true, message: "Pedido atualizado." };
}

