import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const accepted = new Set(["image/jpeg", "image/png", "image/webp"]);
function extension(type: string) { return type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg"; }
function storagePath(publicUrl: string | null) {
  if (!publicUrl) return null;
  const marker = "/storage/v1/object/public/brand-assets/";
  try {
    const path = new URL(publicUrl).pathname;
    const index = path.indexOf(marker);
    return index >= 0 ? decodeURIComponent(path.slice(index + marker.length)) : null;
  } catch { return null; }
}

export async function POST(request: Request) {
  await requireAdmin();
  if (!hasSupabaseEnv) return NextResponse.json({ error: "Uploads não persistem no modo demonstração." }, { status: 409 });
  const body = await request.formData();
  const logo = body.get("logo");
  if (!(logo instanceof File) || !accepted.has(logo.type) || logo.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Use PNG, JPEG ou WebP com até 5 MB." }, { status: 400 });
  }
  const supabase = await createSupabaseServerClient();
  const { data: settings } = await supabase.from("catalog_settings").select("logo_url").eq("id", 1).maybeSingle();
  const path = `logos/${Date.now()}-${crypto.randomUUID()}.${extension(logo.type)}`;
  const uploaded = await supabase.storage.from("brand-assets").upload(path, logo, { contentType: logo.type });
  if (uploaded.error) return NextResponse.json({ error: "Não foi possível enviar a logo." }, { status: 500 });
  const url = supabase.storage.from("brand-assets").getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.from("catalog_settings").update({ logo_url: url }).eq("id", 1);
  if (error) {
    await supabase.storage.from("brand-assets").remove([path]);
    return NextResponse.json({ error: "Não foi possível ativar a logo." }, { status: 500 });
  }
  const previousPath = storagePath(settings?.logo_url ?? null);
  if (previousPath && previousPath !== path) await supabase.storage.from("brand-assets").remove([previousPath]);
  return NextResponse.json({ url });
}
