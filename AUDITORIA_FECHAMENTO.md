# Auditoria de fechamento — Laus Sit

Data: 02/10/2026.

## O que estava correto

- O checkout já possuía `checkoutAttemptId`, impressão digital da tentativa e preço derivado das variantes no servidor (`lib/checkout-domain.ts` e `app/api/checkout/route.ts`).
- A assinatura do webhook Mercado Pago já falhava fechada e a persistência era idempotente por `payment_attempts.external_payment_id` (`lib/mercado-pago.ts` e migration `20260917222234...`).
- O pedido público permanecia limitado ao token da própria order; originais de imagem continuavam privados.
- Modelagem e preço por peça, páginas legais e revalidação básica de produto/configuração já existiam.

## O que precisava fechar

- O filtro público iniciava em Cristianismo e não oferecia “Todas”; “Personalizados” ainda divergia da grafia oficial.
- Não existiam cupons, cookie de atribuição, métricas, reserva concorrente de uso ou total descontado no pedido/preferência.
- Não existiam estoque transacional, perfil/RLS de vendedor ou painel reduzido.
- O WhatsApp administrativo concatenava o telefone sem garantir DDI 55 e tinha texto fixo.
- O admin tinha apenas quatro destinos e não possuía painel, estoque, cupons ou vendedores.
- Ausência temporária das variáveis públicas ativava dados demo até em produção.
- Produtos TESTE e imagens SVG demo não eram desativados por migration.

## Correções

O fechamento está concentrado na migration `20261002090000_operational_closeout.sql` e nas rotas/painéis correspondentes. A migration é aditiva, preserva pedidos e substitui somente a função de confirmação do pagamento para incluir o consumo idempotente do cupom.
