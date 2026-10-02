import { SellerForm } from "@/components/admin/operations-forms";
import { hasSupabaseSecretEnv } from "@/lib/env";
import { resolveSiteUrl } from "@/lib/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic="force-dynamic";
export const metadata={title:"Vendedores — Admin"};
export default async function SellersPage(){const supabase=await createSupabaseServerClient();const {data:sellers}=await supabase.from("seller_profiles").select("user_id,name,email,whatsapp,active").order("name");return <main id="conteudo" className="p-4 sm:p-7 lg:p-10"><header className="mb-8"><p className="eyebrow text-[var(--muted)]">Equipe</p><h1 className="mt-2 text-4xl font-medium tracking-[-.045em] sm:text-5xl">Vendedores</h1><p className="mt-3 text-sm text-[var(--muted)]">Login: <a className="underline" href={`${resolveSiteUrl().origin}/vendedor/login`}>{resolveSiteUrl().origin}/vendedor/login</a></p></header><SellerForm authAdminAvailable={hasSupabaseSecretEnv}/><div className="mt-8 border-t fine-rule">{(sellers??[]).map(s=><div key={s.user_id} className="grid gap-2 border-b fine-rule py-4 sm:grid-cols-[1fr_1fr_12rem_6rem]"><strong>{s.name}</strong><span>{s.email}</span><span>{s.whatsapp}</span><span>{s.active?"Ativo":"Inativo"}</span></div>)}</div></main>}
