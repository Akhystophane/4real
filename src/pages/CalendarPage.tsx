import { useState } from 'react';
import { X, ChevronRight, Video, ChevronLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { ContentItem, ContentPillar, ProductionStatus } from '../types';

const PILLAR_COLORS: Record<ContentPillar, { bg: string; text: string; dot: string; border: string }> = {
  'seller education': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400', border: 'border-amber-200' },
  'buyer education':  { bg: 'bg-blue-50',  text: 'text-blue-700',  dot: 'bg-blue-400',  border: 'border-blue-200'  },
  'listing content':  { bg: 'bg-violet-50',text: 'text-violet-700',dot: 'bg-violet-400',border: 'border-violet-200'},
  'local authority':  { bg: 'bg-emerald-50',text:'text-emerald-700',dot:'bg-emerald-400',border:'border-emerald-200'},
  'trust building':   { bg: 'bg-rose-50',  text: 'text-rose-700',  dot: 'bg-rose-400',  border: 'border-rose-200'  },
  'educational':      { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400', border: 'border-slate-200' },
};

const STATUS_LABELS: Record<ProductionStatus, string> = {
  strategy_approved:   'Strategy approved',
  assets_needed:       'Assets needed',
  script_drafted:      'Script drafted',
  voiceover_generated: 'Voice-over ready',
  video_pending:       'Video pending',
  editing:             'Editing',
  ready_for_review:    'Ready for review',
  approved:            'Approved',
  scheduled:           'Scheduled',
  published:           'Published',
  performance_tracked: 'Tracked',
};

const STATUS_ORDER: ProductionStatus[] = [
  'strategy_approved','assets_needed','script_drafted','voiceover_generated',
  'video_pending','editing','ready_for_review','approved','scheduled','published','performance_tracked',
];

const STATUS_COLORS: Partial<Record<ProductionStatus, string>> = {
  ready_for_review:    'bg-green-50 text-green-700',
  assets_needed:       'bg-orange-50 text-orange-700',
  script_drafted:      'bg-blue-50 text-blue-700',
  voiceover_generated: 'bg-violet-50 text-violet-700',
  published:           'bg-emerald-50 text-emerald-700',
  strategy_approved:   'bg-slate-50 text-slate-500',
};

function StatusBadge({ status }: { status: ProductionStatus }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status] ?? 'bg-slate-50 text-slate-500'}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function CalendarEventChip({ item, onClick, isNew }: { item: ContentItem; onClick: () => void; isNew?: boolean }) {
  const c = PILLAR_COLORS[item.pillar];
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded truncate ${c.bg} ${c.text} hover:opacity-80 transition-opacity ${isNew ? 'animate-cal-card-in' : ''}`}
    >
      {item.title}
    </button>
  );
}

function DetailPanel({ item, onClose }: { item: ContentItem; onClose: () => void }) {
  const { setActiveView } = useApp();
  const c = PILLAR_COLORS[item.pillar];
  const currentStatusIndex = STATUS_ORDER.indexOf(item.production_status);

  // Agent may return hook/structure/cta at top level instead of nested in recipe
  const raw = item as unknown as Record<string, unknown>;
  const hook      = item.recipe?.hook      ?? raw.hook as string      ?? '';
  const structure = item.recipe?.structure ?? raw.structure as string[] ?? [];
  const cta       = item.recipe?.cta       ?? raw.cta as string       ?? '';

  return (
    <div className="fixed inset-0 z-50 flex" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex-1 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-[#E8EDF0] px-5 py-4 flex items-center justify-between z-10">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
            <div className={`w-2 h-2 rounded-full ${c.dot}`} />
            {item.pillar}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#F7F9FA] rounded-lg transition-colors">
            <X size={16} className="text-[#051A24]/40" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-6">
          <div>
            <h2 className="text-lg font-medium text-[#051A24] leading-snug">{item.title}</h2>
            <p className="text-xs text-[#051A24]/40 mt-1">
              {new Date(item.scheduled_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[['Format', item.format], ['Target', item.target_audience], ['Objective', item.objective], ['Channel', item.channel]].map(([label, val]) => (
              <div key={label} className="bg-[#F7F9FA] rounded-xl p-3">
                <p className="text-[10px] text-[#051A24]/40 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-xs text-[#051A24] font-medium capitalize">{val}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs font-medium text-[#051A24] mb-2">Platforms</p>
            <div className="flex flex-wrap gap-1.5">
              {item.platforms.map((p) => (
                <span key={p} className="px-2.5 py-1 bg-[#051A24]/5 rounded-full text-[11px] text-[#051A24]/70">{p}</span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-[#051A24] mb-2">Content Recipe</p>
            <div className="bg-[#F7F9FA] rounded-xl p-4 space-y-3">
              <div>
                <p className="text-[10px] text-[#051A24]/40 uppercase tracking-widest mb-1">Hook</p>
                <p className="text-xs text-[#051A24] italic">"{hook}"</p>
              </div>
              <div>
                <p className="text-[10px] text-[#051A24]/40 uppercase tracking-widest mb-1">Structure</p>
                <div className="flex flex-wrap gap-1.5">
                  {structure.map((s, i) => (
                    <span key={i} className="flex items-center gap-1 text-[11px] text-[#051A24]/60">
                      {i > 0 && <span className="text-[#051A24]/20">→</span>}
                      <span className="bg-white border border-[#E8EDF0] px-2 py-0.5 rounded">{s}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-[#051A24]/40 uppercase tracking-widest mb-1">CTA</p>
                <p className="text-xs text-[#051A24]">{cta}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-[#051A24] mb-2">Required Assets</p>
            <div className="space-y-1.5">
              {item.required_assets.map((asset) => (
                <div key={asset} className="flex items-center gap-2 text-xs text-[#051A24]/60">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#051A24]/20" />
                  {asset}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-[#051A24] mb-3">Production Status</p>
            <div className="relative">
              <div className="absolute left-2 top-0 bottom-0 w-px bg-[#E8EDF0]" />
              <div className="space-y-2 pl-7">
                {STATUS_ORDER.slice(0, 7).map((s, i) => {
                  const done = i <= currentStatusIndex;
                  const current = i === currentStatusIndex;
                  return (
                    <div key={s} className="relative flex items-center gap-2">
                      <div className={`absolute -left-7 w-4 h-4 rounded-full border-2 flex items-center justify-center ${done ? 'border-[#051A24] bg-[#051A24]' : 'border-[#E8EDF0] bg-white'}`}>
                        {done && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className={`text-xs ${current ? 'text-[#051A24] font-medium' : done ? 'text-[#051A24]/50' : 'text-[#051A24]/25'}`}>
                        {STATUS_LABELS[s]}
                      </span>
                      {current && <span className="text-[10px] px-1.5 py-0.5 bg-[#051A24] text-white rounded-full">now</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            onClick={() => { onClose(); setActiveView({ type: 'video', contentItemId: item.id }); }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-[#051A24] text-white text-sm font-medium hover:opacity-80 transition-opacity"
          >
            <Video size={15} />
            Open Video Agent
          </button>
        </div>
      </div>
    </div>
  );
}

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function buildCalendarGrid(year: number, month: number) {
  // month is 1-indexed
  const firstDay = new Date(year, month - 1, 1);
  // getDay(): 0=Sun,1=Mon…6=Sat → convert to Mon-based: Mon=0…Sun=6
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function CalendarPage() {
  const { calendarItems, newItemIds } = useApp();
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const [pillarFilter, setPillarFilter] = useState<ContentPillar | 'all'>('all');
  const [displayYear, setDisplayYear] = useState(2026);
  const [displayMonth, setDisplayMonth] = useState(5); // May=5

  const YEAR = displayYear;
  const MONTH = displayMonth;

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === YEAR && today.getMonth() + 1 === MONTH;
  const todayDate = isCurrentMonth ? today.getDate() : -1;

  const cells = buildCalendarGrid(YEAR, MONTH);

  const filteredItems = calendarItems.filter((item) =>
    pillarFilter === 'all' || item.pillar === pillarFilter
  );

  const itemsByDay = (day: number) =>
    filteredItems.filter((item) => {
      const d = new Date(item.scheduled_date);
      return d.getFullYear() === YEAR && d.getMonth() + 1 === MONTH && d.getDate() === day;
    });

  const allPillars = [...new Set(calendarItems.map((i) => i.pillar))];

  const prevMonth = () => {
    if (MONTH === 1) { setDisplayMonth(12); setDisplayYear(y => y - 1); }
    else setDisplayMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (MONTH === 12) { setDisplayMonth(1); setDisplayYear(y => y + 1); }
    else setDisplayMonth(m => m + 1);
  };

  return (
    <div className="p-5 min-h-screen" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-medium text-[#051A24]">{MONTH_NAMES[MONTH - 1]} {YEAR}</h1>
          <p className="text-xs text-[#051A24]/40 mt-0.5">{filteredItems.filter(i => { const d = new Date(i.scheduled_date); return d.getFullYear() === YEAR && d.getMonth() + 1 === MONTH; }).length} pieces this month</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-[#E8EDF0] transition-colors">
            <ChevronLeft size={16} className="text-[#051A24]/50" />
          </button>
          <button onClick={() => { setDisplayYear(2026); setDisplayMonth(5); }} className="px-3 py-1 text-xs text-[#051A24]/50 hover:text-[#051A24] transition-colors">Today</button>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-[#E8EDF0] transition-colors">
            <ChevronRight size={16} className="text-[#051A24]/50" />
          </button>
        </div>
      </div>

      {/* pillar filters */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button
          onClick={() => setPillarFilter('all')}
          className={`text-[11px] px-3 py-1 rounded-full border transition-all ${pillarFilter === 'all' ? 'bg-[#051A24] text-white border-[#051A24]' : 'border-[#E8EDF0] text-[#051A24]/50 hover:border-[#051A24]/30'}`}
        >
          All
        </button>
        {allPillars.map((p) => {
          const c = PILLAR_COLORS[p];
          return (
            <button
              key={p}
              onClick={() => setPillarFilter(pillarFilter === p ? 'all' : p)}
              className={`flex items-center gap-1 text-[11px] px-3 py-1 rounded-full border transition-all ${pillarFilter === p ? `${c.bg} ${c.text} border-transparent` : 'border-[#E8EDF0] text-[#051A24]/50 hover:border-[#051A24]/30'}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
              {p}
            </button>
          );
        })}
      </div>

      {/* calendar grid */}
      <div className="bg-white rounded-2xl border border-[#E8EDF0] overflow-hidden">
        {/* day headers */}
        <div className="grid grid-cols-7 border-b border-[#E8EDF0]">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="py-2 text-[11px] font-medium text-[#051A24]/40 text-center">
              {d}
            </div>
          ))}
        </div>

        {/* day cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            const isToday = day === todayDate;
            const dayItems = day ? itemsByDay(day) : [];
            const isLastRow = idx >= cells.length - 7;
            const isRightEdge = (idx + 1) % 7 === 0;

            return (
              <div
                key={idx}
                className={`min-h-[90px] p-1.5 border-[#E8EDF0] ${!isLastRow ? 'border-b' : ''} ${!isRightEdge ? 'border-r' : ''} ${!day ? 'bg-[#F7F9FA]/50' : ''}`}
              >
                {day && (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-[11px] font-medium w-5 h-5 flex items-center justify-center rounded-full ${
                          isToday
                            ? 'bg-[#051A24] text-white'
                            : 'text-[#051A24]/40'
                        }`}
                      >
                        {day}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {dayItems.map((item) => (
                        <CalendarEventChip key={item.id} item={item} onClick={() => setSelected(item)} isNew={newItemIds.has(item.id)} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* list below */}
      <div className="mt-5 bg-white rounded-2xl border border-[#E8EDF0] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E8EDF0]">
          <h2 className="text-xs font-medium text-[#051A24]">Scheduled content</h2>
        </div>
        <div className="divide-y divide-[#E8EDF0]">
          {filteredItems.map((item) => {
            const c = PILLAR_COLORS[item.pillar];
            return (
              <button
                key={item.id}
                onClick={() => setSelected(item)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F7F9FA] transition-colors text-left"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#051A24] truncate">{item.title}</p>
                  <p className="text-[11px] text-[#051A24]/40 capitalize">{item.pillar} · {item.format}</p>
                </div>
                <StatusBadge status={item.production_status} />
                <p className="text-xs text-[#051A24]/30 flex-shrink-0 ml-2">
                  {new Date(item.scheduled_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </p>
                <ChevronRight size={13} className="text-[#051A24]/20 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {selected && <DetailPanel item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
