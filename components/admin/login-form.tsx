"use client";

import { useActionState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { loginAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = { ok: false, message: "" };

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);
  return <form action={action} className="mt-10 grid gap-5"><label className="admin-label">E-mail<input className="admin-input" name="email" type="email" autoComplete="email" required /></label><label className="admin-label">Senha<input className="admin-input" name="password" type="password" autoComplete="current-password" required /></label>{state.message && <p role="alert" className="text-sm text-[var(--danger)]">{state.message}</p>}<button className="button-primary mt-2" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={16} /> : <ArrowRight size={16} />} {pending ? "Entrando..." : "Entrar"}</button></form>;
}
