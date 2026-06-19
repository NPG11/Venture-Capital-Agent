import { useEffect, useState } from 'react'
import { compareDeals, getDeals } from '../api/client'
import VerdictBadge from '../components/VerdictBadge'
import { formatMoney, formatScore, scoreColor } from '../utils'

const DIMENSIONS = ['team', 'market', 'traction', 'moat', 'financial']

export default function Compare() {
  const [deals, setDeals] = useState([])
  const [companyA, setCompanyA] = useState('')
  const [companyB, setCompanyB] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getDeals().then((r) => setDeals(r.data)).catch(() => {})
  }, [])

  const handleCompare = async () => {
    if (!companyA || !companyB) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await compareDeals(companyA, companyB)
      setResult(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Comparison failed.')
    } finally {
      setLoading(false)
    }
  }

  const dealNames = deals.map((d) => d.company)

  const aWins = result
    ? DIMENSIONS.filter((d) => (result.company_a.scores[d] || 0) > (result.company_b.scores[d] || 0)).length +
      ((result.company_a.final_score || 0) > (result.company_b.final_score || 0) ? 1 : 0)
    : 0
  const bWins = result
    ? DIMENSIONS.filter((d) => (result.company_b.scores[d] || 0) > (result.company_a.scores[d] || 0)).length +
      ((result.company_b.final_score || 0) > (result.company_a.final_score || 0) ? 1 : 0)
    : 0
  const winner = result
    ? (result.company_a.final_score || 0) >= (result.company_b.final_score || 0)
      ? result.company_a.company
      : result.company_b.company
    : null

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Compare Deals</h1>
      <p className="text-sm text-gray-500 mb-6">Side-by-side comparison of two analyzed companies.</p>

      {/* Input */}
      <div className="flex gap-3 flex-wrap mb-8">
        <CompanySelect
          label="Company A"
          value={companyA}
          onChange={setCompanyA}
          options={dealNames}
          exclude={companyB}
        />
        <CompanySelect
          label="Company B"
          value={companyB}
          onChange={setCompanyB}
          options={dealNames}
          exclude={companyA}
        />
        <button
          onClick={handleCompare}
          disabled={loading || !companyA || !companyB}
          className="self-end bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          {loading ? 'Comparing...' : 'Compare'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-6">{error}</div>
      )}

      {deals.length === 0 && (
        <p className="text-sm text-gray-400">No deals in database yet. Run /analyze on at least 2 companies first.</p>
      )}

      {result && (
        <div className="space-y-6">
          {/* Comparison table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">Metric</th>
                  <th className="text-center px-4 py-3 text-sm font-bold text-gray-800">{result.company_a.company}</th>
                  <th className="text-center px-4 py-3 text-sm font-bold text-gray-800">{result.company_b.company}</th>
                </tr>
              </thead>
              <tbody>
                <CompareRow
                  label="Overall Score"
                  a={result.company_a.final_score}
                  b={result.company_b.final_score}
                  renderA={(v) => <span className={`font-bold ${scoreColor(v)}`}>{formatScore(v)}</span>}
                  renderB={(v) => <span className={`font-bold ${scoreColor(v)}`}>{formatScore(v)}</span>}
                  higherWins
                />
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-3 text-gray-500 font-medium">Verdict</td>
                  <td className="px-4 py-3 text-center"><VerdictBadge verdict={result.company_a.verdict} /></td>
                  <td className="px-4 py-3 text-center"><VerdictBadge verdict={result.company_b.verdict} /></td>
                </tr>
                {DIMENSIONS.map((dim) => (
                  <CompareRow
                    key={dim}
                    label={dim.charAt(0).toUpperCase() + dim.slice(1)}
                    a={result.company_a.scores[dim]}
                    b={result.company_b.scores[dim]}
                    renderA={(v) => <span className={scoreColor(v)}>{formatScore(v)}</span>}
                    renderB={(v) => <span className={scoreColor(v)}>{formatScore(v)}</span>}
                    higherWins
                  />
                ))}
                <CompareRow
                  label="Risk Flags"
                  a={(result.company_a.risk_flags || []).length}
                  b={(result.company_b.risk_flags || []).length}
                  renderA={(v) => <span>{v}</span>}
                  renderB={(v) => <span>{v}</span>}
                  higherWins={false}
                />
              </tbody>
            </table>
          </div>

          {/* Summary verdict */}
          <div className="bg-[#6366f1]/5 border border-[#6366f1]/20 rounded-xl p-5">
            <p className="text-sm text-gray-700 mb-1">
              <strong>{result.company_a.company}</strong> wins on <strong>{aWins}</strong> dimensions.{' '}
              <strong>{result.company_b.company}</strong> wins on <strong>{bWins}</strong> dimensions.
            </p>
            <p className="text-sm font-semibold text-[#6366f1]">
              Recommendation: <strong>{winner}</strong> is the stronger investment based on final score.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function CompanySelect({ label, value, onChange, options, exclude }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500 font-medium">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1] bg-white min-w-48"
      >
        <option value="">Select company...</option>
        {options.filter((o) => o !== exclude).map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}

function CompareRow({ label, a, b, renderA, renderB, higherWins }) {
  const aWins = higherWins ? (a || 0) > (b || 0) : (a || 0) < (b || 0)
  const bWins = higherWins ? (b || 0) > (a || 0) : (b || 0) < (a || 0)

  return (
    <tr className="border-b border-gray-100">
      <td className="px-4 py-3 text-gray-500 font-medium">{label}</td>
      <td className={`px-4 py-3 text-center ${aWins ? 'bg-green-50' : bWins ? 'bg-gray-50 opacity-60' : ''}`}>
        {renderA(a)}
      </td>
      <td className={`px-4 py-3 text-center ${bWins ? 'bg-green-50' : aWins ? 'bg-gray-50 opacity-60' : ''}`}>
        {renderB(b)}
      </td>
    </tr>
  )
}
