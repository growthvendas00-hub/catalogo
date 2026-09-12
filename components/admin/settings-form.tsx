"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { saveSettingsAction, type ActionState } from "@/app/admin/actions";
import { LogoUploadField } from "@/components/admin/logo-upload-field";
import type { CatalogSettings } from "@/types/catalog";

const initialState: ActionState = { ok: false, message: "" };
export function SettingsForm({ settings, demoMode }: { settings: CatalogSettings; demoMode: boolean }) {
  const [state, action, pending] = useActionState(saveSettingsAction, initialState);
  return <form action={action} className="max-w-4xl">
    <section className="border-t fine-rule py-8"><h2 className="eyebrow mb-6">Identidade</h2><LogoUploadField initialUrl={settings.logoUrl} demoMode={demoMode} /><div className="mt-6 grid gap-5 sm:grid-cols-2"><label className="admin-label">Nome da marca<input className="admin-input" name="brandName" defaultValue={settings.brandName} /></label><label className="admin-label">Subtítulo<input className="admin-input" name="subtitle" defaultValue={settings.subtitle} /></label><label className="admin-label sm:col-span-2">Texto institucional<textarea className="admin-input min-h-28 normal-case tracking-normal" name="institutionalText" defaultValue={settings.institutionalText} /></label></div></section>
    <section className="border-t fine-rule py-8"><h2 className="eyebrow mb-6">Atendimento</h2><div className="grid gap-5 sm:grid-cols-2"><label className="admin-label">WhatsApp<input className="admin-input" name="whatsapp" inputMode="tel" defaultValue={settings.whatsapp ?? ""} placeholder="5511999999999" /></label><label className="admin-label">Instagram<input className="admin-input" name="instagram" defaultValue={settings.instagram ?? ""} placeholder="laussit" /></label><label className="admin-label sm:col-span-2">Mensagem padrão do WhatsApp<textarea className="admin-input min-h-24 normal-case tracking-normal" name="whatsappMessage" defaultValue={settings.whatsappMessage} /><span className="normal-case tracking-normal text-black/45">Use {"{produto}"} para inserir o nome da peça automaticamente.</span></label></div></section>
    <section className="border-t fine-rule py-8"><h2 className="eyebrow mb-6">Exibição</h2><div className="grid gap-3 sm:grid-cols-2">{[["showColors", "Mostrar cores", settings.showColors], ["showMeasurements", "Mostrar tabela de medidas", settings.showMeasurements], ["showTechnicalSheet", "Mostrar ficha técnica", settings.showTechnicalSheet]].map(([name, label, checked]) => <label key={String(name)} className="flex min-h-12 items-center gap-3 border fine-rule bg-[var(--paper-bright)] px-3 text-sm"><input name={String(name)} type="checkbox" defaultChecked={Boolean(checked)} className="size-5 accent-black" />{String(label)}</label>)}</div><label className="admin-label mt-5">Texto do rodapé<input className="admin-input normal-case tracking-normal" name="footerText" defaultValue={settings.footerText} /></label></section>
    <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-4 border-t border-black bg-[#efede7]/95 py-4 backdrop-blur-sm"><p role="status" className={`text-sm ${state.ok ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>{state.message}</p><button className="button-primary" disabled={pending}>{pending && <LoaderCircle className="animate-spin" size={15} />}{pending ? "Salvando..." : "Salvar configurações"}</button></div>
  </form>;
}
