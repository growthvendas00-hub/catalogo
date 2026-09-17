# Changelog de implementação — Laus Sit

Data: 17/09/2026

Base: `5a3d56a`

Execução: local; sem deploy, sem migration remota, sem leitura de secret e sem pagamento.

## Antes e depois

| Área | Antes | Depois |
|---|---|---|
| Originais | Bucket/URL públicos e DTO público | Bucket privado, path interno, signed URL de 60 s, privilégio por coluna e DTO sem original |
| Webhook | Sem secret aceitava tudo | Fail-closed, HMAC completo, 401 e logs sem dados sensíveis |
| Retorno MP | Payment da query sincronizado antes do token | Token carregado primeiro e `external_reference` obrigatoriamente igual |
| Checkout | Uma order por POST | UUID de tentativa, unique, fingerprint, retry/race e idempotency no MP |
| Pagamento | Uma coluna/JSON sobrescritos | Tentativas normalizadas, replay idempotente e transição protegida |
| Produto | Save/duplicate parciais | RPCs atômicas; duplicata completa, inativa e sem original |
| Pedido público | DTO com PII e sem atualização | DTO mínimo e polling leve apenas do banco |
| Upload | Possíveis órfãos; SVG de logo | Compensação, troca segura e somente raster |
| Mobile admin | Ícones sem rótulo/logout | Rótulos, 44 px, `aria-current` e logout |
| Catálogo/SEO | Estado local, corte de foto, sem sitemap | URL state, `object-contain`, canonical, sitemap e robots |
| Testes | Nenhum | 26 Vitest + 1 Playwright local |

## Migration

### `20260917222234_secure_catalog_payments_operations.sql`

- Adiciona `products.original_image_path` e restringe leitura das colunas originais no Data API.
- Cria/configura `product-originals` privado e remove SVG de novos uploads em `brand-assets`.
- Adiciona `orders.checkout_attempt_id`, `checkout_fingerprint` e unique parcial.
- Cria `payment_attempts`, RLS, grants e índice por pedido/data.
- Cria `record_mercado_pago_payment` com lock da order, amount check, upsert e proteção contra regressão.
- Cria constraints do piso de R$ 0,50 para produto ativo.
- Cria `save_product_with_relations(jsonb)` e `duplicate_product_with_relations(uuid)` transacionais.

Arquivo criado pela CLI oficial do Supabase. Não foi aplicado a nenhum banco.

## APIs e serviços

- `POST /api/checkout`: limite 16 KiB, JSON/m mesma origem, Zod, telefone normalizado, idempotência persistida e preço exclusivamente do banco.
- `POST /api/webhooks/mercado-pago`: fail-closed e logging estruturado.
- `GET /api/orders/[token]`: retorna somente `PublicOrder`, `no-store`, para polling.
- `GET /api/admin/images?productId=`: entrega signed URL curta do original privado.
- `POST /api/admin/images`: original privado, final pública e compensação em falha.
- `POST /api/admin/brand-logo`: somente raster; ativa nova logo antes de remover a anterior e compensa falha.
- `lib/mercado-pago.ts`: buscar, validar associação e persistir foram separados; adicionada reconciliação admin.
- `lib/checkout-domain.ts` e `lib/payment-state.ts`: regras puras testáveis.

## Catálogo e admin

- `lib/catalog.ts` usa projeções explícitas e `mapPublicProduct` sem original.
- `lib/orders.ts` separa `Order` administrativo de `PublicOrder`.
- `components/order-receipt.tsx` concentra o comprovante, mapper visual e polling.
- `AdminNav` tornou-se interativo para estado ativo e preserva navegação/logout no mobile.
- Ações de produto chamam RPCs; delete referenciado devolve orientação para desativar.
- Detalhe do pedido recebeu “Reconciliar pagamento”.
- Filtros `categoria`/`q`, contraste, imagens, marca, Instagram e SEO foram refinados sem redesenho.

## Arquivos novos principais

- `SECURITY_AUDIT.md`
- `CHANGELOG_IMPLEMENTACAO.md`
- `supabase/migrations/20260917222234_secure_catalog_payments_operations.sql`
- `lib/checkout-domain.ts`, `lib/payment-state.ts`, `lib/site-url.ts`
- `app/api/orders/[token]/route.ts`, `app/sitemap.ts`, `app/robots.ts`
- `components/order-receipt.tsx`, `components/admin/reconcile-payment-form.tsx`
- `vitest.config.mts`, `playwright.config.ts`, `tests/*`, `e2e/catalog.spec.ts`

## Testes e comandos

Baseline antes das alterações:

- `npm ci`: passou, 397 pacotes, 0 vulnerabilidades.
- `npm run typecheck`: passou.
- `npm run lint`: passou.
- `npm run build`: passou, 15 páginas.

Validação após implementação:

- `npm run typecheck`: passou.
- `npm run lint`: passou.
- `npm run build`: passou, 17 páginas; inclui `/api/orders/[token]`, `/robots.txt` e `/sitemap.xml`.
- `npm test`: passou, 6 arquivos e 25 testes na primeira rodada. Foi acrescentado mais 1 caso de idempotência depois dessa rodada; resultado final deve ser o registrado na validação final abaixo.
- `npm run test:e2e`: primeira tentativa não iniciou dentro de 120 s por filesystem lento; timeout local aumentado. Segunda execução encontrou e levou à correção do campo de busca controlado. Terceira execução passou: 1 teste em 32,7 s.

## Decisões e limites

- Rate limiting distribuído ficou como configuração externa explícita; não foi criada proteção em memória incompatível com Vercel.
- Não houve DROP de coluna/dado. `raw_payment` e `original_image_url` legados permanecem para migração/retencão controlada, mas não são usados pelos fluxos novos.
- Não foi inventada regra para personalizada, estoque, frete, carrinho ou multi-item.
- IMG.LY 1.7.0 foi mantido; o pacote distribuído declara AGPL v3 e requer decisão do dono do projeto.
- `REVISAO_COMPLETA_LAUS_SIT.md` era arquivo não rastreado preexistente e foi preservado sem alteração.

## Validação final

- `npm run typecheck`: **passou** no estado final.
- `npm run lint`: **passou** no estado final.
- `npm run build`: **passou** no estado final; 17 páginas/rotas geradas.
- `npm test`: **passou**, 6 arquivos e 26 testes.
- `npm run test:e2e`: **passou**, 1 smoke test local em Edge headless.
- `git diff --check`: sem erro de whitespace; somente avisos esperados de normalização LF/CRLF no Windows.
