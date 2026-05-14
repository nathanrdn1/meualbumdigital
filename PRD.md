# PRD — Meu Álbum Digital
### Copa do Mundo FIFA 2026 · Álbum de Figurinhas Digital

---

## 1. Visão Geral

**Produto:** Aplicação web para gerenciar a coleção de figurinhas da Copa do Mundo FIFA 2026.  
**URL:** [meualbum.digital](https://meualbum.digital)  
**Repositório:** [github.com/nathanrdn1/meualbumdigital](https://github.com/nathanrdn1/meualbumdigital)  
**Deploy:** Hostinger (integração Git automática via push na branch `main`)

### Objetivo
Permitir que colecionadores controlem quais figurinhas possuem, quantas repetidas têm e quais ainda precisam — com sincronização na nuvem, compartilhamento de coleção e suporte a múltiplos usuários autenticados.

---

## 2. Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | HTML5, CSS3 (vanilla), JavaScript ES2020 (vanilla) |
| Autenticação | Firebase Auth v10.11.0 (compat SDK) |
| Banco de dados | Cloud Firestore |
| Hospedagem | Hostinger Shared Hosting |
| CI/CD | Git + integração nativa Hostinger |
| Compressão de dados | LZ-String v1.5.0 (CDN) |
| Fonte | Rubik (Google Fonts) |

**Sem framework, sem bundler.** Arquivos servidos diretamente via PHP/HTML estático.

---

## 3. Arquitetura de Arquivos

```
/
├── index.html                  # Entry point único
├── firebase-config.php         # Serve credenciais Firebase (lê de fora do public_html)
├── imgs/
│   ├── logo-tipo.png           # Logotipo da marca
│   └── fav-ico.png             # Favicon
├── css/
│   ├── reset.css               # Reset base
│   ├── variables.css           # Design tokens (cores, fontes, espaçamentos)
│   ├── layout.css              # Header, grid, seções, responsivo
│   ├── components.css          # Cards, pills, stickers, qty controls
│   ├── modal.css               # Modais de exportação e compartilhamento
│   └── auth.css                # Auth overlay, loading screen, user header
└── js/
    ├── firebase-config.php     # (servido pelo PHP — não é JS puro)
    ├── firebase.js             # Init Firebase + funções de auth e Firestore
    ├── data.js                 # Dados estáticos: grupos, times, jogadores
    ├── state.js                # Estado do álbum, undo stack, persistência
    ├── auth.js                 # UI de autenticação, binding de eventos
    ├── render.js               # Renderização do álbum (DOM)
    ├── filters.js              # Filtros e busca
    ├── export.js               # Exportação de figurinhas repetidas
    ├── share.js                # Geração e leitura de links curtos
    └── app.js                  # Orquestração geral, init, eventos globais
```

### Ordem de carregamento dos scripts
```
Firebase CDN (app + auth + firestore)
→ firebase-config.php
→ firebase.js
→ LZ-String CDN
→ data.js → state.js → auth.js → render.js → filters.js → export.js → share.js → app.js
```

---

## 4. Design System

### 4.1 Paleta de Cores

| Token | Valor | Uso |
|---|---|---|
| `--bg-primary` | `#0A0A0F` | Background principal |
| `--bg-card` | `#13131A` | Cards e modais |
| `--bg-section` | `#1A1A24` | Seções internas, inputs |
| `--bg-header` | `#16141F` | Header sticky |
| `--gold-primary` | `#C9A84C` | Cor de destaque principal |
| `--gold-light` | `#E8C96A` | Hover e estados ativos |
| `--gold-dark` | `#8B6914` | Gradientes, escudos |
| `--gold-border` | `rgba(201,168,76,0.15)` | Bordas padrão |
| `--gold-border-hover` | `rgba(201,168,76,0.5)` | Bordas em hover |
| `--gold-glow` | `rgba(201,168,76,0.35)` | Glow/sombra dourada |
| `--text-primary` | `#F0EDE4` | Texto principal |
| `--text-secondary` | `#8A8799` | Texto secundário/labels |
| `--green-bg` | `#1A3A2A` | Background figurinha colada |
| `--green-border` | `#2A6A3A` | Borda figurinha colada |
| `--green-text` | `#4ADE80` | Texto/check figurinha colada |
| `--amber` | `#F59E0B` | Duplicatas (stat card) |

### 4.2 Tipografia

| Token | Valor |
|---|---|
| `--font-display` | Rubik, sans-serif |
| `--font-body` | Rubik, sans-serif |
| `--font-mono` | Rubik, sans-serif |

Pesos utilizados: **400** (regular), **500** (medium), **600** (semibold), **700** (bold)

### 4.3 Border Radius

| Token | Valor | Uso |
|---|---|---|
| `--radius-sm` | `6px` | Inputs, pills, botões |
| `--radius-md` | `10px` | Cards de figurinha |
| `--radius-lg` | `16px` | Modal de auth |

### 4.4 Z-Index

| Token | Valor | Elemento |
|---|---|---|
| `--z-header` | 100 | Header sticky |
| `--z-fab` | 150 | Botão flutuante (FAB) |
| `--z-modal` | 200 | Modais |
| Auth overlay | 500 | Modal de login |
| App loading | 600 | Tela de carregamento |

### 4.5 Transições

- `--transition-fast`: `0.15s ease` — micro-interações (hover em star, qty btn)
- `--transition-base`: `0.2s ease` — transições padrão (bordas, backgrounds)

---

## 5. Estrutura de Dados

### 5.1 Álbum (ALBUM_DATA — data.js)

```
ALBUM_DATA: Array<Group>

Group {
  id: string         // "A", "B", ... "L", "FWC", "CC"
  label: string      // "Grupo A", "FWC World Stars", "Coca-Cola"
  teams: Array<Team>
}

Team {
  id: string         // "MEX", "CAN", "BRA", "FWC", "CC", ...
  name: string       // "México", "Canadá", "Brasil", ...
  flag: string       // emoji de bandeira
  players: Array<Player>
}

Player {
  num: number        // número da figurinha (1 = Escudo, 2–12 e 14–20)
  name: string       // nome do jogador ("Escudo", "Guillermo Ochoa", ...)
}
```

### 5.2 Contagem de figurinhas por seção

| Seção | Figurinhas por time | Observações |
|---|---|---|
| Grupos A–L (48 times) | 19 | num 1 (Escudo) + nums 2–12, 14–20 (sem 13) |
| FWC World Stars | 18 | nums 1–12, 14–19 (sem 13) |
| Coca-Cola (CC) | 14 | nums 1–14 (inclui 13) |

**Total geral:** 944 figurinhas

### 5.3 ID de figurinha

Formato: `{teamId}-{num}`  
Exemplos: `BRA-1` (escudo Brasil), `MEX-14`, `FWC-7`, `CC-13`

### 5.4 Estado de uma figurinha (albumState)

```javascript
albumState = {
  "BRA-1": { owned: true,  qty: 2, fav: false },
  "MEX-14": { owned: false, qty: 0, fav: true  },
  // ...
}
```

---

## 6. Firebase

### 6.1 Coleções do Firestore

```
albums/{uid}
  └── state: { [stickerId]: { owned, qty, fav } }
  └── updatedAt: Timestamp

shares/{shortId}
  └── state: { [stickerId]: { owned, qty, fav } }
  └── createdAt: Timestamp
  └── uid: string | null
```

### 6.2 Regras do Firestore

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /albums/{userId} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }

    match /shares/{shareId} {
      allow read: if true;
      allow create: if request.auth != null;
    }
  }
}
```

### 6.3 Provedores de Autenticação

- **Email/Senha** — cadastro com nome, email e senha
- **Google** — popup nativo (`signInWithPopup`)

### 6.4 Credenciais (Segurança)

- `js/firebase-config.php` (no repo) — script PHP que lê o arquivo de segredos
- `firebase-secrets.php` (fora do `public_html`, nunca no repo) — contém as credenciais reais
- Caminho: `/home/u682758138/firebase-secrets.php` (inacessível via HTTP)

---

## 7. Funcionalidades

### 7.1 Gerenciamento de Figurinhas

| Ação | Comportamento |
|---|---|
| **Clicar no card** | Toggle owned/missing |
| **Botão `+`** | Incrementa quantidade (owned automático) |
| **Botão `−`** | Decrementa; se qty = 0 → marca como missing |
| **Botão ★** | Toggle favorita (borda dourada intensa) |

**Estados visuais do card:**
- **Missing:** `opacity: 0.45`, `grayscale(30%)`
- **Owned (colada):** background verde (`#1A3A2A`), borda verde, check verde
- **Favorita:** borda dourada intensa, background dourado sutil
- **Escudo (num = 1):** card especial com borda dourada destacada

