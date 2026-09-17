import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { ProductDetails } from "@/components/product-details";
import { ProductGallery } from "@/components/product-gallery";
import { SiteHeader } from "@/components/site-header";
import { getCatalogSettings, getProductBySlug } from "@/lib/catalog";
import { hasCheckoutEnv, isDemoMode } from "@/lib/env";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getProductBySlug(slug), getCatalogSettings()]);
  if (!product) return { title: "Peça não encontrada" };
  return {
    title: product.name,
    description: product.shortDescription,
    alternates: { canonical: `/produto/${product.slug}` },
    openGraph: { title: `${product.name} | ${settings.brandName}`, description: product.shortDescription, siteName: settings.brandName, images: [{ url: product.mainImageUrl, alt: `${product.mainImageAlt} — ${settings.brandName}` }] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getProductBySlug(slug), getCatalogSettings()]);
  if (!product) notFound();
  return <><SiteHeader settings={settings} /><main id="conteudo" className="container-wide"><div className="border-b fine-rule px-[var(--page-gutter)] py-4"><Link href="/" className="inline-flex min-h-11 items-center gap-2 text-xs font-bold tracking-[.08em] uppercase"><ArrowLeft size={16} aria-hidden /> Voltar ao catálogo</Link></div><div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(30rem,.9fr)]"><div className="border-b fine-rule lg:border-b-0 lg:border-r"><ProductGallery mainUrl={product.mainImageUrl} mainAlt={product.mainImageAlt} images={product.images} /></div><ProductDetails product={product} settings={settings} demoMode={isDemoMode} checkoutEnabled={hasCheckoutEnv} /></div></main></>;
}
