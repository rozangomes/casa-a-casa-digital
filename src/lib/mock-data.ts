// Dados mockados para testar o dashboard sem backend
import type { Visit, User, DemandCategory, PoliticalPerception, UserRole } from '@/types'

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Ana Silva', phone: '11999990001', role: 'visitador', team_id: 't1', coordinator_name: 'Carlos Lima', is_coordinator: false, created_at: '2024-10-01T08:00:00Z' },
  { id: 'u2', name: 'Pedro Santos', phone: '11999990002', role: 'visitador', team_id: 't1', coordinator_name: 'Carlos Lima', is_coordinator: false, created_at: '2024-10-01T08:00:00Z' },
  { id: 'u3', name: 'Maria Costa', phone: '11999990003', role: 'visitador', team_id: 't2', coordinator_name: 'Joana Melo', is_coordinator: false, created_at: '2024-10-01T08:00:00Z' },
  { id: 'u4', name: 'João Ferreira', phone: '11999990004', role: 'visitador', team_id: 't2', coordinator_name: 'Joana Melo', is_coordinator: false, created_at: '2024-10-01T08:00:00Z' },
  { id: 'u5', name: 'Lúcia Ramos', phone: '11999990005', role: 'visitador', team_id: 't3', coordinator_name: 'Roberto Dias', is_coordinator: false, created_at: '2024-10-01T08:00:00Z' },
  { id: 'coord1', name: 'Carlos Lima', phone: '11999990010', role: 'coordenador_bairro', team_id: 't1', coordinator_name: '', neighborhood_zone: 'Centro', is_coordinator: true, created_at: '2024-10-01T08:00:00Z' },
  { id: 'coord2', name: 'Joana Melo', phone: '11999990011', role: 'coordenador_bairro', team_id: 't2', coordinator_name: '', neighborhood_zone: 'Vila Nova', is_coordinator: true, created_at: '2024-10-01T08:00:00Z' },
  { id: 'strat1', name: 'Roberto Dias', phone: '11999990020', role: 'estrategista', team_id: 't3', coordinator_name: '', is_coordinator: true, created_at: '2024-10-01T08:00:00Z' },
]

const neighborhoods = ['Centro', 'Vila Nova', 'Jardim América', 'Parque das Flores', 'São João', 'Vila Operária']
const streets = ['Rua das Acácias', 'Av. Principal', 'Rua do Comércio', 'Travessa da Paz', 'Rua Nova', 'Alameda dos Ipês']
const demands: DemandCategory[] = ['saude', 'saude', 'educacao', 'transporte', 'seguranca', 'emprego_renda', 'infraestrutura', 'assistencia_social', 'outro']
const perceptions: PoliticalPerception[] = ['muito_favoravel', 'muito_favoravel', 'favoravel', 'favoravel', 'favoravel', 'indiferente', 'indiferente', 'contrario']

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function randomBool(p = 0.6): boolean { return Math.random() < p }

export function generateMockVisits(): Visit[] {
  const visits: Visit[] = []
  const users = MOCK_USERS.filter((u) => u.role === 'visitador')

  for (let day = 0; day < 14; day++) {
    const date = new Date()
    date.setDate(date.getDate() - day)
    const dateStr = date.toISOString().slice(0, 10)
    const count = day === 0 ? 18 : Math.floor(Math.random() * 25) + 8

    for (let i = 0; i < count; i++) {
      const user = randomItem(users)
      const neighborhood = randomItem(neighborhoods)
      const demand = randomItem(demands)
      const hour = 8 + Math.floor(Math.random() * 9)
      const min = Math.floor(Math.random() * 60)

      visits.push({
        id: `mock-${day}-${i}-${user.id}`,
        user_id: user.id,
        team_id: user.team_id,
        coordinator_name: user.coordinator_name,
        city: 'São Paulo',
        neighborhood,
        street: randomItem(streets),
        state: 'SP',
        resident_home: randomBool(0.72),
        received_material: randomBool(0.52),
        political_perception: randomItem(perceptions),
        main_demand: demand,
        demand_description: demand === 'outro' ? 'Problemas com abastecimento de água' : undefined,
        phone_collected: randomBool(0.22) ? `119999${Math.floor(10000 + Math.random() * 90000)}` : undefined,
        latitude: -23.55 + (Math.random() - 0.5) * 0.08,
        longitude: -46.63 + (Math.random() - 0.5) * 0.08,
        visited_at: `${dateStr}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00Z`,
        created_offline: randomBool(0.4),
        sync_pending: false,
        synced_at: new Date().toISOString(),
      })
    }
  }
  return visits
}
