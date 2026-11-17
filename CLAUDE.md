# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Regras de interface: @DESIGN.md

## Stack

Node 22 · React 19.3 · TypeScript 7.0 · Vite 8.3 · react-router-dom 7.18 · lucide-react 1.68 · CSS puro (sem Tailwind) · Biome 2.6 + oxlint 1.9 · testes com `node:test` · Husky 9 + commitlint 21. Deploy na Vercel.

API em `server/` (JavaScript ESM, Fastify 5, SQLite via `node:sqlite`, zod, argon2). O contrato está em `BACKEND.md`; `src/api.ts` é o cliente `fetch`. Em dev o Vite faz proxy de `/api` para `127.0.0.1:3333`.

## Comandos

```bash
npm install            # também instala os hooks do Husky (script prepare)
npm run dev            # http://localhost:5173
npm run build          # tsc -b && vite build — é aqui que roda a checagem de tipos
npm test               # node --test tests/format.test.ts
node --test --test-name-pattern="<nome>" tests/format.test.ts   # um teste só
npm run lint           # oxlint && biome lint .
npm run format         # biome format --write .
npm run dev:api        # API em :3333 (precisa de server/.env; ver server/.env.example)
npm run test:api       # testes da API (node:test + fastify.inject, banco em memória)
npm --prefix server run seed -- --reset   # recria a conta de demonstração
```

## Estrutura

```
src/main.tsx                 rotas; cada página é carregada sob demanda (React.lazy)
src/routes.ts                mapa dos chunks das páginas + preload em segundo plano após o login
src/app/AppShell.tsx         checa a sessão antes de renderizar; layout, AppContext, modais, toast
src/app/context.ts           useApp (user, refresh, notify, openDialog), useData, usePageTitle
src/app/PreferencesProvider  tema, animações e tamanho do texto (só no navegador)
src/lib/preferences.ts       leitura/aplicação das preferências — espelhado no <script> do index.html
src/lib/legal.ts             controlador e contato do encarregado exibidos na política de privacidade
src/components/              um componente por arquivo (Dialog, Field, Segmented, SubmitButton, listas…)
src/dialogs/                 modais de ação (criar arquivo, gerar link, excluir conta)
src/hooks/useFormAction.ts   useActionState do React 19 para formulários (pending + erro da API)
src/pages/                   uma página por arquivo, export default (exigido pelo lazy)
src/pages/settings/          Configurações dividida em seções
src/api.ts                   tipos + cliente fetch da API (único ponto de I/O)
src/format.ts                todo texto derivado de dados (datas, tamanhos, frases)
src/styles.css               tokens dos temas + estilos
tests/                       só cobre src/format.ts
server/src/app.js            plugins (helmet, cors, rate-limit, cookie, multipart) e rotas sob /api/v1
server/src/routes/           um arquivo por recurso; cada rota valida a entrada com zod
server/src/plugins/security.js  sessões e proteção CSRF
server/src/db.js             schema + migrações (PRAGMA user_version), função fold() para busca
BACKEND.md                   contrato da API
```

## Convenções

- Formatação do Biome: 2 espaços, aspas simples, sem ponto e vírgula, linhas de até 120 caracteres.
- Use `import type` para importações só de tipo (`verbatimModuleSyntax`). Os imports em `src/` não levam extensão; os de `tests/` usam `.ts`.
- Exports nomeados em tudo, exceto páginas (`src/pages/**`) e `AppShell`, que são default por causa do `React.lazy`.
- Formulários usam `useFormAction` + `SubmitButton`; campos usam `<Field>` (que liga `aria-invalid`/`aria-describedby` aos erros de `fields` da API). Não use `<form action>`: ele limpa os campos quando a ação falha.
- O usuário logado vem de `useApp().user`; não chame `getMe` de novo. Os dados de cada tela vêm de `useData(() => api.x(), key)`. Depois de uma mutação, chame `refresh()` do `useApp()` em vez de alterar o estado local.
- Modais abrem com `openDialog({ kind: 'file' | 'link', fileId? })` e são renderizados no `App`, nunca dentro da página.
- Feedback ao usuário é feito com `notify(mensagem, 'ok' | 'error')`.
- Classes CSS em kebab-case no `styles.css`. Ícones do lucide decorativos levam `aria-hidden="true"`.
- Mensagens de commit seguem Conventional Commits (`feat:`, `fix:`, `chore:`…). O commitlint rejeita qualquer outra.

## Regras que NÃO podem ser quebradas

1. **Texto da interface sempre em pt-BR.** Código e comentários continuam em inglês.
2. **Todo I/O passa pelo `src/api.ts`.** Cada função leva um comentário `// MÉTODO /rota` e devolve exatamente o formato descrito no `BACKEND.md`. Se mudar uma, mude a outra.
3. **O back-end manda dados crus:** datas ISO em UTC e tamanhos em bytes. Toda formatação legível ("há 12 min", "2,4 MB", "Expira em 7 dias") fica no `format.ts`, que recebe um `now` opcional para os testes não dependerem do relógio.
4. **Nada de enum, namespace ou parameter properties.** Os testes rodam o TypeScript direto no Node (type stripping) e o `erasableSyntaxOnly` está ligado.
5. **Nada de cores literais nos componentes.** Use os tokens CSS de `:root[data-theme=…]`. Os dois temas precisam manter contraste WCAG AA.
6. **Não rode `shadcn add` nem instale Tailwind ou o pacote `shadcn`.** O servidor MCP do shadcn roda via `npx shadcn@latest mcp` (`.mcp.json`) e não precisa dele instalado; o projeto não tem `components.json` e usa CSS puro.
7. **Não remova o script de tema do `index.html`.** Ele define `data-theme` antes da primeira renderização, e sem ele a tela pisca no tema errado.
8. **O `vercel.json` precisa continuar redirecionando tudo para `index.html`.** A navegação é feita no navegador.
9. **Toda consulta da API filtra por `request.user.id`.** Recurso de outra conta responde `404`, nunca `403`.
10. **Nunca serializar linhas do banco direto:** use `server/src/lib/serializers.js`, que remove hashes e caminhos de armazenamento.
11. **Escritas exigem `X-Requested-With: VaultShare`** (CSRF). O `request()` de `src/api.ts` já envia; não faça `fetch` fora dele.
12. **Mudança de schema = nova entrada em `MIGRATIONS`** em `db.js`. Nunca edite uma migração existente.
13. **Animações respeitam `data-motion`:** novas animações precisam de uma regra em `:root[data-motion="reduce"]` no `styles.css`, e o JS checa `prefersReducedMotion()` de `lib/preferences.ts` (nunca o `matchMedia` direto, que ignora a preferência do usuário).
14. **Tamanhos de fonte sempre em `rem`.** O ajuste "Tamanho do texto" escala o `font-size` da raiz; valores em `px` não acompanham.
15. **LGPD:** qualquer dado pessoal novo precisa entrar no `GET /me/export`, ser apagado pelo `DELETE /me` (tabela com `ON DELETE CASCADE` ou limpeza explícita, como os arquivos em disco) e ser descrito em `pages/Privacy.tsx`. Nada de cookies não essenciais, analytics ou scripts de terceiros sem um fluxo de consentimento.
16. **Erros de senha em rotas autenticadas respondem 400, não 401:** o front trata qualquer 401 como sessão expirada e manda para o login.
