# Mr Pizza — Gestão de Horários

Aplicação React independente do Emergent. A interface é compilada com Vite; as rotas em `api/` são funções Node.js do Vercel, os dados ficam em PostgreSQL/Neon e o assistente usa OpenRouter.

## Preparar o projeto

1. Instala Node.js 24 e executa `npm install`.
2. Adiciona Neon pelo Vercel Marketplace (ou liga uma base Neon existente) e executa o conteúdo de [`db/schema.sql`](./db/schema.sql) no SQL Editor da base.
3. Copia `.env.example` para `.env.local` e define:
   - `DATABASE_URL`: connection string da base Neon.
   - `OPENROUTER_API_KEY`: chave criada no painel do OpenRouter.
   - `OPENROUTER_MODEL`: ID exato de um modelo OpenRouter que aceite saída estruturada/JSON.
4. Executa `npx vercel dev` para testar localmente. O comando serve o frontend e as rotas de API.
5. Liga o repositório ao Vercel e faz deploy a partir da raiz do projeto. Define as mesmas variáveis em **Project Settings → Environment Variables**.

Os IDs de modelos disponíveis mudam; consulta a lista atual em <https://openrouter.ai/models> antes de preencher `OPENROUTER_MODEL`. As chaves são usadas apenas nas funções do servidor e não devem receber o prefixo `VITE_`.

## Dados e acesso

O pacote exportado continha o frontend compilado, mas não trouxe a base de dados nem o código da API original. Por isso, a base começa vazia e funcionários/horários antigos não são migrados automaticamente.

A aplicação foi mantida sem login, conforme pedido. Assim, qualquer pessoa que consiga abrir o endereço publicado pode consultar, criar, alterar e apagar funcionários e horários. Não publiques dados pessoais ou o endereço sem considerar esse risco. O assistente também envia o pedido, a conversa recente e a escala selecionada ao OpenRouter para gerar respostas.
