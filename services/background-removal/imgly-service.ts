import type { BackgroundRemovalService } from "@/services/background-removal/types";

export const imglyBackgroundRemovalService: BackgroundRemovalService = {
  async remove(file, onProgress) {
    onProgress?.({ stage: "Carregando modelo de recorte...", progress: 5 });
    const { removeBackground } = await import("@imgly/background-removal");
    return removeBackground(file, {
      output: { format: "image/png", quality: 1 },
      progress: (key: string, current: number, total: number) => {
        const progress = total > 0 ? Math.round((current / total) * 100) : 15;
        onProgress?.({ stage: key.includes("fetch") ? "Baixando modelo..." : "Removendo fundo...", progress });
      },
    });
  },
};
