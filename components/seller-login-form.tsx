"use client";
import { useActionState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { sellerLoginAction } from "@/app/vendedor/actions";
const initial={ok:false,message:""};
export function SellerLoginForm(){const[state,action,pending]=useActionState(sellerLoginAction,initial);return <form action={action} className="mt-10 grid gap-5"><label className="admin-label">E-mail<input className="admin-input" name="email" type="email" required/></label><label className="admin-label">Senha<input className="admin-input" name="password" type="password" required/></label>{state.message&&<p role="alert" className="text-sm text-[var(--danger)]">{state.message}</p>}<button className="button-primary" disabled={pending}>{pending?<LoaderCircle className="animate-spin" size={16}/>:<ArrowRight size={16}/>}Entrar</button></form>}
