import { SettingsForm } from "@/components/admin/settings-form";
import { getCatalogSettings } from "@/lib/catalog";
import { isDemoMode } from "@/lib/env";

export const metadata = { title: "Configurações — Admin" };
export default async function SettingsPage() { const settings = await getCatalogSettings(); return <main id="conteudo" className="p-4 sm:p-7 lg:p-10"><header className="mb-8 max-w-3xl"><p className="eyebrow text-black/45">Marca</p><h1 className="mt-2 text-4xl font-medium tracking-[-.045em] uppercase sm:text-5xl">Configurações</h1><p className="mt-4 text-sm leading-relaxed text-black/55">Atualize a identidade, canais de atendimento e as informações exibidas no catálogo.</p></header><SettingsForm settings={settings} demoMode={isDemoMode} /></main>; }
