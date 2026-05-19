import { NavLink } from 'react-router-dom';
import { CalendarDays, BarChart2, Video, Zap, TrendingUp } from 'lucide-react';

const links = [
  { to: '/app/calendar', icon: CalendarDays, label: 'Calendar' },
  { to: '/app/strategy/organic', icon: TrendingUp, label: 'Organic' },
  { to: '/app/strategy/paid', icon: Zap, label: 'Paid' },
  { to: '/app/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/app/video/content_001', icon: Video, label: 'Video Agent' },
];

export function Sidebar() {
  return (
    <aside
      className="fixed left-0 top-0 h-full w-56 flex flex-col border-r border-[#E8EDF0] bg-white z-40"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      <div className="px-5 py-5 border-b border-[#E8EDF0]">
        <span className="text-[#051A24] text-base font-semibold tracking-tight">EstateFlow AI</span>
        <p className="text-[10px] text-[#051A24]/40 mt-0.5 uppercase tracking-widest">Growth Dashboard</p>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-[#051A24] text-white'
                  : 'text-[#051A24]/60 hover:text-[#051A24] hover:bg-[#051A24]/5'
              }`
            }
          >
            <Icon size={16} strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-[#E8EDF0]">
        <p className="text-xs text-[#051A24]/40">Dumont Immobilier</p>
        <p className="text-[11px] text-[#051A24]/30">Paris 15th · June 2026</p>
      </div>
    </aside>
  );
}
