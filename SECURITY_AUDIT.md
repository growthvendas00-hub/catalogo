# Auditoria de segurança e prontidão — Laus Sit

Data da execução: 17/09/2026

Escopo: repositório local, sem deploy, sem acesso a secrets, sem pagamento e sem aplicar migrations no Supabase remoto.

## Baseline anterior à implementação

- Branch: `main`, sincronizada com `origin/main`.
- HEAD: `5a3d56a fix: use supported Mercado Pago checkout URL`, igual ao snapshot informado.
- Worktree inicial: somente `REVISAO_COMPLETA_LAUS_SIT.md` não rastreado; arquivo preexistente preservado e fora do escopo das alterações.
- Histórico recente confirmado: `5a3d56a`, `12b4736`, `4786ed8`, `b1b0e0c`, `e08b766`, `11c2551`.
- Dependências: `npm ci` concluído; 397 pacotes instalados, 0 vulnerabilidades reportadas. A primeira tentativa no sandbox ficou bloqueada na consulta de audit do npm (`EACCES`); a repetição autorizada com rede concluiu em 5 minutos.
- `npm run typecheck`: passou.
- `npm run lint`: passou.
- `npm run build`: passou; 15 páginas geradas e rotas dinâmicas reconhecidas pelo Next.js 16.3.3.
- Testes automatizados encontrados: nenhum.
- Migrations existentes: `202609120001_initial_schema.sql` e `202609150001_orders_and_payments.sql`.
- Marcadores `TODO`, `FIXME`, `HACK` ou `XXX`: nenhum fora de dependências/build.

## Achados confirmados no baseline

### P0

- Originais de estúdio são enviados para o bucket público `product-images` e persistidos como URL pública em `products.original_image_url`.
- `lib/catalog.ts` usa `select("*")` para produtos/relações e inclui `originalImageUrl` no DTO `Product` entregue a Client Components.

### P1

- A validação do webhook aceita qualquer chamada quando `MERCADO_PAGO_WEBHOOK_SECRET` está ausente.
- `/pedido/[token]` pode sincronizar um `payment_id` antes de amarrá-lo ao pedido da URL.
- Cada POST de checkout cria um pedido; não existe identificador de tentativa com unicidade no banco.
- Um único pagamento e o JSON integral sobrescrevem o estado do pedido; outro pagamento rejeitado pode rebaixar um pedido aprovado e `paid_at` pode ser apagado.
- Não existe trilha normalizada de tentativas/eventos nem ação administrativa de reconciliação.
- `saveProductAction` e duplicação não são transacionais; a duplicação não copia relações.
- Checkout não tem limite explícito de payload e depende apenas da validação de origem quando o header existe.
- Não há headers de segurança definidos em `next.config.ts`.
- Upload de logo aceita SVG arbitrário.
- Não havia testes automatizados.

### P2 / produto e UX

- Falhas parciais de upload podem deixar arquivos órfãos.
- Exclusão de produto referenciado por pedido devolve erro bruto do banco.
- Admin aceita promoção zero, enquanto checkout exige valor mínimo de R$ 0,50.
- Telefone do comprador aceita letras.
- `/pedido` afirma acompanhar atualizações, mas não faz polling.
- `refunded` e `charged_back` usam representação visual de espera.
- DTO público do pedido carrega PII que não é renderizada.
- Navegação mobile do admin perde rótulos e logout.
- Busca/filtro do catálogo não ficam na URL; imagens usam corte que pode ocultar partes da peça.
- `brand_name` e Instagram são pouco aproveitados; sitemap/robots explícitos não existem.

## Estado da implementação

### P0 corrigido no repositório

- Criado bucket privado `product-originals`; o bucket `product-images` fica reservado à imagem final pública.
- A aplicação grava apenas `original_image_path`, zera a coluna legada `original_image_url` em novos uploads e cria signed URL de 60 segundos somente após autenticação admin.
- O acesso direto via Data API deixa de ter privilégio de leitura nas colunas `original_image_url` e `original_image_path`. RLS sozinha não foi tratada como proteção de coluna.
- Projeções de produto/configuração agora são explícitas; DTOs e Client Components públicos não carregam original.
- Upload novo tem compensação: se a imagem final ou o update falha, os arquivos recém-criados são removidos.

> O P0 fica efetivamente fechado em produção somente depois de aplicar a migration e retirar os originais legados do bucket público conforme o runbook abaixo.

### P1 corrigido no repositório

