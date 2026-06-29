# IMPULSO Território

App de campanha eleitoral para registro de visitas porta a porta.  
Funciona **offline-first**: salva tudo no IndexedDB e sincroniza com Supabase quando a internet voltar.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS |
| PWA | next-pwa + Service Worker |
| Offline DB | IndexedDB via `idb` |
| Backend | Supabase (Postgres + RLS) |
| Mapas | Leaflet (carregado via CDN + dynamic import) |
| Estado global | Zustand |
| IDs offline | UUID v4 (evita duplicatas na sincronização) |

---

## Instalação

### 1. Clone e instale dependências

```bash
git clone <repo-url>
cd impulso-territorio
npm install
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Edite `.env.local` com suas credenciais do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

### 3. Configure o banco no Supabase

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Crie um novo projeto
3. Vá em **SQL Editor**
4. Cole e execute o conteúdo de `supabase/schema.sql`

### 4. Execute em desenvolvimento

```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

### 5. Build para produção

```bash
npm run build
npm start
```

---

## Fluxo de uso

### Militante

```
Login → Dashboard → "Registrar casa" → Formulário → Salvo no IndexedDB
                                                          ↓
                                              [Quando voltar internet]
                                                          ↓
                                              Sincronização automática → Supabase
```

### Coordenador

```
Login (modo coord.) → Painel → Overview / Ranking / Mapa
```

---

## Fluxo de sincronização offline

```
1. Militante registra visita
2. Visit é salva no IndexedDB com sync_pending = true
3. UUID local é gerado para evitar duplicatas
4. Quando internet retorna (evento 'online'):
   a. Motor de sync busca todos os registros com sync_pending = true
   b. Faz upsert no Supabase usando UUID como chave (idempotente)
   c. Marca registro como sync_pending = false no IndexedDB
   d. Atualiza contador no dashboard
```

---

## Estrutura de arquivos

```
src/
├── app/
│   ├── layout.tsx          # Layout raiz + PWA meta
│   ├── page.tsx            # Redirect inteligente
│   ├── login/page.tsx      # Tela de login
│   ├── dashboard/page.tsx  # Home do militante
│   ├── visit/page.tsx      # Formulário de visita
│   └── coordinator/page.tsx # Painel do coordenador
├── components/
│   ├── VisitsMap.tsx       # Mapa Leaflet (dynamic)
│   └── ui/
│       ├── BigButton.tsx
│       ├── StatCard.tsx
│       ├── StatusBar.tsx
│       └── PerceptionBadge.tsx
├── lib/
│   ├── db.ts               # IndexedDB (idb)
│   ├── supabase.ts         # Cliente Supabase
│   ├── sync.ts             # Motor de sincronização
│   ├── geo.ts              # Geolocalização
│   └── mock-data.ts        # Dados mockados para demo
├── store/
│   └── useAppStore.ts      # Estado global (Zustand)
├── hooks/
│   └── useSync.ts          # Hook de auto-sync
└── types/
    └── index.ts            # Tipos TypeScript
supabase/
└── schema.sql              # Schema + RLS + Views
```

---

## Instalar como PWA no celular

**Android (Chrome):**
1. Abra o app no Chrome
2. Menu → "Adicionar à tela inicial"
3. O app funciona offline após instalado

**iPhone (Safari):**
1. Abra no Safari
2. Compartilhar → "Adicionar à Tela de Início"

---

## Ajustes para produção

| Item | Ação recomendada |
|------|-----------------|
| RLS Supabase | Restringir políticas por `user_id` ou `team_id` |
| Autenticação | Substituir login simples por Supabase Auth (OTP SMS) |
| Cidade | Parametrizar via variável de ambiente |
| Ícones PWA | Gerar ícones reais em `public/icons/` |
| HTTPS | Obrigatório para geolocalização e PWA |

---

## Dados de demonstração

O painel do coordenador carrega dados reais do Supabase. Se não houver conexão ou dados, exibe automaticamente **dados mockados** (`src/lib/mock-data.ts`) com visitas dos últimos 7 dias para testar o dashboard.

---

## Licença

MIT — Uso livre para campanhas eleitorais progressistas.
