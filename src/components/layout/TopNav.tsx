import { ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { ActiveView } from '../../context/AppContext';

const NAV_TABS: { id: Exclude<ActiveView, { type: string }>; label: string }[] = [
  { id: 'calendar', label: 'Calendar' },
  { id: 'strategy/organic', label: 'Organic' },
  { id: 'strategy/paid', label: 'Paid' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'assets', label: 'Assets' },
];

export function TopNav() {
  const { activeView, setActiveView } = useApp();
  const isVideoView = typeof activeView === 'object' && activeView.type === 'video';

  return (
    <div
      className="flex items-center gap-1 px-4 py-2.5 bg-white"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {isVideoView ? (
        <button
          onClick={() => setActiveView('calendar')}
          className="flex items-center gap-1.5 text-sm text-[#051A24]/50 hover:text-[#051A24] transition-colors mr-2"
        >
          <ArrowLeft size={14} />
          Back to calendar
        </button>
      ) : (
        <div className="flex items-center gap-0.5">
          {NAV_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                activeView === tab.id
                  ? 'bg-[#051A24] text-white'
                  : 'text-[#051A24]/50 hover:text-[#051A24] hover:bg-[#051A24]/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-[#051A24]/30">Dumont Immobilier · June 2026</span>
      </div>
    </div>
  );
}
