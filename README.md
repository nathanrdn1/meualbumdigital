# Copa 2026 — Álbum de Figurinhas Digital

Álbum digital interativo para a Copa do Mundo FIFA 2026 (USA · Canadá · México).

## Como abrir

Basta abrir o arquivo `index.html` diretamente no seu navegador — nenhum servidor é necessário para as funcionalidades básicas.

```
Abrir no navegador: copa2026/index.html
```

> **Compartilhamento via URL** funciona melhor com um servidor local. Veja a seção abaixo.

---

## Funcionalidades

- **980 figurinhas** — 48 seleções, 12 grupos, 18 jogadores por seleção
- **Click no card** — marca/desmarca como colada
- **Botões ＋/−** — controla a quantidade (repetidas)
- **Estrela ⭐** — marca favoritas
- **Filtros** — Todas / Tenho / Faltam / Repetidas / Favoritas
- **Busca em tempo real** — por nome, seleção ou código
- **Exportar trocas** — copia ou baixa lista `.txt` das repetidas
- **Compartilhar** — gera link comprimido com sua coleção
- **Persistência** — estado salvo automaticamente no `localStorage`

---

## Servidor local (opcional, para compartilhamento)

Com Python:
```bash
cd copa2026
python -m http.server 8080
# Abrir: http://localhost:8080
```

Com Node.js (npx):
```bash
cd copa2026
npx serve .
```

---

## Estrutura de arquivos

```
copa2026/
├── index.html
├── css/
│   ├── reset.css        — reset de estilos
│   ├── variables.css    — tokens de design (cores, tipografia)
│   ├── layout.css       — header, grid, seções
│   ├── components.css   — cards, pills, botões, barras
│   └── modal.css        — modais, FAB, toast
├── js/
│   ├── data.js          — dataset completo (48 seleções × 18 jogadores)
│   ├── state.js         — estado + localStorage
│   ├── render.js        — renderização do DOM
│   ├── filters.js       — filtros e busca
│   ├── export.js        — exportar lista de trocas
│   ├── share.js         — compartilhar via URL (LZString)
│   └── app.js           — inicialização e eventos
└── README.md
```

---

## Dependências externas

- [Google Fonts](https://fonts.google.com) — Playfair Display, Inter, JetBrains Mono
- [LZString](https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js) — compressão do estado para compartilhamento via URL
