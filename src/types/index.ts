// ── Hierarquia de papéis ─────────────────────────────────────────────────────
export type UserRole = 'estrategista' | 'coordenador_regiao' | 'coordenador_bairro' | 'visitador'

export const ROLE_LABELS: Record<UserRole, string> = {
  estrategista: 'Estrategista',
  coordenador_regiao: 'Coordenador de Região',
  coordenador_bairro: 'Coordenador de Bairro',
  visitador: 'Visitador / Militante',
}

// ── Demandas territoriais ─────────────────────────────────────────────────────
export type DemandCategory =
  | 'saude'
  | 'educacao'
  | 'transporte'
  | 'seguranca'
  | 'emprego_renda'
  | 'infraestrutura'
  | 'assistencia_social'
  | 'outro'

export const DEMAND_LABELS: Record<DemandCategory, string> = {
  saude: 'Saúde',
  educacao: 'Educação',
  transporte: 'Transporte',
  seguranca: 'Segurança',
  emprego_renda: 'Emprego e Renda',
  infraestrutura: 'Infraestrutura Urbana',
  assistencia_social: 'Assistência Social',
  outro: 'Outro',
}

export type PoliticalPerception =
  | 'muito_favoravel'
  | 'favoravel'
  | 'indiferente'
  | 'contrario'

export const PERCEPTION_LABELS: Record<PoliticalPerception, string> = {
  muito_favoravel: 'Muito favorável',
  favoravel: 'Favorável',
  indiferente: 'Indiferente',
  contrario: 'Contrário',
}

// ── Entidades principais ──────────────────────────────────────────────────────
export interface User {
  id: string
  name: string
  phone: string
  email?: string
  role: UserRole
  team_id: string
  coordinator_name: string
  neighborhood_zone?: string
  is_coordinator: boolean
  status?: 'pending' | 'active'
  invited_by?: string
  created_at: string
}

export interface Team {
  id: string
  name: string
  coordinator_name: string
  city: string
  created_at: string
}

export interface Walk {
  id: string
  user_id: string
  team_id: string
  neighborhood: string
  city: string
  started_at: string
  ended_at?: string
  synced: boolean
  sync_pending: boolean
}

export interface CepResult {
  cep: string
  logradouro: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

export interface Visit {
  id: string                          // UUID local — garante idempotência no sync
  user_id: string
  team_id: string
  coordinator_name: string
  walk_id?: string

  // Endereço (CEP + GPS)
  cep?: string
  city: string
  neighborhood: string
  street?: string
  street_number?: string
  state?: string

  // Dados da visita
  resident_home: boolean
  received_material: boolean
  political_perception: PoliticalPerception

  // Demanda territorial (inteligência)
  main_demand?: DemandCategory
  demand_description?: string         // campo aberto quando category = 'outro'

  // Captação
  phone_collected?: string
  notes?: string

  // GPS
  latitude?: number
  longitude?: number
  gps_accuracy?: number

  // Controle de sync
  visited_at: string
  synced_at?: string
  created_offline: boolean
  sync_pending: boolean
}

// ── Sync ─────────────────────────────────────────────────────────────────────
export interface SyncStatus {
  online: boolean
  pending_count: number
  last_sync?: string
  syncing: boolean
}

// ── Dashboard analytics ───────────────────────────────────────────────────────
export interface DashboardStats {
  total_visits: number
  total_today: number
  pending_sync: number
  by_team: { team: string; count: number }[]
  by_militant: { name: string; phone: string; count: number; role: UserRole }[]
  by_neighborhood: { neighborhood: string; count: number }[]
  by_perception: Record<PoliticalPerception, number>
  by_demand: Record<DemandCategory, number>
  visits_with_coords: Visit[]
  daily_series: { date: string; count: number }[]
}

// ── Inteligência territorial ──────────────────────────────────────────────────
export interface TerritorialIntelligence {
  neighborhood: string
  total_visits: number
  top_demand: DemandCategory
  demand_breakdown: Record<DemandCategory, number>
  favorable_rate: number
  visits_coords: { lat: number; lng: number; demand: DemandCategory }[]
}
