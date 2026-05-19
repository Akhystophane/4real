import { mockOrganicStrategy } from '../data/organicStrategy';
import type { ContentPillar } from '../types';

const PILLAR_META: Record<ContentPillar, { emoji: string; description: string }> = {
  'seller education': { emoji: '🏠', description: 'Generate seller consultation requests and valuation leads.' },
  'buyer education': { emoji: '🔑', description: 'Attract and educate buyers looking in your market.' },
  'listing content': { emoji: '📸', description: 'Showcase available properties and generate viewing requests.' },
  'local authority': { emoji: '📍', description: 'Position yourself as the go-to local expert.' },
  'trust building': { emoji: '⭐', description: 'Build credibility through client stories and case studies.' },
  'educational': { emoji: '📚', description: 'Educate your audience on processes, costs, and decisions.' },
};

const STATUS_COLORS: Record<string, string> = {
  strategy_approved: 'bg-slate-100 text-slate-600',
  assets_needed: 'bg-orange-50 text-orange-700',
  script_drafted: 'bg-blue-50 text-blue-700',
  voiceover_generated: 'bg-violet-50 text-violet-700',
  ready_for_review: 'bg-green-50 text-green-700',
};

const STATUS_LABELS: Record<string, string> = {
  strategy_approved: 'Strategy approved',
  assets_needed: 'Assets needed',
  script_drafted: 'Script drafted',
  voiceover_generated: 'Voice-over ready',
  ready_for_review: 'Ready for review',
};

export function OrganicStrategyPage() {
  const { monthly_post_count, stories_per_week, pillars, content_items } = mockOrganicStrategy;
  const pillarCounts = pillars.reduce<Partial<Record<ContentPillar, number>>>((acc, p) => {
    acc[p] = content_items.filter((i) => i.pillar === p).length;
    return acc;
  }, {});

  return (
    <div className="p-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="mb-6">
        <p className="text-xs text-[#051A24]/40 uppercase tracking-widest mb-1">Strategy</p>
        <h1 className="text-2xl font-medium text-[#051A24]">Organic Content Strategy</h1>
        <p className="text-sm text-[#051A24]/50 mt-1">June 2026 · AI-generated for Dumont Immobilier</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          ['Monthly posts', monthly_post_count],
          ['Stories / week', stories_per_week],
          ['Content pillars', pillars.length],
        ].map(([label, val]) => (
          <div key={label as string} className="bg-white rounded-2xl border border-[#E8EDF0] p-4">
            <p className="text-2xl font-medium text-[#051A24]">{val}</p>
            <p className="text-xs text-[#051A24]/40 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-medium text-[#051A24] mb-3">Content Pillars</h2>
      <div className="grid grid-cols-2 gap-3 mb-8">
        {pillars.map((pillar) => {
          const meta = PILLAR_META[pillar];
          return (
            <div key={pillar} className="bg-white rounded-2xl border border-[#E8EDF0] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg">{meta.emoji}</span>
                <span className="text-xs text-[#051A24]/40">{pillarCounts[pillar] ?? 0} posts</span>
              </div>
              <p className="text-sm font-medium text-[#051A24] capitalize mb-1">{pillar}</p>
              <p className="text-xs text-[#051A24]/50 leading-relaxed">{meta.description}</p>
            </div>
          );
        })}
      </div>

      <h2 className="text-sm font-medium text-[#051A24] mb-3">Content Items</h2>
      <div className="bg-white rounded-2xl border border-[#E8EDF0] overflow-hidden">
        <div className="grid grid-cols-[1fr,auto,auto,auto] gap-x-4 px-5 py-2.5 border-b border-[#E8EDF0] bg-[#F7F9FA]">
          <p className="text-[10px] font-medium text-[#051A24]/40 uppercase tracking-widest">Title</p>
          <p className="text-[10px] font-medium text-[#051A24]/40 uppercase tracking-widest">Format</p>
          <p className="text-[10px] font-medium text-[#051A24]/40 uppercase tracking-widest">Target</p>
          <p className="text-[10px] font-medium text-[#051A24]/40 uppercase tracking-widest">Status</p>
        </div>
        {content_items.map((item) => (
          <div key={item.id} className="grid grid-cols-[1fr,auto,auto,auto] gap-x-4 items-center px-5 py-3.5 border-b border-[#E8EDF0] last:border-0 hover:bg-[#F7F9FA] transition-colors">
            <div>
              <p className="text-sm text-[#051A24]">{item.title}</p>
              <p className="text-[11px] text-[#051A24]/40 capitalize">{item.pillar}</p>
            </div>
            <p className="text-xs text-[#051A24]/60 whitespace-nowrap">{item.format}</p>
            <p className="text-xs text-[#051A24]/60 capitalize whitespace-nowrap">{item.target_audience}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_COLORS[item.production_status] ?? 'bg-slate-50 text-slate-500'}`}>
              {STATUS_LABELS[item.production_status] ?? item.production_status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
