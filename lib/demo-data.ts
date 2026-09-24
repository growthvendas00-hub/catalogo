import type { CatalogSettings, GarmentModel, Product, ProductMeasurement } from "@/types/catalog";

const measurementsByModel: Record<GarmentModel, ProductMeasurement[]> = {
  Oversized: [
    { size: "P", width: 58, length: 72 },
    { size: "M", width: 61, length: 74 },
    { size: "G", width: 64, length: 76 },
    { size: "GG", width: 67, length: 78 },
    { size: "G1", width: 70, length: 80 },
  ],
  Tradicional: [
    { size: "P", width: 50, length: 68 },
    { size: "M", width: 53, length: 70 },
    { size: "G", width: 56, length: 72 },
    { size: "GG", width: 59, length: 74 },
  ],
  "Baby Look": [
    { size: "PP", width: 39, length: 58 },
    { size: "P", width: 42, length: 60 },
    { size: "M", width: 45, length: 62 },
    { size: "G", width: 48, length: 64 },
    { size: "GG", width: 51, length: 66 },
  ],
};

type DemoSeed = Pick<Product, "name" | "slug" | "category" | "price" | "composition" | "sizes" | "colors"> &
  Partial<Pick<Product, "threadType" | "printingMethod" | "finish">>;

const seeds: DemoSeed[] = [
  { name: "Oversized Algodão 40.1", slug: "oversized-algodao-40-1", category: "Cristianismo", price: 120, composition: "100% algodão", sizes: ["P", "M", "G", "GG", "G1"], threadType: "Fio 40.1 penteado", colors: [{ name: "Preto", hex: "#171717" }, { name: "Off-white", hex: "#EEEAE0" }] },
  { name: "Camiseta Tradicional Algodão", slug: "camiseta-tradicional-algodao", category: "Cristianismo", price: 100, composition: "100% algodão", sizes: ["P", "M", "G", "GG"], threadType: "Fio 30.1 penteado", colors: [{ name: "Branco", hex: "#FFFFFF" }, { name: "Preto", hex: "#171717" }] },
  { name: "Camiseta PV Antipilling", slug: "camiseta-pv-antipilling", category: "Cristianismo", price: 70, composition: "67% poliéster, 33% viscose", sizes: ["P", "M", "G", "GG"], finish: "Tratamento antipilling", colors: [{ name: "Cinza", hex: "#888985" }, { name: "Preto", hex: "#171717" }] },
  { name: "Camiseta PP", slug: "camiseta-pp", category: "Matriz africana", price: 60, composition: "Malha PP", sizes: ["P", "M", "G", "GG"], colors: [{ name: "Branco", hex: "#FFFFFF" }, { name: "Vinho", hex: "#6D2635" }] },
  { name: "Baby Look Algodão", slug: "baby-look-algodao", category: "Matriz africana", price: 85, composition: "100% algodão", sizes: ["PP", "P", "M", "G", "GG"], colors: [{ name: "Branco", hex: "#FFFFFF" }, { name: "Off-white", hex: "#EEEAE0" }] },
  { name: "Baby Look PV Antipilling", slug: "baby-look-pv-antipilling", category: "Matriz africana", price: 75, composition: "67% poliéster, 33% viscose", sizes: ["PP", "P", "M", "G"], finish: "Tratamento antipilling", colors: [{ name: "Cinza", hex: "#888985" }, { name: "Vinho", hex: "#6D2635" }] },
  { name: "Oversized Essentials", slug: "oversized-essentials", category: "Ocultismo e misticismo", price: 125, composition: "100% algodão", sizes: ["P", "M", "G", "GG", "G1"], threadType: "Fio 30.1 premium", colors: [{ name: "Off-white", hex: "#EEEAE0" }, { name: "Preto", hex: "#171717" }] },
  { name: "Oversized Personalizada", slug: "oversized-personalizada", category: "Ocultismo e misticismo", price: 140, composition: "100% algodão", sizes: ["P", "M", "G", "GG", "G1"], printingMethod: "DTF, silk ou bordado — sob consulta", colors: [{ name: "Preto", hex: "#171717" }, { name: "Branco", hex: "#FFFFFF" }] },
  { name: "Tradicional Personalizada", slug: "tradicional-personalizada", category: "Cristianismo", price: 115, composition: "100% algodão", sizes: ["P", "M", "G", "GG"], printingMethod: "DTF ou silk — sob consulta", colors: [{ name: "Branco", hex: "#FFFFFF" }, { name: "Vinho", hex: "#6D2635" }] },
  { name: "Baby Look Personalizada", slug: "baby-look-personalizada", category: "Ocultismo e misticismo", price: 95, composition: "100% algodão", sizes: ["PP", "P", "M", "G"], printingMethod: "DTF ou silk — sob consulta", colors: [{ name: "Off-white", hex: "#EEEAE0" }, { name: "Cinza", hex: "#888985" }] },
];

