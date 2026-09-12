"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Copy, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { deleteProductAction, duplicateProductAction, toggleProductAction, updatePositionAction } from "@/app/admin/actions";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/types/catalog";

export function AdminProductList({ products }: { products: Product[] }) {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const run = (task: () => Promise<{ message: string }>) => startTransition(async () => { const result = await task(); setMessage(result.message); setTimeout(() => setMessage(""), 4000); });
  return <>
    {message && <div role="status" className="fixed bottom-4 left-4 right-4 z-50 border border-black bg-[var(--ink)] px-4 py-3 text-sm text-white sm:left-auto sm:w-96">{message}</div>}
    <div className={pending ? "pointer-events-none opacity-60" : ""}>
      <div className="hidden grid-cols-[4.5rem_minmax(12rem,1fr)_9rem_7rem_6rem_10rem] gap-4 border-y fine-rule px-4 py-3 text-[.62rem] font-bold tracking-[.1em] text-black/50 uppercase xl:grid"><span>Imagem</span><span>Peça</span><span>Categoria</span><span>Preço</span><span>Posição</span><span>Ações</span></div>
      <ul className="divide-y divide-black/20 border-b fine-rule">
        {products.map((product) => <li key={product.id} className="grid gap-4 bg-[var(--paper-bright)] p-4 xl:grid-cols-[4.5rem_minmax(12rem,1fr)_9rem_7rem_6rem_10rem] xl:items-center">
          <div className="relative aspect-[4/5] w-20 bg-[#e3e0d8] xl:w-auto"><Image src={product.mainImageUrl} alt="" fill sizes="80px" className="object-cover" /></div>
          <div><div className="flex items-center gap-2"><h2 className="font-semibold uppercase tracking-[.02em]">{product.name}</h2><span className={`text-[.6rem] font-bold uppercase ${product.active ? "text-[var(--success)]" : "text-black/40"}`}>{product.active ? "Ativo" : "Inativo"}</span></div><p className="mt-1 text-xs text-black/45">/{product.slug}</p></div>
          <p className="text-xs font-semibold uppercase tracking-[.05em]">{product.category}</p>
          <p className="text-sm tabular-nums">{formatPrice(product.promotionalPrice ?? product.price)}</p>
          <label className="flex items-center gap-2 text-xs"><span className="xl:sr-only">Posição</span><input className="admin-input w-20" type="number" min="0" defaultValue={product.sortOrder} onBlur={(event) => run(() => updatePositionAction(product.id, Number(event.currentTarget.value)))} /></label>
          <div className="flex flex-wrap items-center gap-1">
            <Link href={`/admin/produtos/${product.id}/editar`} className="grid size-10 place-items-center border fine-rule" aria-label={`Editar ${product.name}`}><Pencil size={15} /></Link>
            <button className="grid size-10 place-items-center border fine-rule" onClick={() => run(() => duplicateProductAction(product.id))} aria-label={`Duplicar ${product.name}`}><Copy size={15} /></button>
            <button className="grid size-10 place-items-center border fine-rule" onClick={() => run(() => toggleProductAction(product.id, !product.active))} aria-label={`${product.active ? "Desativar" : "Ativar"} ${product.name}`}>{product.active ? <EyeOff size={15} /> : <Eye size={15} />}</button>
            <button className="grid size-10 place-items-center border border-[var(--danger)] text-[var(--danger)]" onClick={() => { if (window.confirm("Tem certeza que deseja excluir esta peça?")) run(() => deleteProductAction(product.id)); }} aria-label={`Excluir ${product.name}`}><Trash2 size={15} /></button>
          </div>
        </li>)}
      </ul>
    </div>
  </>;
}
