# Finalização manual — Laus Sit

Não faça deploy antes do passo 1. Nenhum secret deve ser colado no código ou enviado por mensagem.

## 1. Supabase — executar a migration

1. Abra o projeto no Supabase.
2. Entre em **SQL Editor → New query**.
3. Copie todo o conteúdo de `supabase/migrations/20261002090000_operational_closeout.sql`.
4. Clique em **Run** uma única vez.
5. O resultado esperado é `Success. No rows returned`.

A migration não apaga pedidos. Ela desativa, sem excluir, produto com nome `TESTE`, slug `testi` e peças que ainda usam `/demo-products/*.svg`.

## 2. Vercel

Confirme em **Project → Settings → Environment Variables**:

`NEXT_PUBLIC_SITE_URL=https://laussit.vercel.app`

As variáveis já usadas por Supabase e Mercado Pago continuam as mesmas. Não crie variável pública para secret.

Depois do próximo deploy, abra **Deployments**, confirme que ele está em `Ready` e use **Promote to Production** somente se o domínio ainda apontar para outro deployment. Em **Settings → Domains**, `laussit.vercel.app` deve mostrar o deployment/branch `main` mais recente.

## 3. Primeiro vendedor

Se `SUPABASE_SECRET_KEY` existe na Vercel, use **Admin → Vendedores**: nome, WhatsApp, e-mail e senha inicial criam o usuário Auth e o perfil de vendedor no servidor.

Se a chave não está disponível para a aplicação:

1. Supabase → **Authentication → Users → Add user**.
2. Informe e-mail e senha inicial e marque o e-mail como confirmado.
3. Copie o UUID do usuário.
4. Admin → **Vendedores** → preencha os dados e cole o UUID.

O login do vendedor é `https://laussit.vercel.app/vendedor/login`.

## 4. Conferência segura

1. Admin → Cupons: crie um cupom simples e copie o link.
2. Abra o link em janela anônima; não é necessário pagar para validar filtro/cookie/preferência.
3. Confira Admin → Estoque com quantidade vazia (ilimitada) e depois uma combinação controlada.
4. Faça login com um vendedor e confirme que ele não vê pedidos de outro vendedor.
5. Não faça pagamento real durante a implantação. Use as credenciais/usuários de teste do Mercado Pago quando chegar a hora do teste assistido.

## 5. Ainda não marcar como concluído sem revisão humana

- Fotos reais e textos finais de cada peça.
- Razão social, CNPJ, endereço, prazos, política de privacidade e regras de troca revisados pelo responsável jurídico/contábil.
- Rate limit distribuído para checkout/webhook (Vercel Firewall ou serviço equivalente).
- Teste final Pix/cartão em ambiente de teste Mercado Pago e depois um único pagamento real controlado pelo dono.
