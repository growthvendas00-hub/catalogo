import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminProductList } from "@/components/admin/admin-product-list";
import { getAllProducts } from "@/lib/catalog";

export const metadata = { title: "Produtos — Admin" };

export default async function AdminProductsPage() {
  const products = await getAllProducts();
  return <main id="conteudo" className="p-4 sm:p-7 lg:p-10"><header className="mb-8 flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow text-black/45">Catálogo</p><h1 className="mt-2 text-4xl font-medium tracking-[-.045em] uppercase sm:text-5xl">Produtos</h1><p className="mt-2 text-sm text-black/55">{products.length} peças cadastradas</p></div><Link className="button-primary" href="/admin/produtos/novo"><Plus size={16} /> Nova peça</Link></header>{products.length ? <AdminProductList products={products} /> : <div className="grid min-h-80 place-items-center border-y fine-rule text-center"><div><p className="eyebrow mb-3">Catálogo vazio</p><p className="text-sm text-black/55">Cadastre sua primeira peça para começar.</p></div></div>}</main>;
}
