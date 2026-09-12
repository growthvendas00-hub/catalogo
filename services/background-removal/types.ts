export type RemovalProgress = { stage: string; progress: number };
export type BackgroundChoice = "white" | "transparent";
export type FramingChoice = "tight" | "standard" | "wide";

export interface BackgroundRemovalService {
  remove(file: Blob, onProgress?: (status: RemovalProgress) => void): Promise<Blob>;
}