### 7.2 Filtros e Busca

| Filtro | Descrição |
|---|---|
| Todas | Exibe todas as figurinhas |
| Tenho | Apenas `owned = true` |
| Faltam | Apenas `owned = false` |
| Repetidas | Apenas `qty > 1` |
| Favoritas | Apenas `fav = true` |

- **Busca por texto:** nome do jogador, nome do time ou ID da figurinha
- Debounce de 200ms no input de busca
- Filtros e busca combinam (AND)
- Seções/times sem resultados ficam ocultos (`hidden`)

### 7.3 Estatísticas (Header)

4 cards exibidos abaixo do header:

| Card | Dado |
|---|---|
| Tenho | Total de figurinhas `owned` |
| Faltam | Total `missing` |
| Repetidas | Soma de `qty - 1` para `qty > 1` |
| Favoritas | Total com `fav = true` |

Barra de progresso geral no header: `owned / total` com gradiente dourado.

### 7.4 Sistema de Undo

- **Limite:** 30 níveis
- **Atalho:** `Ctrl+Z` / `Cmd+Z`
- **FAB button:** ↩ Desfazer com badge numérico mostrando ações disponíveis
- Toda mutação de estado chama `pushUndo()` antes de alterar
- Após undo: `renderAll()` + `updateHeaderStats()` + `applyFilters()`
- Estado de undo é limpo ao trocar de conta ou carregar coleção do Firestore

