"use server";
import { redirect } from "next/navigation";
import type { ActionState } from "@/app/admin/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function sellerLoginAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const supabase=await createSupabaseServerClient();
  const {error}=await supabase.auth.signInWithPassword({email:String(formData.get("email")??""),password:String(formData.get("password")??"")});
  if(error)return{ok:false,message:"E-mail ou senha inválidos."};
  const {data:{user}}=await supabase.auth.getUser();
  const {data:profile}=await supabase.from("seller_profiles").select("user_id").eq("user_id",user!.id).eq("active",true).maybeSingle();
  if(!profile){await supabase.auth.signOut();return{ok:false,message:"Este usuário não possui acesso de vendedor."};}
  redirect("/vendedor");
}
export async function sellerLogoutAction(){const supabase=await createSupabaseServerClient();await supabase.auth.signOut();redirect("/vendedor/login")}
