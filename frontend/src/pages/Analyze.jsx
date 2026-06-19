import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { analyzeCompany } from '../api/client'
import RiskFlag from '../components/RiskFlag'
import ScoreBar from '../components/ScoreBar'
import VerdictBadge from '../components/VerdictBadge'
import { formatHeadcount, formatMoney, formatScore, scoreColor } from '../utils'

const LOADING_MESSAGES = [
  'Running research agent...',
  'Pulling structured data...',
  'Checking SEC filings...',
  'Scoring and writing memo...',
]

const STAGES = [
  { value: 'seed', label: 'Seed' },
  { value: 'series_a', label: 'Series A' },
  { value: 'series_b', label: 'Series B' },
]

const DIMENSIONS = ['team', 'market', 'traction', 'moat', 'financial']

export default function Analyze() {
  const [company, setCompany] = useState('')
  const [stage, setStage] = useState('series_a')
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (loading) {
      intervalRef.current = setInterval(() => {
        setLoadingMsg((m) => (m + 1) % LOADING_MESSAGES.length)
      }, 4000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [loading])

  const handleAnalyze = async () => {
    if (!company.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    setLoadingMsg(0)
    try {
      const res = await analyzeCompany(company.trim(), stage)
      setResult(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Analysis failed. Is the backend running at http://localhost:8000?')
    } finally {
      setLoading(false)
    }
  }

  const scores = result?.scores || {}
  const rationale = scores.rationale || {}
  const riskFlags = result?.risk_flags || []
  const sd = result?.structured_data || {}

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Input Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Deal Research</h1>
        <p className="text-sm text-gray-500 mb-6">Run 4 AI agents on any company and get a full investment memo.</p>
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            placeholder="Enter company name (e.g. Notion)"
            className="flex-1 min-w-64 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1] focus:border-transparent"
          />
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1] bg-white"
          >
            {STAGES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            onClick={handleAnalyze}
            disabled={loading || !company.trim()}
            className="bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {loading ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-8 h-8 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm font-medium text-gray-700 transition-all">{LOADING_MESSAGES[loadingMsg]}</p>
          <p className="text-xs text-gray-400 mt-1">This takes 45–60 seconds — all 4 agents are running</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6">
          {/* Non-fatal errors */}
          {result.errors?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
              <strong>Warnings:</strong> {result.errors.join(' · ')}
            </div>
          )}

          {/* Hero row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Overall Score">
              <span className={`text-3xl font-bold ${scoreColor(result.final_score)}`}>
                {formatScore(result.final_score)}
              </span>
              <span className="text-gray-400 text-sm"> / 10</span>
            </MetricCard>
            <MetricCard label="Verdict">
              <VerdictBadge verdict={result.verdict} />
            </MetricCard>
            <MetricCard label="Total Funding">
              <span className="text-xl font-semibold text-gray-800">
                {formatMoney(sd.total_funding_usd)}
              </span>
            </MetricCard>
            <MetricCard label="Headcount">
              <span className="text-xl font-semibold text-gray-800">
                {formatHeadcount(sd.employee_count)}
              </span>
            </MetricCard>
          </div>

          {/* Two-column layout */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-6">
              {/* Dimension Scores */}
              <Card title="Dimension Scores">
                {DIMENSIONS.map((dim) => (
                  <ScoreBar
                    key={dim}
                    label={dim.charAt(0).toUpperCase() + dim.slice(1)}
                    score={scores[dim]}
                    rationale={rationale[dim]}
                  />
                ))}
              </Card>

              {/* Risk Flags */}
              <Card title="Risk Flags">
                {riskFlags.length === 0 ? (
                  <p className="text-sm text-gray-400">No significant risk flags identified.</p>
                ) : (
                  riskFlags.map((f, i) => (
                    <RiskFlag key={i} severity={f.severity} label={f.label} detail={f.detail} />
                  ))
                )}
              </Card>
            </div>

            {/* Right column — Memo */}
            <div>
              <Card title="Investment Memo">
                {/* Verdict banner */}
                <div className={`rounded-lg p-3 mb-4 text-sm font-medium ${
                  result.verdict === 'Invest' ? 'bg-green-50 text-green-700' :
                  result.verdict === 'Watch' ? 'bg-amber-50 text-amber-700' :
                  'bg-red-50 text-red-700'
                }`}>
                  Verdict: <strong>{result.verdict}</strong> — Score {formatScore(result.final_score)} / 10
                </div>
                <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                  <ReactMarkdown>{result.memo || 'No memo generated.'}</ReactMarkdown>
                </div>
              </Card>
            </div>
          </div>

          {/* Similar deals */}
          {result.similar_deals?.length > 0 && (
            <Card title={`Comparable Deals (${result.similar_deals.length} found)`}>
              <div className="flex gap-3 flex-wrap">
                {result.similar_deals.map((deal, i) => (
                  <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-600 max-w-xs">
                    {deal}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">{label}</p>
      <div className="flex items-baseline gap-1">{children}</div>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  )
}
