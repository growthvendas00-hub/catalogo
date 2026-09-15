# Finalização para testes reais

O código do catálogo, painel, Checkout Pro e pedidos já está preparado. Nenhuma chave secreta deve ser colada no GitHub ou enviada em conversa.

## 1. Preparar o banco no Supabase

No projeto correto, abra **SQL Editor → New query** e execute, nesta ordem:

1. `supabase/migrations/202609120001_initial_schema.sql`
2. `supabase/migrations/202609150001_orders_and_payments.sql`

O primeiro arquivo cria catálogo, autenticação administrativa, Storage, políticas RLS e produtos iniciais. O segundo cria pedidos, estados de pagamento, acompanhamento da produção, índices e permissões.

## 2. Criar o acesso administrativo

1. Abra **Authentication → Users → Add user**.
2. Crie o usuário com o e-mail e a senha que serão usados no painel.
3. Marque o e-mail como confirmado.
4. Copie o UUID do usuário.
5. No SQL Editor, execute substituindo o valor:

```sql
insert into public.admin_profiles (user_id)
values ('UUID-DO-USUARIO')
on conflict (user_id) do nothing;
```

## 3. Conferir as variáveis da Vercel

Em **Project → Settings → Environment Variables**, ambiente **Production**:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SECRET_KEY
MERCADO_PAGO_ACCESS_TOKEN
MERCADO_PAGO_MODE=test
NEXT_PUBLIC_SITE_URL=https://SEU-ENDERECO.vercel.app
```

`SUPABASE_SECRET_KEY` deve ser a chave moderna iniciada por `sb_secret_`, criada em **Supabase → Settings → API Keys → Publishable and secret API keys**. Ela e o Access Token nunca podem ter o prefixo `NEXT_PUBLIC_`.

Depois de salvar, faça um redeploy.

## 4. Configurar o webhook do Mercado Pago

Depois que o novo deploy estiver no ar:

1. Abra a aplicação **Laus Sit** no Mercado Pago Developers.
2. Entre em **Webhooks → Configurar notificações**.
3. No modo de teste, informe:

```text
https://SEU-ENDERECO.vercel.app/api/webhooks/mercado-pago
```

4. Selecione apenas o evento **Pagamentos**.
5. Salve e copie a assinatura secreta gerada.
6. Na Vercel, crie a variável server-side:

```text
MERCADO_PAGO_WEBHOOK_SECRET
```

7. Faça novo redeploy.

## 5. Roteiro do primeiro teste

1. Entre em `/admin` e edite o preço de uma peça.
2. Abra a mesma peça no catálogo e confirme o novo preço.
3. Escolha tamanho, cor e quantidade e clique em **Pagar com Mercado Pago**.
4. Use uma conta compradora e um cartão de teste do Mercado Pago em uma janela anônima.
5. Conclua o pagamento e confira a página `/pedido/...`.
6. Abra `/admin/pedidos`, confirme o pagamento e altere o andamento para **Em produção**.

O valor da cobrança não vem do navegador: o servidor relê o produto no Supabase imediatamente antes de criar a preferência no Mercado Pago.

## 6. Produção

Somente depois dos cenários aprovado, pendente e recusado passarem:

1. troque `MERCADO_PAGO_ACCESS_TOKEN` pela credencial produtiva;
2. altere `MERCADO_PAGO_MODE` para `production`;
3. configure também a URL produtiva na área de Webhooks;
4. faça um último redeploy.

