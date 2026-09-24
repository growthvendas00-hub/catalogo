import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { getCatalogSettings } from "@/lib/catalog";

export const metadata: Metadata = { title: "Trocas e Devoluções", description: "Regras para arrependimento, trocas e produtos com defeito." };

export default async function ReturnsPage() {
  const settings = await getCatalogSettings();
  return <LegalPage settings={settings} eyebrow="Pós-venda" title="Trocas e Devoluções" introduction="Queremos resolver qualquer problema de forma clara, respeitando o Código de Defesa do Consumidor e as características de cada pedido.">
    <section><h2>1. Direito de arrependimento</h2><p>Nas compras realizadas pela internet, você pode comunicar a desistência em até 7 dias corridos contados do recebimento. Entre em contato dentro do prazo, informe o pedido e aguarde as instruções de devolução.</p></section>
    <section><h2>2. Condições da devolução</h2><p>Conserve a peça sem sinais de uso além da verificação necessária, com acessórios e itens enviados. A loja orientará a forma de devolução. Depois do recebimento e conferência, o reembolso será solicitado pelo mesmo meio de pagamento, respeitando os prazos do Mercado Pago e da instituição financeira.</p></section>
    <section><h2>3. Produto com defeito ou divergente</h2><p>Se a peça chegar com defeito, avaria ou diferente do pedido, envie fotos e a descrição do problema assim que possível. A análise e a solução observarão os prazos e alternativas previstos na legislação, incluindo reparo, substituição, abatimento ou restituição quando cabíveis.</p></section>
    <section><h2>4. Peças personalizadas</h2><p>Pedidos personalizados serão analisados considerando a aprovação da arte, as especificações fornecidas e os direitos obrigatórios do consumidor. Esta política não exclui automaticamente o direito de arrependimento nem a responsabilidade por defeitos.</p></section>
    <section><h2>5. Troca de tamanho, cor ou modelagem</h2><p>Solicite a troca pelo canal de atendimento informando o número do pedido e a opção desejada. A troca por preferência depende da disponibilidade. Se houver diferença de preço entre modelagens, o ajuste será informado antes da nova produção ou do envio.</p></section>
    <section><h2>6. Como solicitar</h2><p>Use o e-mail ou o canal de atendimento exibido no rodapé. Informe nome, identificação do pedido, motivo e, quando aplicável, fotografias da peça e da embalagem.</p></section>
  </LegalPage>;
}
