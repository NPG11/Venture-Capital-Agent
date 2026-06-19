import { scoreBgColor } from '../utils'

export default function ScoreBar({ label, score, rationale }) {
  const pct = score != null ? (score / 10) * 100 : 0
  const barColor = scoreBgColor(score)

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-semibold text-gray-900">
          {score != null ? `${Number(score).toFixed(1)} / 10` : 'N/A'}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {rationale && (
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{rationale}</p>
      )}
    </div>
  )
}
