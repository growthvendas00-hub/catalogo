import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { getCatalogSettings } from "@/lib/catalog";

export const metadata: Metadata = { title: "Política de Entrega", description: "Como funcionam produção, prazo e entrega dos pedidos Laus Sit." };

export default async function DeliveryPage() {
  const settings = await getCatalogSettings();
  return <LegalPage settings={settings} eyebrow="Seu pedido" title="Política de Entrega" introduction="O prazo total pode incluir produção e transporte. As condições concretas serão confirmadas com o cliente antes do envio.">
    <section><h2>1. Confirmação do pedido</h2><p>A preparação começa após a confirmação do pagamento e, quando houver personalização, após a aprovação das informações necessárias. Acompanhamentos internos como “em produção”, “pronto” e “entregue” podem ser atualizados pela equipe.</p></section>
    <section><h2>2. Prazo de produção</h2><p>O prazo depende da modelagem, do estoque, da quantidade e da personalização. A estimativa específica será informada no atendimento do pedido. Alterações solicitadas depois da aprovação podem exigir novo prazo.</p></section>
    <section><h2>3. Modalidade e custo de entrega</h2><p>Retirada, transportadora, entrega local ou envio postal serão combinados conforme o endereço e a disponibilidade. Eventuais custos e a previsão de transporte serão informados antes da confirmação da modalidade.</p></section>
    <section><h2>4. Endereço e recebimento</h2><p>Confira os dados de entrega informados no atendimento. Se houver erro, avise antes do envio. Uma nova remessa causada por endereço incorreto, ausência ou recusa injustificada poderá depender do pagamento de novo frete, quando permitido.</p></section>
    <section><h2>5. Atraso, extravio ou avaria</h2><p>Se o prazo informado terminar sem entrega, entre em contato para que a loja acompanhe o transporte. Em caso de embalagem violada ou avaria, registre fotografias e comunique o problema para análise e solução.</p></section>
  </LegalPage>;
}
