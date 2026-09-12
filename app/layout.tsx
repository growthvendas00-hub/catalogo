import type { Metadata, Viewport } from "next";
import "./globals.css";

function resolveMetadataBase() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  const candidate = configuredUrl || vercelUrl || "http://localhost:3000";
  const normalized = /^https?:\/\//i.test(candidate)
    ? candidate
    : `https://${candidate}`;

  try {
    return new URL(normalized);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: { default: "Laus Sit — Catálogo", template: "%s | Laus Sit" },
  description: "Peças, modelagens e personalizações feitas em pequena escala.",
  openGraph: {
    title: "Laus Sit — Catálogo",
    description: "Peças, modelagens e personalizações feitas em pequena escala.",
    type: "website",
    locale: "pt_BR",
  },
  icons: { icon: "/icon.svg" },
};

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
