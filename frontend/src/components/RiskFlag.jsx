export default function RiskFlag({ severity, label, detail }) {
  const dotColor = severity === 'critical' ? 'bg-red-500' : 'bg-amber-400'
  const borderColor = severity === 'critical' ? 'border-red-100' : 'border-amber-100'
  const bgColor = severity === 'critical' ? 'bg-red-50' : 'bg-amber-50'

  return (
    <div className={`flex gap-3 p-3 rounded-lg border ${bgColor} ${borderColor} mb-2`}>
      <div className="flex-shrink-0 mt-1.5">
        <span className={`block w-2 h-2 rounded-full ${dotColor}`} />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{detail}</p>
      </div>
    </div>
  )
}
