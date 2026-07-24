'use client'

import { TrendingDown, TrendingUp } from 'lucide-react'

export type RevenuePoint = { label: string; mrr: number; churn: number }

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

export function AdminRevenueChart({ points }: { points: RevenuePoint[] }) {
  const width = 720
  const height = 230
  const paddingX = 42
  const paddingTop = 24
  const paddingBottom = 38
  const maxMrr = Math.max(...points.map((point) => point.mrr), 1)
  const usableWidth = width - paddingX * 2
  const usableHeight = height - paddingTop - paddingBottom
  const coordinates = points.map((point, index) => ({
    ...point,
    x: paddingX + (points.length === 1 ? usableWidth / 2 : (index * usableWidth) / (points.length - 1)),
    y: paddingTop + usableHeight - (point.mrr / maxMrr) * usableHeight,
  }))
  const path = coordinates.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ')
  const latest = points.at(-1)?.mrr ?? 0
  const previous = points.at(-2)?.mrr ?? 0
  const growth = previous > 0 ? ((latest - previous) / previous) * 100 : latest > 0 ? 100 : 0

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 shadow-2xl shadow-black/20">
      <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Crescimento de receita</h2>
          <p className="mt-1 text-xs text-slate-500">MRR estimado pelos planos e vencimentos dos ultimos 6 meses.</p>
        </div>
        <div className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${growth >= 0 ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
          {growth >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          {growth >= 0 ? '+' : ''}{growth.toFixed(1)}% no mes
        </div>
      </div>
      <div className="overflow-x-auto px-3 py-4 sm:px-5">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolucao mensal do MRR e cancelamentos" className="min-w-[620px] w-full">
          <defs>
            <linearGradient id="mrrArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((ratio) => {
            const y = paddingTop + usableHeight * ratio
            return <line key={ratio} x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#1e293b" strokeDasharray="4 6" />
          })}
          {coordinates.length > 1 && <path d={`${path} L ${coordinates.at(-1)?.x} ${paddingTop + usableHeight} L ${coordinates[0].x} ${paddingTop + usableHeight} Z`} fill="url(#mrrArea)" />}
          <path d={path} fill="none" stroke="#34d399" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {coordinates.map((point) => (
            <g key={point.label}>
              <circle cx={point.x} cy={point.y} r="5" fill="#020617" stroke="#34d399" strokeWidth="3" />
              <text x={point.x} y={point.y - 13} textAnchor="middle" fill="#cbd5e1" fontSize="11" fontWeight="700">{currency.format(point.mrr)}</text>
              <text x={point.x} y={height - 12} textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="600">{point.label}</text>
              {point.churn > 0 && <g><circle cx={point.x + 15} cy={point.y + 17} r="7" fill="#ef4444" /><text x={point.x + 15} y={point.y + 20.5} textAnchor="middle" fill="white" fontSize="8" fontWeight="800">{point.churn}</text></g>}
            </g>
          ))}
        </svg>
      </div>
      <div className="flex flex-wrap items-center gap-5 border-t border-slate-800 px-5 py-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-2"><span className="h-2 w-5 rounded-full bg-emerald-400" /> MRR estimado</span>
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-rose-500" /> Churn no mes</span>
      </div>
    </section>
  )
}
