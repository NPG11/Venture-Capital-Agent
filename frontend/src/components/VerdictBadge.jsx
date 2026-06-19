const styles = {
  Invest: 'bg-green-100 text-green-700 border border-green-200',
  Watch: 'bg-amber-100 text-amber-700 border border-amber-200',
  Pass: 'bg-red-100 text-red-700 border border-red-200',
}

export default function VerdictBadge({ verdict }) {
  const cls = styles[verdict] || 'bg-gray-100 text-gray-600 border border-gray-200'
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${cls}`}>
      {verdict || 'N/A'}
    </span>
  )
}