### 7.5 Autenticação e Persistência

**Fluxo de login:**
1. Loading screen (troféu pulsando) aparece até Firebase resolver `onAuthStateChanged`
2. Se usuário logado → carrega álbum do Firestore
3. Se primeiro login e havia dados no `localStorage` → **migração automática** para Firestore + toast de confirmação
4. Se não logado → exibe modal de auth

**Persistência dupla:**
- **localStorage:** salvo imediatamente a cada ação (backup offline)
- **Firestore:** salvo com debounce de **800ms** após cada ação

**Após undo:** salvo imediatamente em ambos (sem debounce)

### 7.6 Compartilhamento

**Novo formato (curto):**
- Ao clicar em Compartilhar → estado salvo no Firestore (`shares/{shortId}`)
- URL gerada: `meualbum.digital?c=Xk3mP9qR` (8 chars, alfabeto sem ambíguos)
- Modal exibe "Gerando link…" durante a operação

**Formato legado (compatibilidade):**
- `?colecao=<LZString>` — links antigos continuam funcionando

**Modo somente leitura:**
- Links compartilhados carregam a coleção sem autenticação
- Banner "Modo somente leitura" é exibido
- Todas as interações de edição ficam bloqueadas (`isReadOnly = true`)
- Botão "Criar minha coleção" redireciona para a URL limpa

### 7.7 Exportação de Repetidas

- Lista todas as figurinhas com `qty > 1`
- Agrupada por time
- Opções: **Copiar para área de transferência** ou **Download .txt**

---

## 8. Componentes de UI

### Header
- Sticky no topo, `z-index: 100`
- Esquerda: troféu SVG + "Copa 2026" + subtítulo
- Centro/direita: indicador do usuário logado (avatar circular com iniciais + nome + botão Sair)
- Direita: barra de progresso geral

### FAB (Floating Action Button)
- Botão `+` dourado fixo no canto inferior direito
- Abre menu com 3 opções:
  - ↩ **Desfazer** (com badge de contagem)
  - 📋 **Exportar repetidas**
  - 🔗 **Compartilhar**

### Modal de Auth
- Overlay escuro `rgba(0,0,0,0.88)` + card centralizado
- Abas: **Entrar** / **Criar conta**
- Campos: nome (só cadastro), email, senha
- Link "Esqueci minha senha" → `sendPasswordResetEmail`
- Botão "Continuar com Google" → `signInWithPopup`
- Erros do Firebase traduzidos para português

### Cards de Figurinha
- Grid responsivo: `repeat(auto-fill, minmax(90px, 1fr))`
- Mobile (≤480px): `minmax(75px, 1fr)`
- Cada card: flag/emoji, nome do jogador, código ID, controles de qty

---

## 9. Responsividade

| Breakpoint | Ajustes |
|---|---|
| `≤ 768px` | Subtítulo do header com font menor |
| `≤ 480px` | Header menor, subtítulo oculto, barra de progresso 120px, grid menor, auth card compactado, nome do usuário oculto (só avatar) |

---

## 10. Deploy e Infraestrutura

### Pipeline
```
git push origin main
    └── Hostinger Git Integration detecta push
        └── Deploy automático para /public_html/
```

### Credenciais Firebase (nunca no repo)
```
/home/u682758138/          ← raiz do usuário (não é web-acessível)
    firebase-secrets.php   ← arquivo com credenciais reais (criado manualmente 1 vez)
    public_html/           ← raiz do site
        js/firebase-config.php  ← PHP que inclui o arquivo acima
```

### Cache Busting
Scripts da aplicação têm sufixo `?v=N` no `index.html`.  
A cada deploy com mudanças em JS, incrementar N para forçar recarga nos browsers.

---

## 11. Segurança

| Ponto | Estratégia |
|---|---|
| Credenciais Firebase | Fora do `public_html` e do repositório Git |
| Regras Firestore | Usuário só lê/escreve seu próprio álbum |
| Links compartilhados | Leitura pública, escrita apenas autenticado |
| Domínios autorizados | `meualbum.digital` adicionado no Firebase Console |
| Modo somente leitura | `isReadOnly = true` bloqueia todas as mutações de estado |

---

## 12. Próximos Passos / Backlog

- [ ] Verificar o nome do app no Google OAuth (atualmente "MeuAlbumDigital" no Google Cloud Console)
- [ ] App Check (Firebase) para proteger contra uso indevido das APIs
- [ ] Expiração automática de links compartilhados (ex: 30 dias)
- [ ] Dark/light mode toggle
- [ ] PWA (manifest + service worker para uso offline)
- [ ] Notificações de troca de figurinhas entre usuários
