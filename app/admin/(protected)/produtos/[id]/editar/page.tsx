import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { ProductEditor } from "@/components/admin/product-editor";
import { getProductById } from "@/lib/catalog";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const product = await getProductById(id); if (!product) notFound(); return <main id="conteudo" className="p-4 sm:p-7 lg:p-10"><Link href="/admin/produtos" className="mb-7 inline-flex min-h-11 items-center gap-2 text-xs font-bold uppercase tracking-[.08em]"><ArrowLeft size={16} /> Produtos</Link><header className="mb-8"><p className="eyebrow text-black/45">Edição</p><h1 className="mt-2 max-w-3xl text-4xl font-medium tracking-[-.045em] uppercase sm:text-5xl">{product.name}</h1></header><ProductEditor product={product} /></main>; }
