import type { Metadata } from "next";
import { LegalPage, SupplierDetails } from "@/components/legal-page";
import { getCatalogSettings } from "@/lib/catalog";

export const metadata: Metadata = { title: "Política de Privacidade", description: "Como a Laus Sit trata dados pessoais no catálogo e nos pedidos." };

export default async function PrivacyPage() {
  const settings = await getCatalogSettings();
  return <LegalPage settings={settings} eyebrow="Seus dados" title="Política de Privacidade" introduction="Esta política explica quais dados a Laus Sit utiliza, por que eles são necessários e como você pode exercer seus direitos.">
    <section><h2>1. Quem controla os dados</h2><p>A responsável pelo tratamento dos dados coletados neste catálogo é a operação identificada abaixo.</p><SupplierDetails settings={settings} /></section>
    <section><h2>2. Dados tratados</h2><p>Ao iniciar uma compra, podemos receber nome, e-mail, telefone, observações do pedido, produto, modelagem, tamanho, cor, quantidade, valor e situação do pagamento. A infraestrutura também pode gerar registros técnicos de segurança, como data, horário, endereço IP e informações do navegador.</p></section>
    <section><h2>3. Para que usamos os dados</h2><p>Usamos os dados para identificar o cliente, criar e acompanhar o pedido, processar o pagamento, prestar atendimento, prevenir fraude, cumprir obrigações legais e exercer direitos em processos administrativos ou judiciais.</p></section>
    <section><h2>4. Bases legais</h2><p>O tratamento pode ocorrer para executar o contrato ou procedimentos solicitados antes da compra, cumprir obrigação legal ou regulatória, prevenir fraude, proteger o crédito e atender interesses legítimos compatíveis com a relação comercial. Quando a lei exigir consentimento, ele será solicitado de forma específica.</p></section>
    <section><h2>5. Com quem os dados podem ser compartilhados</h2><p>Utilizamos fornecedores necessários à operação: Mercado Pago para o processamento do pagamento; Supabase para banco de dados, autenticação e arquivos; Vercel para hospedagem e entrega do site; e canais como WhatsApp ou Instagram quando você optar por usá-los. Cada fornecedor trata dados conforme suas próprias políticas e responsabilidades.</p></section>
    <section><h2>6. Pagamentos</h2><p>Os dados completos de cartão, Pix ou conta de pagamento são informados diretamente no ambiente do Mercado Pago. A Laus Sit recebe apenas as informações necessárias para relacionar a cobrança ao pedido e acompanhar sua situação.</p></section>
    <section><h2>7. Cookies e registros técnicos</h2><p>O catálogo não utiliza cookies publicitários próprios. Cookies estritamente necessários podem ser usados na área administrativa e pelos serviços de infraestrutura. Ao acessar páginas externas, como Mercado Pago, WhatsApp ou Instagram, aplicam-se as regras desses serviços.</p></section>
    <section><h2>8. Retenção e segurança</h2><p>Os dados são mantidos pelo período necessário para atender o pedido, prestar suporte, cumprir obrigações fiscais, consumeristas e de prevenção a fraude, e resguardar direitos. Aplicamos controles de acesso e medidas técnicas proporcionais ao serviço, embora nenhum sistema seja absolutamente imune a incidentes.</p></section>
    <section><h2>9. Seus direitos</h2><p>Você pode solicitar confirmação do tratamento, acesso, correção, informação sobre compartilhamentos, portabilidade quando aplicável, revisão de decisões automatizadas e eliminação, anonimização ou bloqueio de dados tratados em desconformidade, observadas as hipóteses legais de conservação.</p></section>
    <section><h2>10. Contato</h2><p>Para dúvidas ou solicitações sobre dados pessoais, use {settings.contactEmail ? <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a> : "o canal de atendimento informado no rodapé"}. Poderemos confirmar sua identidade antes de atender solicitações que envolvam dados pessoais.</p></section>
  </LegalPage>;
}