export const demoProducts: Product[] = seeds.map((seed, index) => ({
  id: `demo-${String(index + 1).padStart(2, "0")}`,
  ...seed,
  shortDescription: `${seed.category} produzida em pequena escala, com acabamento cuidadoso e conforto para o uso diário.`,
  description: `Uma peça versátil da Laus Sit, feita para vestir com conforto e personalidade. Pode ser usada lisa ou personalizada conforme a necessidade do seu projeto.`,
  fabric: seed.composition.includes("poliéster") ? "Malha PV antipilling" : seed.composition === "Malha PP" ? "Malha PP" : "Meia malha de algodão",
  fit: "Disponível em Tradicional, Baby Look e Oversized",
  gsm: "A confirmar conforme a modelagem",
  printingMethod: seed.printingMethod ?? "Aceita personalização — consulte técnicas e quantidades",
  finish: seed.finish ?? "Gola canelada e reforço ombro a ombro",
  technicalNotes: "Dados técnicos demonstrativos. Confirme tecido, gramatura e acabamento antes de publicar.",
  careInstructions: "Lavar do avesso, com cores similares e em ciclo suave. Não usar alvejante. Secar à sombra. Não passar diretamente sobre a estampa.",
  observations: "Cores e medidas podem apresentar pequenas variações entre lotes.",
  active: true,
  sortOrder: index + 1,
  mainImageUrl: `/demo-products/product-${String(index + 1).padStart(2, "0")}.svg`,
  mainImageAlt: `${seed.name} — imagem demonstrativa`,
  images: [],
  variants: [
    { model: "Tradicional", price: seed.price, promotionalPrice: null, active: true, sortOrder: 0 },
    { model: "Baby Look", price: seed.price, promotionalPrice: null, active: true, sortOrder: 1 },
    { model: "Oversized", price: seed.price + 20, promotionalPrice: null, active: true, sortOrder: 2 },
  ],
  measurements: measurementsByModel.Tradicional.filter((item) => seed.sizes.includes(item.size)),
}));

export const demoSettings: CatalogSettings = {
  brandName: "Laus Sit",
  subtitle: "Peças, modelagens e personalizações.",
  institutionalText: "Camisetas feitas em pequena escala, com escolhas de tecido, modelagem e estampa para vestir ideias com intenção.",
  whatsapp: "5511999999999",
  instagram: "laussit",
  legalName: null,
  taxId: null,
  contactEmail: null,
  businessAddress: null,
  whatsappMessage: "Olá! Gostaria de saber mais sobre a peça {produto}.",
  footerText: "Laus Sit — feito com cuidado, para vestir do seu jeito.",
  showColors: true,
  showMeasurements: true,
  showTechnicalSheet: true,
};

export const DEMO_MEASUREMENTS_NOTICE = "Medidas demonstrativas: precisam ser confirmadas pela costureira antes da publicação.";
