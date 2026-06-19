import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDeals } from '../api/client'
import VerdictBadge from '../components/VerdictBadge'
import { formatDate, formatScore, scoreColor } from '../utils'

export default function Deals() {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    getDeals()
      .then((r) => setDeals(r.data))
      .catch(() => setError('Failed to load deals. Is the backend running?'))
      .finally(() => setLoading(false))
  }, [])

  const sorted = [...deals].sort((a, b) => (b.final_score || 0) - (a.final_score || 0))
  const filtered = sorted.filter((d) =>
    d.company?.toLowerCase().includes(search.toLowerCase())
  )

  const investCount = deals.filter((d) => d.verdict === 'Invest').length
  const avgScore = deals.length
    ? (deals.reduce((s, d) => s + (d.final_score || 0), 0) / deals.length).toFixed(1)
    : 'N/A'
  const newest = deals[0]

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Deal Database</h1>
      <p className="text-sm text-gray-500 mb-6">All analyzed companies sorted by score.</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-6">{error}</div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Deals" value={deals.length} />
        <StatCard
          label="Invest Verdicts"
          value={`${investCount} (${deals.length ? Math.round((investCount / deals.length) * 100) : 0}%)`}
        />
        <StatCard label="Average Score" value={avgScore !== 'N/A' ? `${avgScore} / 10` : 'N/A'} />
        <StatCard label="Most Recent" value={newest ? newest.company : '—'} />
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by company name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading deals...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
          <p className="text-gray-400 text-sm">No deals analyzed yet. Go to Analyze to get started.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Company', 'Stage', 'Score', 'Verdict', 'Sector', 'Date', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((deal, i) => (
                <tr key={deal.id} className={`border-b border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{deal.company}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{deal.stage?.replace('_', ' ')}</td>
                  <td className={`px-4 py-3 font-semibold ${scoreColor(deal.final_score)}`}>
                    {formatScore(deal.final_score)}
                  </td>
                  <td className="px-4 py-3">
                    <VerdictBadge verdict={deal.verdict} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">{deal.sector || '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(deal.analyzed_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate('/', { state: { prefill: deal.company } })}
                      className="text-[#6366f1] hover:text-[#4f46e5] text-xs font-medium"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
