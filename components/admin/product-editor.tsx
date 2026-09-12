"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { saveProductAction, type ActionState } from "@/app/admin/actions";
import { slugify } from "@/lib/format";
import type { Product, ProductColor, ProductImage, ProductMeasurement } from "@/types/catalog";

const initialState: ActionState = { ok: false, message: "" };
const emptyProduct: Product = {
  id: "", name: "", slug: "", category: "Tradicional", price: 0, promotionalPrice: null,
  shortDescription: "", description: "", fabric: "", composition: "", threadType: "", gsm: "",
  fit: "Tradicional", printingMethod: "", finish: "", technicalNotes: "", careInstructions: "",
  observations: "", active: true, sortOrder: 0, mainImageUrl: "/demo-products/product-02.svg",
  mainImageAlt: "", images: [], colors: [], sizes: [], measurements: [],
};

function FieldError({ errors }: { errors?: string[] }) { return errors?.length ? <span className="normal-case tracking-normal text-[var(--danger)]">{errors[0]}</span> : null; }
function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) { return <section className="border-t fine-rule py-8"><div className="mb-6 grid gap-2 sm:grid-cols-[13rem_1fr]"><h2 className="eyebrow">{title}</h2>{note && <p className="max-w-xl text-xs leading-relaxed text-black/50">{note}</p>}</div>{children}</section>; }

