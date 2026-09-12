import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const accepted = new Set(["image/jpeg", "image/png", "image/webp"]);
function extension(file: File) { return file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"; }

export async function POST(request: Request) {
  await requireAdmin();
  if (!hasSupabaseEnv) return NextResponse.json({ error: "Uploads não persistem no modo demonstração." }, { status: 409 });
  const body = await request.formData(); const original = body.get("original"); const processed = body.get("processed"); const productId = String(body.get("productId") ?? "");
  if (!(original instanceof File) || !(processed instanceof File) || !productId) return NextResponse.json({ error: "Envie o original, a versão processada e escolha uma peça." }, { status: 400 });
  if (!accepted.has(original.type) || !accepted.has(processed.type) || original.size > 12 * 1024 * 1024 || processed.size > 12 * 1024 * 1024) return NextResponse.json({ error: "Formato ou tamanho de arquivo inválido." }, { status: 400 });
  const supabase = await createSupabaseServerClient(); const unique = `${Date.now()}-${crypto.randomUUID()}`;
  const originalPath = `originals/${productId}/${unique}.${extension(original)}`; const processedPath = `processed/${productId}/${unique}.${extension(processed)}`;
  const [originalUpload, processedUpload] = await Promise.all([supabase.storage.from("product-images").upload(originalPath, original, { contentType: original.type }), supabase.storage.from("product-images").upload(processedPath, processed, { contentType: processed.type })]);
  if (originalUpload.error || processedUpload.error) return NextResponse.json({ error: originalUpload.error?.message ?? processedUpload.error?.message }, { status: 500 });
  const originalUrl = supabase.storage.from("product-images").getPublicUrl(originalPath).data.publicUrl; const processedUrl = supabase.storage.from("product-images").getPublicUrl(processedPath).data.publicUrl;
  const { error } = await supabase.from("products").update({ original_image_url: originalUrl, processed_image_url: processedUrl, main_image_url: processedUrl }).eq("id", productId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ originalUrl, processedUrl });
}
