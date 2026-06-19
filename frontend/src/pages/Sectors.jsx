import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getSectors } from '../api/client'
import { scoreColor } from '../utils'

const barColor = (score) => {
  if (score >= 7) return '#16a34a'
  if (score >= 5) return '#d97706'
  return '#dc2626'
}

export default function Sectors() {
  const [sectors, setSectors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getSectors()
      .then((r) => setSectors(r.data))
      .catch(() => setError('Failed to load sector data.'))
      .finally(() => setLoading(false))
  }, [])

  const sorted = [...sectors].sort((a, b) => (b.avg_score || 0) - (a.avg_score || 0))
  const hottest = sorted[0]
  const mostAnalyzed = [...sectors].sort((a, b) => (b.deal_count || 0) - (a.deal_count || 0))[0]
  const bestInvestRate = [...sectors].sort((a, b) => (b.invest_rate || 0) - (a.invest_rate || 0))[0]

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Sector Analytics</h1>
      <p className="text-sm text-gray-500 mb-6">Aggregated trends across all analyzed deals.</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-6">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading sector data...</div>
      ) : sectors.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
          <p className="text-gray-400 text-sm">No sector data yet. Analyze more companies to see trends.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Hottest Sector" value={hottest?.sector || '—'} sub={`Avg score ${hottest?.avg_score?.toFixed(1) || '—'}`} />
            <StatCard label="Most Analyzed" value={mostAnalyzed?.sector || '—'} sub={`${mostAnalyzed?.deal_count || 0} deals`} />
            <StatCard label="Best Invest Rate" value={bestInvestRate?.sector || '—'} sub={`${Math.round((bestInvestRate?.invest_rate || 0) * 100)}% invest rate`} />
          </div>

          {/* Chart 1 — Avg score by sector */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-5">Average Score by Sector</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={sorted} layout="vertical" margin={{ left: 20, right: 30, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 12 }} />
                <YAxis dataKey="sector" type="category" tick={{ fontSize: 12 }} width={120} />
                <Tooltip
                  formatter={(v) => [`${Number(v).toFixed(1)} / 10`, 'Avg Score']}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="avg_score" radius={[0, 4, 4, 0]}>
                  {sorted.map((entry, i) => (
                    <Cell key={i} fill={barColor(entry.avg_score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 2 — Deal count by sector */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-5">Deal Count by Sector</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={sorted} margin={{ left: 5, right: 30, top: 5, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="sector"
                  tick={{ fontSize: 11 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  formatter={(v) => [v, 'Deals']}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="deal_count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sectors table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Sector', 'Deals', 'Avg Score', 'Invest Rate'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((s, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.sector || 'Unknown'}</td>
                    <td className="px-4 py-3 text-gray-500">{s.deal_count}</td>
                    <td className={`px-4 py-3 font-semibold ${scoreColor(s.avg_score)}`}>
                      {Number(s.avg_score).toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {Math.round((s.invest_rate || 0) * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  )
}
