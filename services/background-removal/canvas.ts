import type { BackgroundChoice, FramingChoice } from "@/services/background-removal/types";

const paddingRatios: Record<FramingChoice, number> = { tight: 0.08, standard: 0.14, wide: 0.22 };

export async function prepareCatalogImage(maskBlob: Blob, background: BackgroundChoice, framing: FramingChoice): Promise<Blob> {
  const bitmap = await createImageBitmap(maskBlob);
  const scan = document.createElement("canvas");
  scan.width = bitmap.width; scan.height = bitmap.height;
  const scanContext = scan.getContext("2d", { willReadFrequently: true });
  if (!scanContext) throw new Error("Canvas não está disponível neste navegador.");
  scanContext.drawImage(bitmap, 0, 0);
  const pixels = scanContext.getImageData(0, 0, scan.width, scan.height).data;
  let minX = scan.width, minY = scan.height, maxX = 0, maxY = 0;
  for (let y = 0; y < scan.height; y += 2) {
    for (let x = 0; x < scan.width; x += 2) {
      if (pixels[(y * scan.width + x) * 4 + 3] > 12) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
    }
  }
  if (maxX <= minX || maxY <= minY) throw new Error("Não foi possível identificar a peça na imagem.");

  const sourceWidth = maxX - minX; const sourceHeight = maxY - minY;
  const outputWidth = Math.min(1600, bitmap.width);
  const outputHeight = Math.round(outputWidth * 1.25);
  const canvas = document.createElement("canvas"); canvas.width = outputWidth; canvas.height = outputHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas não está disponível neste navegador.");
  if (background === "white") { context.fillStyle = "#FFFFFF"; context.fillRect(0, 0, outputWidth, outputHeight); }
  const padding = paddingRatios[framing];
  const availableWidth = outputWidth * (1 - padding * 2); const availableHeight = outputHeight * (1 - padding * 2);
  const scale = Math.min(availableWidth / sourceWidth, availableHeight / sourceHeight, 1);
  const drawWidth = sourceWidth * scale; const drawHeight = sourceHeight * scale;
  context.drawImage(scan, minX, minY, sourceWidth, sourceHeight, (outputWidth - drawWidth) / 2, (outputHeight - drawHeight) / 2, drawWidth, drawHeight);
  bitmap.close();
  const type = background === "transparent" ? "image/png" : "image/webp";
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Falha ao exportar a imagem.")), type, 0.9));
}
