export const formatMoney = (n) => {
  if (n == null) return 'N/A'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`
  return `$${n.toLocaleString()}`
}

export const formatScore = (n) => (n != null ? Number(n).toFixed(1) : 'N/A')

export const scoreColor = (n) => {
  if (n == null) return 'text-gray-400'
  if (n >= 7) return 'text-green-600'
  if (n >= 4) return 'text-amber-600'
  return 'text-red-600'
}

export const scoreBgColor = (n) => {
  if (n == null) return 'bg-gray-300'
  if (n >= 7) return 'bg-green-500'
  if (n >= 4) return 'bg-amber-500'
  return 'bg-red-500'
}

export const formatDate = (iso) => {
  if (!iso) return 'N/A'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const formatHeadcount = (n) => {
  if (n == null) return 'N/A'
  return Number(n).toLocaleString()
}
