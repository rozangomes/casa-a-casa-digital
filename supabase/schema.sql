-- ============================================================
-- Casa a Casa Digital — Impulso Político
-- Schema Supabase v2 — com hierarquia e inteligência territorial
-- Execute no SQL Editor do projeto Supabase
-- ============================================================

create extension if not exists "pgcrypto";

-- ── EQUIPES ──────────────────────────────────────────────────
create table if not exists public.teams (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  coordinator_name text not null,
  city             text not null default 'São Paulo',
  created_at       timestamptz not null default now()
);

-- ── USUÁRIOS ─────────────────────────────────────────────────
-- role: 'visitador' | 'coordenador_bairro' | 'estrategista'
create table if not exists public.users (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  phone             text not null default '' unique,
  email             text unique,
  password_hash     text,
  invite_token      text unique,
  status            text not null default 'active'
                      check (status in ('pending','active')),
  role              text not null default 'visitador'
                      check (role in ('visitador','coordenador_bairro','coordenador_regiao','estrategista')),
  team_id           uuid references public.teams(id),
  coordinator_name  text not null default '',
  neighborhood_zone text,
  is_coordinator    boolean not null default false,
  invited_by        uuid references public.users(id),
  created_at        timestamptz not null default now()
);

-- Índices para autenticação
create index if not exists idx_users_email        on public.users(email);
create index if not exists idx_users_invite_token on public.users(invite_token);
create index if not exists idx_users_status       on public.users(status);

-- ── CAMINHADAS ───────────────────────────────────────────────
create table if not exists public.walks (
  id           uuid primary key,
  user_id      uuid not null references public.users(id),
  team_id      uuid not null references public.teams(id),
  neighborhood text not null,
  city         text not null default 'São Paulo',
  started_at   timestamptz not null default now(),
  ended_at     timestamptz
);

-- ── VISITAS ──────────────────────────────────────────────────
create table if not exists public.visits (
  id                   uuid primary key,  -- UUID gerado offline (idempotência)
  user_id              text not null,
  team_id              text not null,
  coordinator_name     text not null default '',
  walk_id              uuid references public.walks(id),

  -- Endereço (CEP + GPS)
  cep                  char(8),
  city                 text not null default 'São Paulo',
  neighborhood         text not null,
  street               text,
  street_number        text,
  state                char(2),

  -- Dados da visita
  resident_home        boolean not null default true,
  received_material    boolean not null default false,
  political_perception text not null check (
    political_perception in ('muito_favoravel','favoravel','indiferente','contrario')
  ),

  -- Inteligência territorial
  main_demand          text check (
    main_demand in ('saude','educacao','transporte','seguranca',
                    'emprego_renda','infraestrutura','assistencia_social','outro')
  ),
  demand_description   text,

  -- Captação
  phone_collected      text,
  notes                text,

  -- Geolocalização
  latitude             numeric(10,7),
  longitude            numeric(10,7),
  gps_accuracy         numeric(8,2),

  -- Controle
  visited_at           timestamptz not null default now(),
  synced_at            timestamptz,
  created_offline      boolean not null default false
);

-- ── ÍNDICES ──────────────────────────────────────────────────
create index if not exists idx_visits_user_id      on public.visits(user_id);
create index if not exists idx_visits_team_id      on public.visits(team_id);
create index if not exists idx_visits_neighborhood on public.visits(neighborhood);
create index if not exists idx_visits_visited_at   on public.visits(visited_at desc);
create index if not exists idx_visits_perception   on public.visits(political_perception);
create index if not exists idx_visits_demand       on public.visits(main_demand);
create index if not exists idx_visits_cep          on public.visits(cep);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────
alter table public.visits enable row level security;
alter table public.users  enable row level security;
alter table public.teams  enable row level security;
alter table public.walks  enable row level security;

-- Política permissiva para MVP (restringir em produção por user_id/role)
create policy "allow_all_visits" on public.visits for all using (true) with check (true);
create policy "allow_all_users"  on public.users  for all using (true) with check (true);
create policy "allow_all_teams"  on public.teams  for all using (true) with check (true);
create policy "allow_all_walks"  on public.walks  for all using (true) with check (true);

-- ── VIEWS ANALÍTICAS ─────────────────────────────────────────

-- Inteligência territorial por bairro
create or replace view public.v_territorial_intelligence as
select
  neighborhood,
  city,
  state,
  count(*)                                                      as total_visits,
  count(*) filter (where resident_home)                         as resident_home_count,
  count(*) filter (where received_material)                     as material_given,
  count(*) filter (where political_perception in ('muito_favoravel','favoravel')) as favorable,
  round(count(*) filter (where political_perception in ('muito_favoravel','favoravel'))::numeric
    / nullif(count(*),0) * 100, 1)                             as favorable_rate,
  -- demanda mais frequente
  mode() within group (order by main_demand)                    as top_demand,
  count(*) filter (where main_demand = 'saude')                as demand_saude,
  count(*) filter (where main_demand = 'educacao')             as demand_educacao,
  count(*) filter (where main_demand = 'transporte')           as demand_transporte,
  count(*) filter (where main_demand = 'seguranca')            as demand_seguranca,
  count(*) filter (where main_demand = 'emprego_renda')        as demand_emprego_renda,
  count(*) filter (where main_demand = 'infraestrutura')       as demand_infraestrutura,
  count(*) filter (where main_demand = 'assistencia_social')   as demand_assistencia_social,
  count(*) filter (where main_demand = 'outro')                as demand_outro
from public.visits
group by neighborhood, city, state
order by total_visits desc;

-- Série temporal diária
create or replace view public.v_daily_series as
select
  visited_at::date                as visit_date,
  count(*)                        as total_visits,
  count(*) filter (where political_perception in ('muito_favoravel','favoravel')) as favorable,
  count(*) filter (where created_offline)  as offline_created
from public.visits
group by visited_at::date
order by visit_date desc;

-- Ranking de militantes
create or replace view public.v_militant_ranking as
select
  v.user_id,
  u.name,
  u.phone,
  u.role,
  u.team_id,
  count(*)                        as total_visits,
  count(*) filter (where visited_at::date = current_date) as today,
  count(*) filter (where political_perception in ('muito_favoravel','favorável')) as favorable,
  count(*) filter (where main_demand is not null) as with_demand
from public.visits v
left join public.users u on u.id::text = v.user_id
group by v.user_id, u.name, u.phone, u.role, u.team_id
order by total_visits desc;

-- ── DADOS INICIAIS ───────────────────────────────────────────
insert into public.teams (id, name, coordinator_name, city) values
  ('00000000-0000-0000-0000-000000000001', 'Equipe Centro',    'Carlos Lima',   'São Paulo'),
  ('00000000-0000-0000-0000-000000000002', 'Equipe Vila Nova',  'Joana Melo',   'São Paulo'),
  ('00000000-0000-0000-0000-000000000003', 'Equipe Estratégia', 'Roberto Dias', 'São Paulo')
on conflict do nothing;
