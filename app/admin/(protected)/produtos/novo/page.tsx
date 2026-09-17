import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductEditor } from "@/components/admin/product-editor";

export const metadata = { title: "Nova peça — Admin" };
export default function NewProductPage() { return <main id="conteudo" className="p-4 sm:p-7 lg:p-10"><Link href="/admin/produtos" className="mb-7 inline-flex min-h-11 items-center gap-2 text-xs font-bold uppercase tracking-[.08em]"><ArrowLeft size={16} /> Produtos</Link><header className="mb-8"><p className="eyebrow text-[var(--muted)]">Cadastro</p><h1 className="mt-2 text-4xl font-medium tracking-[-.045em] uppercase sm:text-5xl">Nova peça</h1></header><ProductEditor /></main>; }