export function ProductEditor({ product: initialProduct }: { product?: Product }) {
  const product = initialProduct ?? emptyProduct;
  const [state, action, pending] = useActionState(saveProductAction, initialState);
  const [name, setName] = useState(product.name);
  const [slug, setSlug] = useState(product.slug);
  const [slugTouched, setSlugTouched] = useState(Boolean(product.slug));
  const [sizes, setSizes] = useState<string[]>(product.sizes);
  const [newSize, setNewSize] = useState("");
  const [colors, setColors] = useState<ProductColor[]>(product.colors);
  const [measurements, setMeasurements] = useState<ProductMeasurement[]>(product.measurements);
  const [images, setImages] = useState<ProductImage[]>(product.images);

  const changeName = (value: string) => { setName(value); if (!slugTouched) setSlug(slugify(value)); };
  const addSize = () => { const value = newSize.trim().toUpperCase(); if (value && !sizes.includes(value)) setSizes([...sizes, value]); setNewSize(""); };

  return <form action={action} className="max-w-5xl">
    {product.id && <input type="hidden" name="id" value={product.id} />}
    <input type="hidden" name="sizesJson" value={JSON.stringify(sizes)} />
    <input type="hidden" name="colorsJson" value={JSON.stringify(colors)} />
    <input type="hidden" name="measurementsJson" value={JSON.stringify(measurements)} />
    <input type="hidden" name="imagesJson" value={JSON.stringify(images)} />

    <Section title="Informações principais">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="admin-label sm:col-span-2">Nome<FieldError errors={state.fieldErrors?.name} /><input className="admin-input" name="name" value={name} onChange={(event) => changeName(event.target.value)} required /></label>
        <label className="admin-label">Slug<FieldError errors={state.fieldErrors?.slug} /><input className="admin-input" name="slug" value={slug} onChange={(event) => { setSlugTouched(true); setSlug(slugify(event.target.value)); }} required /></label>
        <label className="admin-label">Categoria<select className="admin-input" name="category" defaultValue={product.category}><option>Baby Look</option><option>Tradicional</option><option>Oversized</option></select></label>
        <label className="admin-label">Preço (R$)<FieldError errors={state.fieldErrors?.price} /><input className="admin-input" name="price" type="number" min="0" step="0.01" defaultValue={product.price} required /></label>
        <label className="admin-label">Preço promocional (R$)<input className="admin-input" name="promotionalPrice" type="number" min="0" step="0.01" defaultValue={product.promotionalPrice ?? ""} /></label>
        <label className="admin-label sm:col-span-2">Descrição curta<FieldError errors={state.fieldErrors?.shortDescription} /><textarea className="admin-input min-h-24 normal-case tracking-normal" name="shortDescription" defaultValue={product.shortDescription} required /></label>
        <label className="admin-label sm:col-span-2">Descrição completa<FieldError errors={state.fieldErrors?.description} /><textarea className="admin-input min-h-36 normal-case tracking-normal" name="description" defaultValue={product.description} required /></label>
        <label className="admin-label">Posição no catálogo<input className="admin-input" name="sortOrder" type="number" min="0" defaultValue={product.sortOrder} /></label>
        <label className="flex min-h-12 items-center gap-3 self-end border fine-rule bg-[var(--paper-bright)] px-3 text-sm"><input name="active" type="checkbox" defaultChecked={product.active} className="size-5 accent-black" /> Produto ativo e visível</label>
      </div>
    </Section>

    <Section title="Imagens" note="Use URLs do Supabase Storage ou os placeholders locais. Prepare novas fotos na seção Imagens.">
      <div className="grid gap-5 sm:grid-cols-2"><label className="admin-label">Imagem principal<FieldError errors={state.fieldErrors?.mainImageUrl} /><input className="admin-input normal-case tracking-normal" name="mainImageUrl" defaultValue={product.mainImageUrl} required /></label><label className="admin-label">Texto alternativo<FieldError errors={state.fieldErrors?.mainImageAlt} /><input className="admin-input normal-case tracking-normal" name="mainImageAlt" defaultValue={product.mainImageAlt || product.name} required /></label></div>
      <div className="mt-5 space-y-3">{images.map((image, index) => <div key={index} className="grid gap-3 border fine-rule p-3 sm:grid-cols-[1fr_1fr_auto]"><input aria-label={`URL da imagem ${index + 1}`} className="admin-input" value={image.url} onChange={(e) => setImages(images.map((item, i) => i === index ? { ...item, url: e.target.value } : item))} placeholder="URL da imagem secundária" /><input aria-label={`Texto alternativo da imagem ${index + 1}`} className="admin-input" value={image.alt} onChange={(e) => setImages(images.map((item, i) => i === index ? { ...item, alt: e.target.value } : item))} placeholder="Texto alternativo" /><button type="button" className="button-danger" onClick={() => setImages(images.filter((_, i) => i !== index))} aria-label={`Remover imagem ${index + 1}`}><Trash2 size={15} /></button></div>)}</div>
      <button type="button" className="button-secondary mt-4" onClick={() => setImages([...images, { url: "", alt: "", sortOrder: images.length }])}><Plus size={15} /> Adicionar imagem</button>
    </Section>

    <Section title="Ficha técnica">
      <div className="grid gap-5 sm:grid-cols-2"><label className="admin-label">Tecido<input className="admin-input" name="fabric" defaultValue={product.fabric} /></label><label className="admin-label">Composição<input className="admin-input" name="composition" defaultValue={product.composition} /></label><label className="admin-label">Fio / tipo de algodão<input className="admin-input" name="threadType" defaultValue={product.threadType} /></label><label className="admin-label">Gramatura<input className="admin-input" name="gsm" defaultValue={product.gsm} /></label><label className="admin-label">Modelagem<input className="admin-input" name="fit" defaultValue={product.fit} /></label><label className="admin-label">Método de personalização<input className="admin-input" name="printingMethod" defaultValue={product.printingMethod} /></label><label className="admin-label sm:col-span-2">Acabamento<input className="admin-input" name="finish" defaultValue={product.finish} /></label><label className="admin-label sm:col-span-2">Observações técnicas<textarea className="admin-input min-h-24 normal-case tracking-normal" name="technicalNotes" defaultValue={product.technicalNotes} /></label></div>
    </Section>

    <Section title="Tamanhos" note="Adicione qualquer nomenclatura necessária; não há lista fechada.">
      <div className="flex flex-wrap gap-2">{sizes.map((size) => <button key={size} type="button" className="flex min-h-11 items-center gap-2 border fine-rule bg-[var(--paper-bright)] px-3 text-xs font-semibold" onClick={() => setSizes(sizes.filter((item) => item !== size))}>{size}<Trash2 size={13} aria-label={`Remover ${size}`} /></button>)}</div>
      <div className="mt-4 flex max-w-sm gap-2"><input className="admin-input" value={newSize} onChange={(event) => setNewSize(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addSize(); } }} placeholder="Ex.: G2" aria-label="Novo tamanho" /><button type="button" className="button-secondary shrink-0" onClick={addSize}><Plus size={15} /> Adicionar</button></div>
    </Section>

    <Section title="Tabela de medidas" note="Valores em centímetros. Os dados demo precisam ser confirmados pela costureira.">
      <div className="space-y-3">{measurements.map((item, index) => <div key={index} className="grid grid-cols-2 gap-3 border fine-rule p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"><label className="admin-label">Tamanho<input className="admin-input" value={item.size} onChange={(e) => setMeasurements(measurements.map((row, i) => i === index ? { ...row, size: e.target.value } : row))} /></label><label className="admin-label">Largura<input className="admin-input" type="number" min="0" step="0.1" value={item.width} onChange={(e) => setMeasurements(measurements.map((row, i) => i === index ? { ...row, width: Number(e.target.value) } : row))} /></label><label className="admin-label">Comprimento<input className="admin-input" type="number" min="0" step="0.1" value={item.length} onChange={(e) => setMeasurements(measurements.map((row, i) => i === index ? { ...row, length: Number(e.target.value) } : row))} /></label><button type="button" className="button-danger self-end" onClick={() => setMeasurements(measurements.filter((_, i) => i !== index))} aria-label={`Remover medida ${index + 1}`}><Trash2 size={15} /></button></div>)}</div>
      <button type="button" className="button-secondary mt-4" onClick={() => setMeasurements([...measurements, { size: "", width: 0, length: 0 }])}><Plus size={15} /> Adicionar linha</button>
    </Section>

    <Section title="Cores" note="O nome sempre aparece junto da amostra de cor para manter a acessibilidade.">
      <div className="space-y-3">{colors.map((color, index) => <div key={index} className="grid grid-cols-[1fr_6rem_auto] gap-3 border fine-rule p-3 sm:grid-cols-[1fr_10rem_auto]"><input aria-label={`Nome da cor ${index + 1}`} className="admin-input" value={color.name} onChange={(e) => setColors(colors.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} placeholder="Nome" /><input aria-label={`Código da cor ${index + 1}`} className="admin-input h-full min-h-12 p-1" type="color" value={color.hex ?? "#000000"} onChange={(e) => setColors(colors.map((item, i) => i === index ? { ...item, hex: e.target.value } : item))} /><button type="button" className="button-danger" onClick={() => setColors(colors.filter((_, i) => i !== index))} aria-label={`Remover cor ${index + 1}`}><Trash2 size={15} /></button></div>)}</div>
      <button type="button" className="button-secondary mt-4" onClick={() => setColors([...colors, { name: "", hex: "#000000" }])}><Plus size={15} /> Adicionar cor</button>
    </Section>

    <Section title="Cuidados e observações"><div className="grid gap-5"><label className="admin-label">Cuidados com a peça<textarea className="admin-input min-h-28 normal-case tracking-normal" name="careInstructions" defaultValue={product.careInstructions} /></label><label className="admin-label">Observações gerais<textarea className="admin-input min-h-28 normal-case tracking-normal" name="observations" defaultValue={product.observations} /></label></div></Section>

    <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-4 border-t border-black bg-[#efede7]/95 py-4 backdrop-blur-sm"><p role="status" className={`text-sm ${state.ok ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>{state.message}</p><button className="button-primary min-w-40" disabled={pending}>{pending && <LoaderCircle className="animate-spin" size={15} />}{pending ? "Salvando..." : "Salvar produto"}</button></div>
  </form>;
}
