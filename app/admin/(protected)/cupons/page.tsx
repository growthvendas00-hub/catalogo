import { deleteCouponAction } from "@/app/admin/operational-actions";
import { CouponForm, CouponLink } from "@/components/admin/operations-forms";
import { resolveSiteUrl } from "@/lib/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";

export const dynamic="force-dynamic";
export const metadata={title:"Cupons — Admin"};
export default async function CouponsPage(){
  const supabase=await createSupabaseServerClient();
  const [{data:coupons},{data:products},{data:sellers},{data:visits},{data:orders},{data:redemptions}]=await Promise.all([
    supabase.from("coupons").select("id,code,source_name,discount_type,discount_value,max_uses,active,seller_id").order("created_at",{ascending:false}),
    supabase.from("products").select("id,name").order("name"),supabase.from("seller_profiles").select("user_id,name").eq("active",true),
    supabase.from("attribution_visits").select("coupon_id"),supabase.from("orders").select("coupon_id,total_amount,payment_status"),
    supabase.from("coupon_redemptions").select("coupon_id,status"),
  ]);
  const baseUrl=resolveSiteUrl().origin;
  return <main id="conteudo" className="p-4 sm:p-7 lg:p-10"><header className="mb-8"><p className="eyebrow text-[var(--muted)]">Atribuição</p><h1 className="mt-2 text-4xl font-medium tracking-[-.045em] sm:text-5xl">Cupons</h1></header><CouponForm products={(products??[]).map(p=>({id:p.id,name:p.name}))} sellers={(sellers??[]).map(s=>({id:s.user_id,name:s.name}))}/><div className="mt-8 border-t fine-rule">{(coupons??[]).map(c=>{const clicks=(visits??[]).filter(v=>v.coupon_id===c.id).length;const linked=(orders??[]).filter(o=>o.coupon_id===c.id);const approved=linked.filter(o=>o.payment_status==="approved");const approvedValue=approved.reduce((sum,o)=>sum+Number(o.total_amount),0);const used=(redemptions??[]).filter(r=>r.coupon_id===c.id&&r.status==="approved").length;return <article key={c.id} className="grid gap-3 border-b fine-rule py-5 xl:grid-cols-[10rem_1fr_repeat(5,6rem)_3rem] xl:items-center"><div><strong>{c.code}</strong><small className="block text-[var(--muted)]">{c.source_name}</small></div><CouponLink code={c.code} baseUrl={baseUrl}/><span className="text-xs">{clicks} cliques</span><span className="text-xs">{linked.length} pedidos</span><span className="text-xs">{approved.length} aprovados</span><span className="text-xs">{formatPrice(approvedValue)}</span><span className="text-xs">{c.max_uses==null?"∞":Math.max(0,c.max_uses-used)} restantes</span><form action={deleteCouponAction}><input type="hidden" name="id" value={c.id}/><button className="min-h-11 text-xs underline" aria-label={`Excluir ${c.code}`}>Excluir</button></form></article>})}</div></main>;
}
