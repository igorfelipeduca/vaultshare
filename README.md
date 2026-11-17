# VaultShare

Front-end do VaultShare (React, TypeScript e Vite), implementado a partir do Figma, com tema claro e escuro. Os dados são mockados em `src/api.ts`.

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # testes das funções de formatação
npm run build
```

As rotas que o back-end precisa implementar estão em [BACKEND.md](./BACKEND.md).

| Caminho           | Conteúdo                                        |
| ----------------- | ----------------------------------------------- |
| `src/api.ts`      | Tipos e mock da API: é aqui que entra o `fetch` |
| `src/pages.tsx`   | Telas                                           |
| `src/App.tsx`     | Layout, menu lateral e cabeçalho                |
| `src/dialogs.tsx` | Modais Criar arquivo e Gerar link               |
| `src/ui.tsx`      | Listas e título de página                       |
| `src/format.ts`   | Datas relativas, tamanhos e frases de eventos   |
| `src/styles.css`  | Estilos e tokens dos dois temas                 |

O servidor de produção precisa devolver `index.html` em qualquer rota, porque a navegação é feita no navegador.
