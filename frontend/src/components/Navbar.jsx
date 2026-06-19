import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Analyze' },
  { to: '/deals', label: 'Deals' },
  { to: '/compare', label: 'Compare' },
  { to: '/sectors', label: 'Sectors' },
]

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 h-16 flex items-center px-6">
      <span className="text-[#6366f1] font-bold text-xl tracking-tight mr-10 select-none">
        VC Agent
      </span>
      <div className="flex gap-1">
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'text-[#6366f1] border-b-2 border-[#6366f1] rounded-none'
                  : 'text-gray-500 hover:text-gray-900'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