- Webhook Mercado Pago falha fechado sem secret ou sem `x-signature`, `ts`, `v1`, `x-request-id` e `data.id`; compara HMAC com `timingSafeEqual` e mantém `data.id` lowercase no manifesto.
- `/pedido/[token]` carrega primeiro o pedido; token inválido retorna 404 sem consultar Mercado Pago. Retorno só persiste se `external_reference` for o pedido do token.
- Checkout recebe `checkoutAttemptId` UUID do browser, tem unicidade parcial no banco, fingerprint da intenção, reaproveita URL/preference e usa o mesmo UUID no `X-Idempotency-Key` do provedor. Corrida por unique violation é recuperada.
- Preço, disponibilidade, tamanho e cor continuam sendo relidos no servidor. Campos de preço enviados pelo browser são descartados pelo schema.
- `payment_attempts` normaliza uma linha por payment ID. Replays fazem upsert; um payment ID não pode migrar entre pedidos; outro pagamento rejeitado não rebaixa pedido aprovado; o mesmo pode virar `refunded`/`charged_back`; `paid_at` nunca é apagado.
- `raw_payment` legado não é mais escrito nem usado como fonte de verdade. A coluna não foi removida.
- Adicionada reconciliação manual no detalhe admin. Ela consulta por payment ID ou `external_reference`, sem refund/cancel e sem preço do cliente.
- Checkout exige JSON, limita corpo a 16 KiB, exige mesma origem, valida strings/quantidade/telefone e devolve mensagens genéricas. Webhook limita corpo declarado sem bloqueio ingênuo por IP.
- Logs estruturados usam `requestId`, `orderId`, `paymentId`, `preferenceId`, ação/status/categoria; não registram PII, secret ou pagamento bruto.
- Headers: CSP, `nosniff`, referrer, permissions policy, `DENY` para frame e HSTS. CSP contempla Supabase e os assets/worker do IMG.LY; `unsafe-eval` fica limitado ao desenvolvimento.
- Logo de usuário aceita somente PNG/JPEG/WebP. SVG fixo interno do wordmark foi mantido.

### Operação e integridade

- Save de produto e quatro relações usa uma única RPC transacional `save_product_with_relations`.
- Duplicação usa RPC transacional, copia imagens finais/cores/tamanhos/medidas, cria slug novo, acrescenta `— cópia`, nasce inativa e não copia original privado.
- RPCs usam `security invoker`, `search_path = ''`, checagem explícita de `auth.uid()`/admin e grants restritos.
- Delete com pedido preserva `ON DELETE RESTRICT` e orienta desativar em vez de exibir erro bruto.
- Piso de R$ 0,50 foi alinhado em validação admin, checkout e constraints de produto ativo.
- Telefone do comprador é normalizado, limitado a 8–15 dígitos e rejeita letras.
- `PublicOrder` não contém nome, e-mail, telefone, observação ou nota interna.
- Acompanhamento faz polling do banco a cada 10 segundos somente em status não terminal; nunca consulta Mercado Pago por tick.
- Mapper visual separa sucesso, espera, falha e reversão; refund/chargeback não usa relógio.
- Admin mobile tem rótulos, ícones, `aria-current`, alvos de 44+ px e logout visível.

### Design, UX, acessibilidade e SEO

- Busca `q` e filtro `categoria` ficam na URL; refresh/voltar preservam o estado.
- Fotos 4:5 usam `object-contain`, com respiro para não cortar gola, manga ou barra.
- Textos pequenos antes em preto com 38–55% usam `--muted` opaco com contraste mais consistente.
- `brand_name` alimenta alt/aria/title/metadata/Open Graph; Instagram preenchido aparece discretamente no footer.
- Criados `sitemap.xml` apenas com home/produtos ativos e `robots.txt` bloqueando `/admin`, `/pedido` e `/api`; canonical da home e dos produtos foi configurado.
- Home continua editorial, sem carrinho/marketplace/redesign e com catálogo cedo no mobile.

## Migration criada e não aplicada

- `supabase/migrations/20260917222234_secure_catalog_payments_operations.sql`
  - storage privado e MIME raster;
  - privilégios por coluna para ocultar originais;
  - `checkout_attempt_id`/fingerprint e índice unique;
  - `payment_attempts`, RLS, índices e RPC de consolidação;
  - constraints de preço;
  - RPCs transacionais de save/duplicate.

Nenhuma migration foi executada remotamente. **Não publique este código antes de aplicar a migration**, pois checkout, pagamentos, uploads e RPCs dependem dela.

## Runbook manual dos originais legados

