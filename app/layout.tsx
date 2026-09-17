import type { Metadata, Viewport } from "next";
import { getCatalogSettings } from "@/lib/catalog";
import { resolveSiteUrl } from "@/lib/site-url";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getCatalogSettings();
  const title = `${settings.brandName} — Catálogo`;
  return {
    metadataBase: resolveSiteUrl(),
    title: { default: title, template: `%s | ${settings.brandName}` },
    description: settings.subtitle || "Peças, modelagens e personalizações feitas em pequena escala.",
    alternates: { canonical: "/" },
    openGraph: { title, description: settings.subtitle, type: "website", locale: "pt_BR", siteName: settings.brandName },
    icons: { icon: "/icon.svg" },
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f4f1e9" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
        {children}
      </body>
    </html>
  );
}
