import "server-only";
import { cache } from "react";
import { demoProducts, demoSettings } from "@/lib/demo-data";
import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CatalogSettings, Category, Product } from "@/types/catalog";

type DbRow = Record<string, unknown>;

function mapProduct(row: DbRow): Product {
  const images = (row.product_images as DbRow[] | null) ?? [];
  const colors = (row.product_colors as DbRow[] | null) ?? [];
  const sizes = (row.product_sizes as DbRow[] | null) ?? [];
  const measurements = (row.product_measurements as DbRow[] | null) ?? [];

  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    category: row.category as Category,
    price: Number(row.price),
    promotionalPrice: row.promotional_price == null ? null : Number(row.promotional_price),
    shortDescription: String(row.short_description ?? ""),
    description: String(row.description ?? ""),
    fabric: String(row.fabric ?? ""),
    composition: String(row.composition ?? ""),
    threadType: String(row.thread_type ?? ""),
    gsm: String(row.gsm ?? ""),
    fit: String(row.fit ?? ""),
    printingMethod: String(row.printing_method ?? ""),
    finish: String(row.finish ?? ""),
    technicalNotes: String(row.technical_notes ?? ""),
    careInstructions: String(row.care_instructions ?? ""),
    observations: String(row.observations ?? ""),
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order ?? 0),
    mainImageUrl: String(row.processed_image_url ?? row.main_image_url ?? "/demo-products/product-01.svg"),
    mainImageAlt: String(row.main_image_alt ?? row.name),
    originalImageUrl: row.original_image_url ? String(row.original_image_url) : null,
    processedImageUrl: row.processed_image_url ? String(row.processed_image_url) : null,
    images: images
      .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
      .map((item) => ({ id: String(item.id), url: String(item.image_url), alt: String(item.alt_text ?? row.name), sortOrder: Number(item.sort_order) })),
    colors: colors
      .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
      .map((item) => ({ id: String(item.id), name: String(item.name), hex: item.hex ? String(item.hex) : null, sortOrder: Number(item.sort_order) })),
    sizes: sizes
      .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
      .map((item) => String(item.name)),
    measurements: measurements
      .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
      .map((item) => ({ id: String(item.id), size: String(item.size), width: Number(item.width), length: Number(item.length), extra: (item.extra as Record<string, string | number>) ?? {}, sortOrder: Number(item.sort_order) })),
  };
}

const productSelect = "*, product_images(*), product_colors(*), product_sizes(*), product_measurements(*)";

export const getPublicProducts = cache(async (): Promise<Product[]> => {
  if (!hasSupabaseEnv) return demoProducts;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("products").select(productSelect).eq("active", true).order("sort_order");
  if (error) throw new Error(`Não foi possível carregar o catálogo: ${error.message}`);
  return (data ?? []).map((row) => mapProduct(row as DbRow));
});

export const getAllProducts = cache(async (): Promise<Product[]> => {
  if (!hasSupabaseEnv) return demoProducts;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("products").select(productSelect).order("sort_order");
  if (error) throw new Error(`Não foi possível carregar os produtos: ${error.message}`);
  return (data ?? []).map((row) => mapProduct(row as DbRow));
});

export const getProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  if (!hasSupabaseEnv) return demoProducts.find((product) => product.slug === slug && product.active) ?? null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("products").select(productSelect).eq("slug", slug).eq("active", true).maybeSingle();
  if (error) throw new Error(`Não foi possível carregar a peça: ${error.message}`);
  return data ? mapProduct(data as DbRow) : null;
});

export const getProductById = cache(async (id: string): Promise<Product | null> => {
  if (!hasSupabaseEnv) return demoProducts.find((product) => product.id === id) ?? null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("products").select(productSelect).eq("id", id).maybeSingle();
  if (error) throw new Error(`Não foi possível carregar a peça: ${error.message}`);
  return data ? mapProduct(data as DbRow) : null;
});

export const getCatalogSettings = cache(async (): Promise<CatalogSettings> => {
  if (!hasSupabaseEnv) return demoSettings;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("catalog_settings").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return demoSettings;
  return {
    brandName: data.brand_name,
    subtitle: data.subtitle,
    institutionalText: data.institutional_text,
    logoUrl: data.logo_url,
    whatsapp: data.whatsapp,
    instagram: data.instagram,
    whatsappMessage: data.whatsapp_message,
    footerText: data.footer_text,
    showColors: data.show_colors,
    showMeasurements: data.show_measurements,
    showTechnicalSheet: data.show_technical_sheet,
  };
});
