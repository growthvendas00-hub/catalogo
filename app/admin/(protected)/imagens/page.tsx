import { PhotoStudio } from "@/components/admin/photo-studio";
import { getAllProducts } from "@/lib/catalog";
import { isDemoMode } from "@/lib/env";

export const metadata = { title: "Preparar fotos — Admin" };
export default async function ImagesPage() { const products = await getAllProducts(); return <main id="conteudo" className="p-4 sm:p-7 lg:p-10"><header className="mb-8 max-w-3xl"><p className="eyebrow text-[var(--muted)]">Imagens</p><h1 className="mt-2 text-4xl font-medium tracking-[-.045em] uppercase sm:text-5xl">Preparar foto para catálogo</h1><p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">Remova o fundo, centralize a peça e gere uma imagem 4:5 padronizada sem alterar o produto.</p></header><PhotoStudio products={products} demoMode={isDemoMode} /></main>; }
