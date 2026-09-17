import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const accepted = new Set(["image/jpeg", "image/png", "image/webp"]);
const postgresUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function extension(file: File) { return file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"; }

export async function GET(request: Request) {
  await requireAdmin();
  if (!hasSupabaseEnv) return NextResponse.json({ originalUrl: null });
  const productId = new URL(request.url).searchParams.get("productId") ?? "";
  if (!postgresUuid.test(productId)) return NextResponse.json({ error: "Peça inválida." }, { status: 400 });
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("products").select("original_image_path").eq("id", productId).maybeSingle();
  if (error) return NextResponse.json({ error: "Não foi possível consultar o original." }, { status: 500 });
  if (!data?.original_image_path) return NextResponse.json({ originalUrl: null });
  const signed = await supabase.storage.from("product-originals").createSignedUrl(data.original_image_path, 60);
  if (signed.error) return NextResponse.json({ error: "Não foi possível abrir o original." }, { status: 500 });
  return NextResponse.json({ originalUrl: signed.data.signedUrl }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  await requireAdmin();
  if (!hasSupabaseEnv) return NextResponse.json({ error: "Uploads não persistem no modo demonstração." }, { status: 409 });
  const body = await request.formData();
  const original = body.get("original");
  const processed = body.get("processed");
  const productId = String(body.get("productId") ?? "");
  if (!(original instanceof File) || !(processed instanceof File) || !postgresUuid.test(productId)) {
    return NextResponse.json({ error: "Envie o original, a versão processada e escolha uma peça." }, { status: 400 });
  }
  if (!accepted.has(original.type) || !accepted.has(processed.type) || original.size > 12 * 1024 * 1024 || processed.size > 12 * 1024 * 1024) {
    return NextResponse.json({ error: "Formato ou tamanho de arquivo inválido." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const privileged = createSupabaseAdminClient();
  const { data: previousProduct } = await privileged.from("products").select("original_image_path").eq("id", productId).maybeSingle();
  const unique = `${Date.now()}-${crypto.randomUUID()}`;
  const originalPath = `${productId}/${unique}.${extension(original)}`;
  const processedPath = `processed/${productId}/${unique}.${extension(processed)}`;
  const originalUpload = await supabase.storage.from("product-originals").upload(originalPath, original, { contentType: original.type });
  if (originalUpload.error) return NextResponse.json({ error: "Não foi possível guardar o original." }, { status: 500 });

  const processedUpload = await supabase.storage.from("product-images").upload(processedPath, processed, { contentType: processed.type });
  if (processedUpload.error) {
    await supabase.storage.from("product-originals").remove([originalPath]);
    return NextResponse.json({ error: "Não foi possível guardar a imagem final." }, { status: 500 });
  }

  const processedUrl = supabase.storage.from("product-images").getPublicUrl(processedPath).data.publicUrl;
  const { error } = await privileged.from("products").update({
    original_image_path: originalPath,
    original_image_url: null,
    processed_image_url: processedUrl,
    main_image_url: processedUrl,
  }).eq("id", productId);
  if (error) {
    await Promise.all([
      supabase.storage.from("product-originals").remove([originalPath]),
      supabase.storage.from("product-images").remove([processedPath]),
    ]);
    return NextResponse.json({ error: "Não foi possível vincular as imagens à peça." }, { status: 500 });
  }

  if (previousProduct?.original_image_path && previousProduct.original_image_path !== originalPath) {
    await supabase.storage.from("product-originals").remove([previousProduct.original_image_path]);
  }
  const signed = await supabase.storage.from("product-originals").createSignedUrl(originalPath, 60);
  return NextResponse.json({ originalUrl: signed.data?.signedUrl ?? null, processedUrl });
}
