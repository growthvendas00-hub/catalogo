# Laus Sit — catálogo digital

Catálogo editorial, mobile-first, com painel administrativo, checkout de uma peça por vez no Mercado Pago e acompanhamento de pedidos.

## O que está pronto

- catálogo público com filtros, busca e grade responsiva (2/3/4 colunas);
- páginas compartilháveis em `/produto/[slug]`, metadata e Open Graph por peça;
- ficha técnica, cores acessíveis, tamanhos, medidas, cuidados e observações;
- botão de WhatsApp configurável;
- painel responsivo com autenticação Supabase, CRUD, duplicação, status e ordenação;
- Checkout Pro com preço sempre relido do Supabase antes da cobrança;
- escolha de tamanho, cor e quantidade, com dados de contato e observações;
- retorno de pagamento e webhook autenticado/idempotente do Mercado Pago;
- aba administrativa de pedidos, pagamento, cliente e andamento da produção;
- editor completo de produto e configurações da marca, inclusive upload de logo;
- estúdio de fotos client-side com remoção de fundo, antes/depois, fundo branco/transparente, três enquadramentos, saída 4:5 e preservação do original;
- modo demonstração automático com dez peças e imagens SVG locais;
- schema SQL, seed, RLS e policies de Storage;
- loading, vazio, erro, confirmações e mensagens em português.

## Stack e arquitetura

- Next.js 16.3.3, App Router e TypeScript estrito;
- Tailwind CSS 4 e CSS tokens mínimos em `app/globals.css`;
- Server Components para o catálogo; Client Components apenas para busca/filtro, galeria e editores;
- Supabase PostgreSQL, Auth e Storage quando configurado;
- `@imgly/background-removal` carregado por `import()` somente dentro do estúdio de fotos;
- Vercel como destino de deploy.

Fluxo de dados: páginas públicas chamam `lib/catalog.ts`, que escolhe automaticamente entre Supabase e `lib/demo-data.ts`. Operações privilegiadas passam por Server Actions ou Route Handlers, chamam `requireAdmin()` e dependem das políticas RLS no banco. Nenhuma service role key é usada no navegador.

## Estrutura principal

```text
app/
  admin/                    login, produtos, imagens, configurações e ações
  api/admin/                uploads autenticados
  api/checkout/             cria pedido e preferência do Mercado Pago
  api/webhooks/             confirma pagamentos com a API do Mercado Pago
  produto/[slug]/           página pública compartilhável
  pedido/[token]/           acompanhamento privado por link aleatório
components/
  admin/                    editores e ferramentas do painel
lib/
  supabase/                 clientes browser/server
  auth.ts                   autorização do administrador
  catalog.ts                acesso a dados e fallback demo
  demo-data.ts              dez produtos mockados
services/background-removal/ contrato, implementação IMG.LY e canvas 4:5
supabase/migrations/         schema, RLS, buckets e seed
public/demo-products/        placeholders SVG locais
types/                       tipos do domínio
```

## Rodar localmente

