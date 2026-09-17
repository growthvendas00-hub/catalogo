"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Download, ImagePlus, LoaderCircle, RotateCcw, Sparkles, Upload } from "lucide-react";
import { prepareCatalogImage } from "@/services/background-removal/canvas";
import type { BackgroundChoice, FramingChoice, RemovalProgress } from "@/services/background-removal/types";
import type { Product } from "@/types/catalog";

export function PhotoStudio({ products, demoMode }: { products: Product[]; demoMode: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState("");
  const [mask, setMask] = useState<Blob | null>(null);
  const [result, setResult] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState("");
  const [background, setBackground] = useState<BackgroundChoice>("white");
  const [framing, setFraming] = useState<FramingChoice>("standard");
  const [status, setStatus] = useState<RemovalProgress | null>(null);
  const [message, setMessage] = useState("");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [privateOriginalUrl, setPrivateOriginalUrl] = useState<string | null>(null);

  useEffect(() => () => { if (originalUrl) URL.revokeObjectURL(originalUrl); if (resultUrl) URL.revokeObjectURL(resultUrl); }, [originalUrl, resultUrl]);
  useEffect(() => { if (!mask) return; void prepareCatalogImage(mask, background, framing).then((blob) => { setResult(blob); setResultUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); }); }); }, [mask, background, framing]);
  useEffect(() => {
    if (demoMode || !productId) return;
    let active = true;
    void fetch(`/api/admin/images?productId=${encodeURIComponent(productId)}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { originalUrl: null })
      .then((payload) => { if (active) setPrivateOriginalUrl(payload.originalUrl ?? null); });
    return () => { active = false; };
  }, [demoMode, productId]);

  const selectFile = (selected?: File) => {
    if (!selected) return;
    if (![/image\/jpeg/, /image\/png/, /image\/webp/].some((type) => type.test(selected.type))) { setMessage("Use uma imagem JPEG, PNG ou WebP."); return; }
    if (selected.size > 12 * 1024 * 1024) { setMessage("A imagem deve ter no máximo 12 MB."); return; }
    if (originalUrl) URL.revokeObjectURL(originalUrl); if (resultUrl) URL.revokeObjectURL(resultUrl);
    setFile(selected); setOriginalUrl(URL.createObjectURL(selected)); setMask(null); setResult(null); setResultUrl(""); setMessage("");
  };
  const removeBackground = async () => {
    if (!file) return;
    setMessage(""); setStatus({ stage: "Preparando...", progress: 1 });
    try {
      const { imglyBackgroundRemovalService } = await import("@/services/background-removal/imgly-service");
      const transparent = await imglyBackgroundRemovalService.remove(file, setStatus);
      setMask(transparent); setStatus(null); setMessage("Imagem preparada. Revise o resultado antes de confirmar.");
    } catch (error) { setStatus(null); setMessage(error instanceof Error ? `Não foi possível remover o fundo. ${error.message}` : "Não foi possível remover o fundo."); }
  };
  const download = () => { if (!resultUrl) return; const anchor = document.createElement("a"); anchor.href = resultUrl; anchor.download = `laus-sit-${Date.now()}.${background === "white" ? "webp" : "png"}`; anchor.click(); };
  const confirm = async () => {
    if (!file || !result) return;
    if (demoMode) { download(); setMessage("Arquivo baixado. No modo demo, nenhuma imagem é enviada ao servidor."); return; }
    setStatus({ stage: "Enviando imagens...", progress: 50 });
    const body = new FormData(); body.set("original", file); body.set("processed", result, background === "white" ? "catalogo.webp" : "catalogo.png"); body.set("productId", productId);
    const response = await fetch("/api/admin/images", { method: "POST", body }); const payload = await response.json(); setStatus(null);
    setMessage(response.ok ? "Imagem preparada e vinculada à peça." : payload.error ?? "Não foi possível enviar a imagem.");
  };
  const reset = () => { setFile(null); setMask(null); setResult(null); setOriginalUrl(""); setResultUrl(""); setMessage(""); if (inputRef.current) inputRef.current.value = ""; };

  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
    <div className="grid border fine-rule bg-[var(--paper-bright)] md:grid-cols-2">
      <div className="border-b fine-rule md:border-b-0 md:border-r"><div className="flex h-12 items-center justify-between border-b fine-rule px-4"><p className="eyebrow">Original</p>{file && <button type="button" onClick={reset} className="flex min-h-10 items-center gap-2 text-xs font-semibold"><RotateCcw size={14} /> Recomeçar</button>}</div><button type="button" onClick={() => inputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); selectFile(e.dataTransfer.files[0]); }} className="relative grid aspect-[4/5] w-full place-items-center overflow-hidden bg-[#e5e2da] p-8 text-center">{originalUrl ? <Image src={originalUrl} alt="Fotografia original selecionada" fill unoptimized className="object-contain" /> : <span><ImagePlus className="mx-auto mb-4" size={28} strokeWidth={1.3} /><strong className="eyebrow block">Selecione ou arraste uma foto</strong><small className="mt-2 block text-[var(--muted)]">JPEG, PNG ou WebP · até 12 MB</small></span>}</button><input ref={inputRef} type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" onChange={(e) => selectFile(e.target.files?.[0])} /></div>
      <div><div className="flex h-12 items-center border-b fine-rule px-4"><p className="eyebrow">Depois</p></div><div className={`relative grid aspect-[4/5] place-items-center overflow-hidden ${background === "transparent" ? "bg-[linear-gradient(45deg,#ddd_25%,transparent_25%),linear-gradient(-45deg,#ddd_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#ddd_75%),linear-gradient(-45deg,transparent_75%,#ddd_75%)] bg-[length:24px_24px] [background-position:0_0,0_12px,12px_-12px,-12px_0]" : "bg-white"}`}>{resultUrl ? <Image src={resultUrl} alt="Prévia da imagem preparada" fill unoptimized className="object-contain" /> : <span className="max-w-xs px-8 text-center text-sm leading-relaxed text-[var(--muted)]">O recorte padronizado em 4:5 aparecerá aqui.</span>}{status && <div className="absolute inset-0 grid place-items-center bg-white/90 p-8 text-center"><div><LoaderCircle className="mx-auto animate-spin" size={28} /><p className="mt-4 text-sm font-semibold">{status.stage}</p><div className="mt-3 h-1 w-48 bg-black/10"><div className="h-full bg-black transition-[width]" style={{ width: `${Math.max(3, Math.min(status.progress, 100))}%` }} /></div></div></div>}</div></div>
    </div>
    <aside className="border fine-rule bg-[var(--paper-bright)] p-5"><h2 className="eyebrow">Ajustes</h2><div className="mt-6 space-y-6"><fieldset><legend className="admin-label mb-2">Fundo</legend><div className="grid grid-cols-2">{(["white", "transparent"] as const).map((value) => <button key={value} type="button" onClick={() => setBackground(value)} className={`min-h-11 border fine-rule text-xs font-semibold ${background === value ? "bg-black text-white" : ""}`}>{value === "white" ? "Branco" : "Transparente"}</button>)}</div></fieldset><fieldset><legend className="admin-label mb-2">Enquadramento</legend><div className="grid">{(["tight", "standard", "wide"] as const).map((value) => <button key={value} type="button" onClick={() => setFraming(value)} className={`min-h-11 border-x border-t px-3 text-left text-xs font-semibold last:border-b ${framing === value ? "bg-black text-white" : ""}`}>{value === "tight" ? "Menos espaço" : value === "standard" ? "Padrão" : "Mais espaço"}</button>)}</div></fieldset>{!demoMode && <label className="admin-label">Usar na peça<select className="admin-input" value={productId} onChange={(e) => setProductId(e.target.value)}>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>}{privateOriginalUrl && <a className="button-secondary w-full" href={privateOriginalUrl} target="_blank" rel="noreferrer">Abrir original privado (60 s)</a>}<button type="button" className="button-primary w-full" disabled={!file || Boolean(status)} onClick={removeBackground}><Sparkles size={15} /> Remover fundo automaticamente</button><button type="button" className="button-secondary w-full" disabled={!result || Boolean(status)} onClick={confirm}>{demoMode ? <Download size={15} /> : <Upload size={15} />}{demoMode ? "Baixar resultado" : "Confirmar e usar"}</button>{result && <button type="button" onClick={download} className="min-h-11 w-full text-xs font-semibold underline underline-offset-4">Baixar uma cópia</button>} {message && <p role="status" className="border-t fine-rule pt-4 text-sm leading-relaxed">{message}</p>}<p className="text-xs leading-relaxed text-[var(--muted)]">A ferramenta remove o fundo no seu navegador. Ela não redesenha, recolore ou altera a estampa da peça. O original fica privado e só abre por link temporário.</p></div></aside>
  </div>;
}
