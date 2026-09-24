import type { Metadata } from "next";
import { LegalPage, SupplierDetails } from "@/components/legal-page";
import { getCatalogSettings } from "@/lib/catalog";

export const metadata: Metadata = { title: "Termos de Uso e Compra", description: "Condições de navegação, pedidos e compras no catálogo Laus Sit." };

export default async function TermsPage() {
  const settings = await getCatalogSettings();
  return <LegalPage settings={settings} eyebrow="Condições da loja" title="Termos de Uso e Compra" introduction="Ao navegar no catálogo ou realizar um pedido, você concorda com estas condições e com as informações apresentadas antes do pagamento.">
    <section><h2>1. Identificação da loja</h2><SupplierDetails settings={settings} /></section>
    <section><h2>2. Catálogo e disponibilidade</h2><p>As imagens procuram representar as peças com fidelidade, mas cores podem variar conforme tela, iluminação e lote. Medidas, tecidos, acabamentos, modelagens e disponibilidade são os informados na página de cada produto e podem ser atualizados antes de uma nova compra.</p></section>
    <section><h2>3. Temas religiosos e culturais</h2><p>As categorias organizam criações inspiradas em tradições, símbolos e imaginários religiosos ou culturais. Salvo indicação expressa, a venda de uma peça não representa vínculo institucional, endosso ou certificação por organização religiosa específica. A Laus Sit busca tratar todas as tradições com respeito.</p></section>
    <section><h2>4. Preço e formação do pedido</h2><p>A vitrine mostra o menor preço disponível com a expressão “A partir de”. O valor final depende da modelagem escolhida e é exibido antes do pagamento. O servidor confere novamente a opção, a disponibilidade e o preço vigente antes de enviar a cobrança ao Mercado Pago.</p></section>
    <section><h2>5. Pagamento</h2><p>O pagamento é processado pelo Mercado Pago. A aprovação, os meios disponíveis e eventuais verificações de segurança seguem as regras do processador. O pedido somente é considerado pago após a confirmação eletrônica recebida pela loja.</p></section>
    <section><h2>6. Produção e atendimento</h2><p>Peças produzidas ou personalizadas sob demanda podem ter prazo de preparação informado durante o atendimento. Detalhes indispensáveis à execução, como arte ou personalização, devem ser confirmados pelos canais oficiais antes do início da produção.</p></section>
    <section><h2>7. Uso do site</h2><p>Não é permitido tentar acessar áreas restritas, interferir na segurança, automatizar compras abusivas, copiar conteúdo protegido ou usar o catálogo para fins ilícitos. Conteúdo, marca, fotografias e criações permanecem protegidos pela legislação aplicável.</p></section>
    <section><h2>8. Cancelamentos, trocas e entrega</h2><p>As regras de arrependimento, troca, defeito e entrega estão nas páginas específicas do rodapé e integram estes termos. Nenhuma disposição limita direitos obrigatórios previstos na legislação brasileira.</p></section>
    <section><h2>9. Atualizações e contato</h2><p>Estes termos podem ser atualizados para refletir mudanças operacionais ou legais. A versão aplicável ao pedido será a disponível na data da compra. Dúvidas podem ser enviadas pelo canal de atendimento informado no rodapé.</p></section>
  </LegalPage>;
}