1. Fazer backup do banco e do Storage e validar restauração.
2. Aplicar a migration acima primeiro em ambiente de teste/staging e executar os advisors do Supabase.
3. Inventariar cada `products.original_image_url` que aponta para `product-images/originals/{productId}/...`.
4. Copiar o objeto para `product-originals/{productId}/...` sem torná-lo público; conferir hash/tamanho e testar signed URL como admin.
5. Atualizar `products.original_image_path` com o novo path e definir `original_image_url = null` somente após a cópia validada.
6. Confirmar anon: coluna privada sem privilégio, bucket privado sem listagem/download e catálogo usando apenas processada.
7. Remover o objeto antigo do bucket público somente depois da validação e backup. Registrar quantidade migrada/falhas.

O passo não foi executado porque exige credencial e altera dados/storage remoto.

## Testes implementados

- Vitest: assinatura webhook, headers ausentes/errados, lowercase, 401, chamada válida/replay; schema/telefone/preço/seleção/idempotência de checkout; amount mismatch/transições/`paid_at`; associação token-pagamento; DTOs sem original/PII; contratos SQL de bucket, grants, unique, upsert e RPCs.
- Playwright local: home, filtro/busca persistidos na URL e navegação/logout admin em viewport mobile.
- Resultado final registrado no changelog. Nenhum teste usou produção ou dinheiro real.

## Riscos e pendências residuais

- Rate limiting distribuído não foi fingido em memória. Configurar Vercel Firewall ou Redis/Upstash externamente para `POST /api/checkout`, observar falsos positivos e não limitar webhook por IP fixo.
- Confirmar manualmente que `MERCADO_PAGO_WEBHOOK_SECRET` existe no ambiente de venda, que a URL de webhook aponta para `/api/webhooks/mercado-pago` e que a credencial é da conta/ambiente recebedor correto. Nenhum secret foi lido.
- Confirmar manualmente se o token MP é teste ou produção. O repositório não consegue provar isso sem ler a credencial.
- Definir prazo de retenção para PII, `raw_payment` legado e eventos financeiros; depois criar migration separada e revisada para limpeza, sem DROP nesta passada.
- CSP ainda permite script/style inline por compatibilidade com Next.js; uma evolução pode usar nonce dinâmico.
- Conteúdo seed/demonstrativo continua tecnicamente cobável se permanecer ativo em produção. Fotos, medidas, tecidos, cores e preços precisam de validação da dona.
- Produtos “Personalizada” ainda cobram valor fixo embora o texto diga que pode variar; regra de orçamento não foi inventada.
- Busca/filtro/paginação dos pedidos não foram adicionados para evitar transformar o painel em ERP antes de existir volume/requisito.

## Licença IMG.LY

- Versão instalada: `@imgly/background-removal` 1.7.0.
- O pacote aponta `LICENSE.md`; o arquivo distribuído declara GNU AGPL v3.
- A biblioteca foi mantida, conforme escopo. A dona do projeto precisa decidir entre cumprir as obrigações da AGPL no modelo de distribuição/operação escolhido ou contratar/adotar alternativa compatível. Isto é um alerta técnico, não parecer jurídico.

## Pendências de negócio

- Personalizada: preço fechado versus orçamento.
- Estoque; encomenda versus pronta entrega; prazo; entrega/frete; multi-item.
- Estados que devem ficar visíveis ao cliente e eventual WhatsApp automático.
- Quem pode acessar admin, recuperação de senha e processo de revogação.
- Políticas de privacidade, termos, troca/devolução e retenção.
- Domínio; projeto open-source versus fechado; decisão de licença IMG.LY.

## Checklist de produção — não presumido

- [ ] Backup Supabase criado e restauração validada.
- [ ] Migration nova aplicada primeiro fora de produção e depois em produção.
- [ ] Originais legados copiados, verificados e removidos do bucket público.
- [ ] Acesso anon ao bucket/colunas privadas testado e negado.
- [ ] P0/P1 retestados no ambiente implantado.
- [ ] Firewall/rate limit externo do checkout configurado e monitorado.
- [ ] Mercado Pago produtivo, conta recebedora, webhook e secret confirmados manualmente.
- [ ] Fluxo sandbox completo repetido após migration, sem dinheiro real.
- [ ] Fotos, preços, medidas, tecido, cores e conteúdo demo revisados pela dona.
- [ ] WhatsApp, Instagram, logo e `brand_name` conferidos.
- [ ] Privacidade, termos, troca, entrega/frete e retenção publicados.
- [ ] Decisão IMG.LY/AGPL registrada.
- [ ] Typecheck, lint, build, Vitest e Playwright repetidos no commit candidato.
