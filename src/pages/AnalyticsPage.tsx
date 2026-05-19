import { useState, useRef } from 'react';
import { TrendingUp, Trophy, Play, Pause, ChevronRight } from 'lucide-react';
import { mockOrganicPerformance, mockPaidPerformance } from '../data/analytics';
import { mockPaidStrategy } from '../data/paidStrategy';
import { mockFeedback } from '../data/feedback';

type Tab = 'organic' | 'paid' | 'feedback';

function KPICard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8EDF0] p-4">
      <p className="text-2xl font-medium text-[#051A24]">{value}</p>
      <p className="text-xs text-[#051A24]/50 mt-1">{label}</p>
      {sub && <p className="text-[11px] text-[#051A24]/30 mt-0.5">{sub}</p>}
    </div>
  );
}

function CSSBar({ value, max, color = 'bg-[#051A24]' }: { value: number; max: number; color?: string }) {
  return (
    <div className="h-2 bg-[#E8EDF0] rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.round((value / max) * 100)}%` }}
      />
    </div>
  );
}

function OrganicTab() {
  const { total_reach, total_impressions, avg_engagement_rate, follower_growth, top_formats, pillar_performance } = mockOrganicPerformance;
  const maxReach = Math.max(...pillar_performance.map((p) => p.reach));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Total reach" value={total_reach.toLocaleString()} sub="May 2026" />
        <KPICard label="Impressions" value={total_impressions.toLocaleString()} />
        <KPICard label="Avg engagement" value={`${avg_engagement_rate}%`} />
        <KPICard label="Follower growth" value={`+${follower_growth}`} sub="this month" />
      </div>

      <div className="bg-white rounded-2xl border border-[#E8EDF0] p-5">
        <h3 className="text-sm font-medium text-[#051A24] mb-4">Reach by Pillar</h3>
        <div className="space-y-4">
          {pillar_performance.map((p) => (
            <div key={p.pillar}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-[#051A24]/70 capitalize">{p.pillar}</span>
                <div className="flex items-center gap-3 text-xs text-[#051A24]/50">
                  <span>{p.reach.toLocaleString()} reach</span>
                  <span>{p.engagement_rate}% eng.</span>
                  <span>{p.saves} saves</span>
                </div>
              </div>
              <CSSBar value={p.reach} max={maxReach} />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8EDF0] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E8EDF0]">
          <h3 className="text-sm font-medium text-[#051A24]">Top Performing Formats</h3>
        </div>
        <div className="divide-y divide-[#E8EDF0]">
          {top_formats.map((f, i) => (
            <div key={f.format} className="flex items-center gap-4 px-5 py-3">
              <span className="text-sm font-medium text-[#051A24]/30 w-4">{i + 1}</span>
              <p className="flex-1 text-sm text-[#051A24]">{f.format}</p>
              <p className="text-sm font-medium text-[#051A24]">{f.avg_views.toLocaleString()}</p>
              <p className="text-xs text-[#051A24]/40">avg views</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const VARIATION_VIDEOS: Record<string, string> = {
  paid_001_A: '/v1-creative-bg.mp4',
  paid_001_B: '/v2-creative-bg.mp4',
};

// Per-variation mock metrics — keyed by `${campaignId}_${variation}`
const VARIATION_METRICS: Record<string, { views: number; ctr: number; cpl: number; leads: number }> = {
  paid_001_A: { views: 18400, ctr: 3.8, cpl: 24.5, leads: 22 },
  paid_001_B: { views: 11200, ctr: 2.1, cpl: 38.0, leads: 8  },
  paid_001_C: { views:  9100, ctr: 1.7, cpl: 44.0, leads: 3  },
  paid_002_A: { views: 12300, ctr: 2.0, cpl: 42.0, leads: 9  },
  paid_002_B: { views: 19800, ctr: 3.4, cpl: 29.0, leads: 14 },
  paid_003_A: { views: 10600, ctr: 3.1, cpl: 22.0, leads: 6  },
  paid_003_B: { views: 24100, ctr: 5.2, cpl: 14.0, leads: 18 },
  paid_004_A: { views: 16900, ctr: 6.1, cpl: 11.0, leads: 9  },
  paid_004_B: { views:  8300, ctr: 3.9, cpl: 18.0, leads: 5  },
};

function VideoCard({
  variation,
  campaignId,
  isWinner,
  testAxis,
}: {
  variation: import('../types').ABVariation;
  campaignId: string;
  isWinner: boolean;
  testAxis: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const key = `${campaignId}_${variation.variation}`;
  const metrics = VARIATION_METRICS[key] ?? { views: 0, ctr: 0, cpl: 0, leads: 0 };
  const videoSrc = VARIATION_VIDEOS[key] ?? null;

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) { v.pause(); setPlaying(false); }
    else { v.play(); setPlaying(true); }
  };

  const changeLabel: Record<string, string> = {
    hook: 'Hook copy',
    cta: 'CTA copy',
    'creative format': 'Creative angle',
    offer: 'Offer framing',
    urgency: 'Urgency angle',
  };

  return (
    <div className={`flex flex-col rounded-2xl overflow-hidden border-2 transition-all ${
      isWinner ? 'border-emerald-400 shadow-md shadow-emerald-100' : 'border-[#E8EDF0]'
    }`}>
      {/* winner banner */}
      {isWinner && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500">
          <Trophy size={10} className="text-white" />
          <span className="text-[10px] font-semibold text-white uppercase tracking-wide">Winning creative</span>
        </div>
      )}

      {/* video */}
      <div className="relative bg-[#051A24] group cursor-pointer" style={{ height: videoSrc ? '300px' : '80px' }} onClick={toggle}>
        {videoSrc && (
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-full object-cover"
            loop
            muted
            autoPlay
            playsInline
            onEnded={() => setPlaying(false)}
          />
        )}
        {/* play/pause overlay */}
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${playing ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
            {playing ? <Pause size={14} className="text-white" /> : <Play size={14} className="text-white ml-0.5" />}
          </div>
        </div>
        {/* variation badge */}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm">
          <span className="text-[10px] font-bold text-white">Variation {variation.variation}</span>
        </div>
      </div>

      {/* annotation */}
      <div className="bg-white px-3 py-3 flex-1 space-y-2.5">
        {/* what changed */}
        <div className="flex items-start gap-2">
          <span className="text-[9px] font-semibold text-[#051A24]/30 uppercase tracking-wide mt-0.5 w-10 flex-shrink-0">
            {changeLabel[testAxis] ?? testAxis}
          </span>
          <p className="text-[11px] text-[#051A24]/70 leading-snug italic">"{variation.hook}"</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-semibold text-[#051A24]/30 uppercase tracking-wide w-10 flex-shrink-0">CTA</span>
          <span className="text-[10px] px-2 py-0.5 bg-[#051A24]/06 rounded-full text-[#051A24]/60 font-medium">{variation.cta}</span>
        </div>

        {/* divider */}
        <div className="border-t border-[#E8EDF0]" />

        {/* metrics */}
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: 'Views', value: metrics.views.toLocaleString() },
            { label: 'CTR', value: `${metrics.ctr}%` },
            { label: 'CPL', value: `€${metrics.cpl}` },
            { label: 'Leads', value: metrics.leads.toString() },
          ].map(({ label, value }) => (
            <div key={label} className={`rounded-lg p-2 text-center ${isWinner ? 'bg-emerald-50' : 'bg-[#F7F9FA]'}`}>
              <p className={`text-xs font-semibold ${isWinner ? 'text-emerald-700' : 'text-[#051A24]'}`}>{value}</p>
              <p className="text-[9px] text-[#051A24]/40 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <p className="text-[9px] text-[#051A24]/25 text-center">Source: Meta Ads Library · May 2026</p>
      </div>
    </div>
  );
}

function PaidTab() {
  const { total_spend, total_leads, avg_cpl, avg_roas, campaigns: perfCampaigns } = mockPaidPerformance;
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(mockPaidStrategy.campaigns[0].id);

  const selectedStrategy = mockPaidStrategy.campaigns.find(c => c.id === selectedCampaignId)!;
  const selectedPerf = perfCampaigns.find(c => c.campaign_id === selectedCampaignId);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Total spend" value={`€${total_spend.toLocaleString()}`} sub="May 2026" />
        <KPICard label="Total leads" value={total_leads.toString()} />
        <KPICard label="Avg CPL" value={`€${avg_cpl}`} />
        <KPICard label="Avg ROAS" value={`${avg_roas}x`} />
      </div>

      {/* Campaign selector + creative viewer */}
      <div className="flex gap-4 items-start">
        {/* Campaign list */}
        <div className="w-56 flex-shrink-0 bg-white rounded-2xl border border-[#E8EDF0] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E8EDF0]">
            <p className="text-xs font-semibold text-[#051A24]/50 uppercase tracking-wide">Campaigns</p>
          </div>
          {mockPaidStrategy.campaigns.map((c) => {
            const perf = perfCampaigns.find(p => p.campaign_id === c.id);
            const isActive = c.id === selectedCampaignId;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCampaignId(c.id)}
                className={`w-full text-left px-4 py-3 border-b border-[#E8EDF0] last:border-0 transition-colors flex items-center gap-2 ${
                  isActive ? 'bg-[#051A24]' : 'hover:bg-[#F7F9FA]'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] font-medium leading-snug truncate ${isActive ? 'text-white' : 'text-[#051A24]'}`}>
                    {c.campaign}
                  </p>
                  {perf && (
                    <p className={`text-[10px] mt-0.5 ${isActive ? 'text-white/50' : 'text-[#051A24]/40'}`}>
                      €{perf.cpl} CPL · {perf.lead_volume} leads
                    </p>
                  )}
                </div>
                <ChevronRight size={12} className={isActive ? 'text-white/50' : 'text-[#051A24]/20'} />
              </button>
            );
          })}
        </div>

        {/* Creative variations panel */}
        <div className="flex-1 min-w-0">
          {/* Campaign header */}
          <div className="bg-white rounded-2xl border border-[#E8EDF0] px-5 py-4 mb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#051A24]">{selectedStrategy.campaign}</p>
                <p className="text-xs text-[#051A24]/40 mt-0.5">{selectedStrategy.audience_segment}</p>
              </div>
              <div className="flex gap-3 flex-shrink-0">
                {[
                  { label: 'Budget', value: `€${selectedStrategy.budget_monthly}/mo` },
                  { label: 'Objective', value: selectedStrategy.objective },
                ].map(({ label, value }) => (
                  <div key={label} className="text-right">
                    <p className="text-xs font-medium text-[#051A24]">{value}</p>
                    <p className="text-[10px] text-[#051A24]/40">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            {selectedPerf && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                <Trophy size={12} className="text-emerald-600 flex-shrink-0" />
                <p className="text-[11px] text-emerald-700">
                  <span className="font-semibold">Variation {selectedPerf.winning_variation} won</span>
                  {' '}· {selectedPerf.winning_axis}
                </p>
              </div>
            )}
          </div>

          {/* Video cards side by side */}
          <div className={`grid gap-4 ${
            selectedStrategy.creative_variations.length === 2 ? 'grid-cols-2' :
            selectedStrategy.creative_variations.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
          }`}>
            {selectedStrategy.creative_variations.map((v) => (
              <VideoCard
                key={v.variation}
                variation={v}
                campaignId={selectedStrategy.id}
                isWinner={selectedPerf?.winning_variation === v.variation}
                testAxis={v.test_axis}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedbackTab() {
  const { organic_winners, organic_losers, paid_winners, next_month_recommendations } = mockFeedback;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E8EDF0] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E8EDF0] flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <h3 className="text-sm font-medium text-[#051A24]">Organic Winners</h3>
        </div>
        <div className="divide-y divide-[#E8EDF0]">
          {organic_winners.map((w) => (
            <div key={w.format} className="px-5 py-4">
              <p className="text-sm font-medium text-[#051A24] mb-1">{w.format}</p>
              <p className="text-xs text-[#051A24]/50 mb-2">{w.reason}</p>
              <div className="flex items-start gap-1.5">
                <TrendingUp size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-green-700">{w.recommendation}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8EDF0] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E8EDF0] flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <h3 className="text-sm font-medium text-[#051A24]">What to Drop</h3>
        </div>
        <div className="divide-y divide-[#E8EDF0]">
          {organic_losers.map((w) => (
            <div key={w.format} className="px-5 py-4">
              <p className="text-sm font-medium text-[#051A24] mb-1">{w.format}</p>
              <p className="text-xs text-[#051A24]/50 mb-2">{w.reason}</p>
              <p className="text-xs text-red-600">{w.recommendation}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8EDF0] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E8EDF0] flex items-center gap-2">
          <Trophy size={14} className="text-amber-500" />
          <h3 className="text-sm font-medium text-[#051A24]">Paid Winners</h3>
        </div>
        <div className="divide-y divide-[#E8EDF0]">
          {paid_winners.map((w) => (
            <div key={w.campaign} className="px-5 py-4">
              <p className="text-sm font-medium text-[#051A24] mb-0.5">{w.campaign}</p>
              <p className="text-xs text-[#051A24]/50 mb-2">Winning {w.winning_axis}: "{w.winning_variation}"</p>
              <p className="text-xs text-amber-700 font-medium">{w.metric}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#051A24] rounded-2xl p-5">
        <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Next Month Recommendations</p>
        <div className="space-y-2.5">
          {next_month_recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-xs text-white/30 font-mono mt-0.5 flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
              <p className="text-sm text-white/80 leading-relaxed">{rec}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>('organic');

  return (
    <div className="p-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="mb-6">
        <p className="text-xs text-[#051A24]/40 uppercase tracking-widest mb-1">Performance</p>
        <h1 className="text-2xl font-medium text-[#051A24]">Analytics Dashboard</h1>
        <p className="text-sm text-[#051A24]/50 mt-1">May 2026 · Dumont Immobilier</p>
      </div>

      <div className="flex gap-1 bg-white border border-[#E8EDF0] rounded-xl p-1 mb-6 w-fit">
        {(['organic', 'paid', 'feedback'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-150 ${
              tab === t ? 'bg-[#051A24] text-white' : 'text-[#051A24]/50 hover:text-[#051A24]'
            }`}
          >
            {t === 'feedback' ? 'Feedback Loop' : t}
          </button>
        ))}
      </div>

      {tab === 'organic' && <OrganicTab />}
      {tab === 'paid' && <PaidTab />}
      {tab === 'feedback' && <FeedbackTab />}
    </div>
  );
}
