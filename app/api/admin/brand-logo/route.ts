import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const accepted = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]);
export async function POST(request: Request) { await requireAdmin(); if (!hasSupabaseEnv) return NextResponse.json({ error: "Uploads não persistem no modo demonstração." }, { status: 409 }); const body = await request.formData(); const logo = body.get("logo"); if (!(logo instanceof File) || !accepted.has(logo.type) || logo.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Use SVG, PNG, JPEG ou WebP com até 5 MB." }, { status: 400 }); const ext = logo.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "png"; const path = `logos/${Date.now()}-${crypto.randomUUID()}.${ext}`; const supabase = await createSupabaseServerClient(); const { error } = await supabase.storage.from("brand-assets").upload(path, logo, { contentType: logo.type }); if (error) return NextResponse.json({ error: error.message }, { status: 500 }); const url = supabase.storage.from("brand-assets").getPublicUrl(path).data.publicUrl; return NextResponse.json({ url }); }
