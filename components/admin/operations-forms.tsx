"use client";

import { useActionState, useMemo, useState } from "react";
import { Copy, LoaderCircle } from "lucide-react";
import { createSellerAction, saveCouponAction, saveInventoryAction } from "@/app/admin/operational-actions";
import type { ActionState } from "@/app/admin/actions";
import { CATALOG_CATEGORIES, GARMENT_MODELS } from "@/types/catalog";

const initial: ActionState = { ok: false, message: "" };
type Option = { id: string; name: string };

export function CouponForm({ products, sellers }: { products: Option[]; sellers: Option[] }) {
  const [state, action, pending] = useActionState(saveCouponAction, initial);
  return <form action={action} className="grid gap-4 border-y fine-rule bg-[var(--paper-bright)] p-5 sm:grid-cols-2 xl:grid-cols-4">
    <label className="admin-label">Código<input className="admin-input uppercase" name="code" required placeholder="MARIA10" /></label>
    <label className="admin-label">Nome da origem<input className="admin-input normal-case tracking-normal" name="sourceName" required placeholder="Maria / Instagram" /></label>
    <label className="admin-label">Tipo<select className="admin-input" name="discountType"><option value="percentage">Percentual</option><option value="fixed">Valor fixo</option></select></label>
    <label className="admin-label">Valor<input className="admin-input" name="discountValue" type="number" min="0.01" step="0.01" required /></label>
    <label className="admin-label">Teto de desconto<input className="admin-input" name="maxDiscount" type="number" min="0.01" step="0.01" placeholder="Opcional" /></label>
    <label className="admin-label">Máximo de usos<input className="admin-input" name="maxUses" type="number" min="1" placeholder="Ilimitado" /></label>
    <label className="admin-label">Início (São Paulo)<input className="admin-input" name="startsAt" type="datetime-local" /></label>
    <label className="admin-label">Fim (São Paulo)<input className="admin-input" name="endsAt" type="datetime-local" /></label>
    <label className="admin-label">Produto<select className="admin-input" name="productId"><option value="">Toda a loja</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <label className="admin-label">Categoria<select className="admin-input" name="category"><option value="">Todas</option>{CATALOG_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label>
    <label className="admin-label">Dono<select className="admin-input" name="ownerType"><option value="admin">Admin</option><option value="seller">Vendedor</option></select></label>
    <label className="admin-label">Vendedor<select className="admin-input" name="sellerId"><option value="">Nenhum</option>{sellers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    <label className="flex min-h-12 items-center gap-3 text-sm"><input className="size-5 accent-black" type="checkbox" name="active" defaultChecked /> Ativo</label>
    <div className="flex items-end"><button className="button-primary w-full" disabled={pending}>{pending&&<LoaderCircle className="animate-spin" size={15}/>}Salvar cupom</button></div>
    {state.message&&<p role="status" className={`sm:col-span-2 xl:col-span-4 ${state.ok?"text-[var(--success)]":"text-[var(--danger)]"}`}>{state.message}</p>}
  </form>;
}

export function CouponLink({ code, baseUrl }: { code: string; baseUrl: string }) {
  const link = `${baseUrl}/?cupom=${encodeURIComponent(code)}`;
  const [copied,setCopied]=useState(false);
  return <div className="flex min-w-0 items-center gap-2"><code className="min-w-0 truncate text-xs">{link}</code><button type="button" className="grid size-11 shrink-0 place-items-center border fine-rule" aria-label={`Copiar link ${code}`} onClick={async()=>{await navigator.clipboard.writeText(link);setCopied(true);}}><Copy size={15}/></button><span className="sr-only" role="status">{copied?"Copiado":""}</span></div>;
}

export function InventoryForm({ products }: { products: Option[] }) {
  const [state, action, pending] = useActionState(saveInventoryAction, initial);
  return <form action={action} className="grid gap-4 border-y fine-rule bg-[var(--paper-bright)] p-5 sm:grid-cols-2 xl:grid-cols-4">
    <label className="admin-label">Produto<select className="admin-input" name="productId" required><option value="">Selecione</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <label className="admin-label">Modelagem<select className="admin-input" name="model"><option value="">Todas</option>{GARMENT_MODELS.map(m=><option key={m}>{m}</option>)}</select></label>
    <label className="admin-label">Tamanho<input className="admin-input" name="size" placeholder="Todos / P / M" /></label>
    <label className="admin-label">Cor<input className="admin-input" name="color" placeholder="Todas / Preto" /></label>
    <label className="admin-label">Quantidade<input className="admin-input" name="quantity" type="number" min="0" placeholder="Vazio = ilimitado" /></label>
    <label className="flex min-h-12 items-center gap-3 text-sm"><input className="size-5 accent-black" name="active" type="checkbox" defaultChecked /> Ativo</label>
    <button className="button-primary self-end" disabled={pending}>Salvar estoque</button>
    {state.message&&<p role="status" className={state.ok?"text-[var(--success)]":"text-[var(--danger)]"}>{state.message}</p>}
  </form>;
}

export function SellerForm({ authAdminAvailable }: { authAdminAvailable: boolean }) {
  const [state, action, pending] = useActionState(createSellerAction, initial);
  const [name,setName]=useState("");
  const preview=useMemo(()=>name||"Vendedora",[name]);
  return <form action={action} className="grid gap-4 border-y fine-rule bg-[var(--paper-bright)] p-5 sm:grid-cols-2">
    <label className="admin-label">Nome<input className="admin-input normal-case tracking-normal" name="name" value={name} onChange={e=>setName(e.target.value)} required /></label>
    <label className="admin-label">WhatsApp<input className="admin-input" name="whatsapp" placeholder="(27) 99999-9999" required /></label>
    <label className="admin-label">E-mail<input className="admin-input normal-case tracking-normal" name="email" type="email" required /></label>
    <label className="admin-label">Senha inicial<input className="admin-input" name="password" type="password" minLength={8} required={authAdminAvailable} /></label>
    {!authAdminAvailable&&<label className="admin-label sm:col-span-2">UUID do usuário criado no Supabase Auth<input className="admin-input" name="userId" /><span className="normal-case tracking-normal text-[var(--muted)]">O passo manual está documentado em MANUAL_FINALIZACAO.md.</span></label>}
    <label className="flex min-h-12 items-center gap-3 text-sm"><input className="size-5 accent-black" name="active" type="checkbox" defaultChecked /> Ativo</label>
    <button className="button-primary" disabled={pending}>{pending?"Criando...":`Criar ${preview}`}</button>
    {state.message&&<p role="status" className={`sm:col-span-2 ${state.ok?"text-[var(--success)]":"text-[var(--danger)]"}`}>{state.message}</p>}
  </form>;
}
