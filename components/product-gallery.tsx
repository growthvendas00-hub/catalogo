"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProductImage } from "@/types/catalog";

export function ProductGallery({ mainUrl, mainAlt, images }: { mainUrl: string; mainAlt: string; images: ProductImage[] }) {
  const all = [{ url: mainUrl, alt: mainAlt }, ...images.filter((item) => item.url !== mainUrl)];
  const [selected, setSelected] = useState(0);
  return (
    <div>
      <div className="relative aspect-[4/5] overflow-hidden bg-[#e9e6de]">
        <Image src={all[selected].url} alt={all[selected].alt} fill priority sizes="(max-width: 899px) 100vw, 55vw" className="object-contain p-4 sm:p-8" />
      </div>
      {all.length > 1 && (
        <div className="grid grid-cols-5 border-l fine-rule" aria-label="Galeria de imagens">
          {all.map((image, index) => (
            <button key={`${image.url}-${index}`} type="button" onClick={() => setSelected(index)} aria-label={`Ver imagem ${index + 1}`} aria-pressed={selected === index} className={`relative aspect-[4/5] border-b border-r fine-rule ${selected === index ? "after:absolute after:inset-0 after:border-2 after:border-black" : "opacity-65 hover:opacity-100"}`}>
              <Image src={image.url} alt="" fill sizes="20vw" className="object-contain p-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
