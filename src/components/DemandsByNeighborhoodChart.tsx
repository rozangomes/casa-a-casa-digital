'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from 'recharts'
import type { DemandCategory } from '@/types'
import { DEMAND_LABELS } from '@/types'

const DEMAND_COLORS: Record<DemandCategory, string> = {
  saude:             '#ef4444',
  educacao:          '#3b82f6',
  transporte:        '#f97316',
  seguranca:         '#a855f7',
  emprego_renda:     '#eab308',
  infraestrutura:    '#94a3b8',
  assistencia_social:'#ec4899',
  outro:             '#6b7280',
}

type NeighborhoodDemand = {
  neighborhood: string
} & Partial<Record<DemandCategory, number>>

type Props = {
  data: NeighborhoodDemand[]
  activeDemands: DemandCategory[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0)
  return (
    <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-3 shadow-lg text-xs">
      <p className="text-white font-semibold mb-2">{label}</p>
      {payload.map((p: any) => p.value > 0 && (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: p.fill }} />
          <span className="text-gray-400">{DEMAND_LABELS[p.dataKey as DemandCategory]}:</span>
          <span className="text-white font-medium">{p.value}</span>
        </div>
      ))}
      <div className="border-t border-[#333] mt-2 pt-2 flex justify-between">
        <span className="text-gray-500">Total</span>
        <span className="text-white font-bold">{total}</span>
      </div>
    </div>
  )
}

export default function DemandsByNeighborhoodChart({ data, activeDemands }: Props) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
        Nenhum dado de visita disponível
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(240, data.length * 52)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
        barSize={18}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#222" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: '#666', fontSize: 11 }}
          axisLine={{ stroke: '#333' }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="neighborhood"
          tick={{ fill: '#aaa', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={110}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
        <Legend
          wrapperStyle={{ fontSize: 11, color: '#888', paddingTop: 12 }}
          formatter={(value) => DEMAND_LABELS[value as DemandCategory] || value}
        />
        {activeDemands.map((demand) => (
          <Bar key={demand} dataKey={demand} stackId="a" fill={DEMAND_COLORS[demand]} radius={0} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
