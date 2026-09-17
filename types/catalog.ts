export type Category = "Baby Look" | "Tradicional" | "Oversized";

export type ProductColor = {
  id?: string;
  name: string;
  hex?: string | null;
  sortOrder?: number;
};

export type ProductMeasurement = {
  id?: string;
  size: string;
  width: number;
  length: number;
  extra?: Record<string, string | number>;
  sortOrder?: number;
};

export type ProductImage = {
  id?: string;
  url: string;
  alt: string;
  sortOrder?: number;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  category: Category;
  price: number;
  promotionalPrice?: number | null;
  shortDescription: string;
  description: string;
  fabric: string;
  composition: string;
  threadType?: string;
  gsm?: string;
  fit: string;
  printingMethod?: string;
  finish?: string;
  technicalNotes?: string;
  careInstructions: string;
  observations?: string;
  active: boolean;
  sortOrder: number;
  mainImageUrl: string;
  mainImageAlt: string;
  images: ProductImage[];
  colors: ProductColor[];
  sizes: string[];
  measurements: ProductMeasurement[];
};

export type PublicProductCard = Pick<
  Product,
  "id" | "name" | "slug" | "category" | "price" | "promotionalPrice" | "sortOrder" | "mainImageUrl" | "mainImageAlt"
>;

export type CatalogSettings = {
  brandName: string;
  subtitle: string;
  institutionalText: string;
  logoUrl?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  whatsappMessage: string;
  footerText: string;
  showColors: boolean;
  showMeasurements: boolean;
  showTechnicalSheet: boolean;
};
