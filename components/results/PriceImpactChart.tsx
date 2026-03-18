// components/results/PriceImpactChart.tsx
'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine, ResponsiveContainer } from 'recharts'
import { AGENTS } from '@/lib/agents'
import type { AgentId, AgentResponse, Lang } from '@/lib/types'
import type { UIStrings } from '@/lib/i18n'

interface PriceImpactChartProps {
  responses: Partial<Record<AgentId, AgentResponse>>
  lang: Lang
  strings: UIStrings
}

export function PriceImpactChart({ responses, lang, strings }: PriceImpactChartProps) {
  const data = AGENTS
    .filter(a => {
      const r = responses[a.id]
      return r && !r.error && r.priceImpact !== null
    })
    .map(agent => ({
      name: agent.name[lang].split(' ')[0], // first word for brevity
      low: responses[agent.id]!.priceImpact!.low,
      high: responses[agent.id]!.priceImpact!.high,
      color: agent.color,
    }))

  if (data.length === 0) {
    return (
      <div className="rounded-xl p-4" style={{ background: '#0d0d14', border: '1px solid #1a1a28' }}>
        <h3 className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-3">
          {strings.priceImpact}
        </h3>
        <p className="text-xs text-slate-600">{strings.noImpactData}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl p-4" style={{ background: '#0d0d14', border: '1px solid #1a1a28' }}>
      <h3 className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-3">
        {strings.priceImpact}
      </h3>
      <ResponsiveContainer width="100%" height={Math.max(140, data.length * 32)}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a28" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: '#475569', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            tickFormatter={v => `${v > 0 ? '+' : ''}${v}%`}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#475569', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
            width={70}
          />
          <Tooltip
            contentStyle={{ background: '#0d0d14', border: '1px solid #1a1a28', borderRadius: 8, fontSize: 11 }}
            formatter={(value: number, name: string) => [`${value > 0 ? '+' : ''}${value}%`, name === 'low' ? 'Low' : 'High']}
            labelStyle={{ color: '#94a3b8' }}
          />
          <ReferenceLine x={0} stroke="#252535" />
          <Bar dataKey="low" name="low" radius={[4, 0, 0, 4]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} fillOpacity={0.5} />
            ))}
          </Bar>
          <Bar dataKey="high" name="high" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