Requer Node.js 22 ou superior.

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Sem arquivo `.env.local`, o site entra automaticamente em modo demonstração. O painel fica em [http://localhost:3000/admin](http://localhost:3000/admin).

Comandos de qualidade:

```bash
npm run lint
npm run typecheck
npm run build
```

## Modo demonstração

O demo mode existe para apresentar o projeto antes de criar qualquer conta externa.

- usa dez produtos definidos em `lib/demo-data.ts`;
- usa imagens locais em `public/demo-products/`;
- permite navegar por todas as páginas e abrir o painel;
- ações administrativas são validadas e respondem como simulação, mas **não são persistidas**;
- o estúdio de fotos funciona e baixa o resultado localmente;
- medidas, gramaturas, acabamentos e descrições do seed são demonstrativos e precisam ser confirmados pela costureira.

## Configurar o Supabase

1. Crie um projeto no Supabase.
2. Abra **SQL Editor**, cole e execute `supabase/migrations/202609120001_initial_schema.sql`.
3. A migração cria as tabelas `products`, `product_images`, `product_colors`, `product_sizes`, `product_measurements`, `catalog_settings` e `admin_profiles`.
4. Ela também cria os buckets públicos `product-images` (12 MB) e `brand-assets` (5 MB), limitados aos formatos documentados.
5. Em **Project Settings → API**, copie a URL do projeto e a chave pública/anon.
6. Crie `.env.local` com:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_ANON
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`NEXT_PUBLIC_SITE_URL` é opcional para o catálogo, mas deve ser preenchida com a URL HTTPS final antes de testar o Mercado Pago. O navegador usa somente a anon/publishable key. A Secret Key moderna fica exclusivamente no servidor para registrar e sincronizar pedidos.

### Ativar pedidos e Mercado Pago

1. Execute também `supabase/migrations/202609150001_orders_and_payments.sql` no SQL Editor.
2. Em **Settings → API Keys → Publishable and secret API keys**, crie uma Secret Key exclusiva para a Vercel.
3. Na Vercel, configure:

```env
SUPABASE_SECRET_KEY=sb_secret_...
MERCADO_PAGO_ACCESS_TOKEN=...
MERCADO_PAGO_MODE=test
NEXT_PUBLIC_SITE_URL=https://seu-projeto.vercel.app
```

4. Faça o deploy. O endpoint de notificações será `https://seu-projeto.vercel.app/api/webhooks/mercado-pago`.
5. No Mercado Pago, abra a aplicação → **Webhooks → Configurar notificações**, cadastre essa URL para o evento **Pagamentos** e copie a assinatura secreta para `MERCADO_PAGO_WEBHOOK_SECRET` na Vercel.
6. Faça novo deploy depois de adicionar ou alterar variáveis.

Em teste, mantenha `MERCADO_PAGO_MODE=test` e use a conta compradora/cartões de teste do Mercado Pago. Para produção, troque o Access Token pelo produtivo e altere `MERCADO_PAGO_MODE=production` no mesmo deploy.

### Criar o primeiro administrador

Não existe cadastro público.

1. No dashboard Supabase, abra **Authentication → Users → Add user**.
2. Crie o usuário com e-mail e senha.
3. Copie o UUID desse usuário.
4. No SQL Editor, execute, substituindo o UUID:

```sql
insert into public.admin_profiles (user_id)
values ('UUID-DO-USUARIO');
```

O usuário só entra no painel quando existe nas duas áreas: `auth.users` e `public.admin_profiles`.

### Segurança

- visitantes leem somente peças ativas e seus relacionamentos;
- somente perfis administrativos autenticados podem criar, editar, excluir ou enviar arquivos;
- produtos inativos continuam no banco, mas somem do catálogo;
- validação ocorre tanto na interface quanto nas ações de servidor;
- originais e versões processadas ficam em caminhos separados no Storage.

## Estúdio de fotos

Abra `/admin/imagens`, selecione ou arraste uma foto JPEG, PNG ou WebP de até 12 MB e toque em **Remover fundo automaticamente**. Na primeira execução, o navegador baixa o modelo de segmentação; isso pode levar mais tempo. Depois:

1. revise o antes/depois;
2. escolha branco ou transparente;
3. ajuste o enquadramento;
4. em demo, baixe o arquivo;
5. com Supabase, escolha uma peça e confirme para guardar original e processada separadamente.

O contrato fica em `services/background-removal/types.ts`; portanto a implementação pode ser trocada por Cloudinary, remove.bg ou uma API própria sem reescrever a interface. A implementação atual usa `@imgly/background-removal` 1.7, roda no navegador e é distribuída sob AGPL; revise a compatibilidade da licença com a forma final de distribuição do negócio antes do lançamento comercial fechado.

## Deploy na Vercel

1. Envie o repositório ao GitHub.
2. Na Vercel, escolha **Add New → Project** e importe o repositório.
3. Framework Preset: Next.js; build command: `npm run build`.
4. Adicione as variáveis públicas e secretas documentadas acima em **Settings → Environment Variables**.
5. Troque `NEXT_PUBLIC_SITE_URL` pela URL final, por exemplo `https://catalogo.exemplo.com`.
6. Faça o deploy e teste `/`, uma URL `/produto/...`, o checkout, o retorno `/pedido/...`, `/admin/login`, `/admin/pedidos`, upload e logout.

Sem variáveis Supabase, a Vercel também publica o projeto em modo demo.

## Antes de colocar em produção

- confirmar todas as medidas, tecidos, composições, gramaturas, preços e cuidados;
- substituir placeholders por fotografias reais;
- cadastrar WhatsApp, Instagram, texto institucional e logo;
- revisar a licença da biblioteca de recorte ou trocar o serviço;
- configurar domínio próprio e executar testes de compra e upload em aparelhos móveis reais;
- fazer pelo menos um pagamento aprovado, um pendente e um recusado no ambiente de teste antes de usar credenciais produtivas.
