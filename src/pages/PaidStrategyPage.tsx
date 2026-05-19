import { mockPaidStrategy } from '../data/paidStrategy';

export function PaidStrategyPage() {
  const { campaigns } = mockPaidStrategy;
  const totalBudget = campaigns.reduce((sum, c) => sum + c.budget_monthly, 0);

  return (
    <div className="p-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="mb-6">
        <p className="text-xs text-[#051A24]/40 uppercase tracking-widest mb-1">Strategy</p>
        <h1 className="text-2xl font-medium text-[#051A24]">Paid Content Strategy</h1>
        <p className="text-sm text-[#051A24]/50 mt-1">June 2026 · {campaigns.length} campaigns · €{totalBudget.toLocaleString()}/month</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {[
          ['Campaigns', campaigns.length],
          ['Monthly budget', `€${totalBudget.toLocaleString()}`],
          ['A/B variations', campaigns.reduce((s, c) => s + c.creative_variations.length, 0)],
          ['Avg variations/campaign', (campaigns.reduce((s, c) => s + c.creative_variations.length, 0) / campaigns.length).toFixed(1)],
        ].map(([label, val]) => (
          <div key={label as string} className="bg-white rounded-2xl border border-[#E8EDF0] p-4">
            <p className="text-2xl font-medium text-[#051A24]">{val}</p>
            <p className="text-xs text-[#051A24]/40 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="bg-white rounded-2xl border border-[#E8EDF0] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E8EDF0] flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-medium text-[#051A24]">{campaign.campaign}</h2>
                <p className="text-xs text-[#051A24]/50 mt-0.5">{campaign.objective} · {campaign.audience_segment}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium text-[#051A24]">€{campaign.budget_monthly.toLocaleString()}</p>
                <p className="text-[11px] text-[#051A24]/40">per month</p>
              </div>
            </div>

            <div className="px-5 py-4 border-b border-[#E8EDF0]">
              <p className="text-[10px] text-[#051A24]/40 uppercase tracking-widest mb-2">KPI Targets</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(campaign.kpi_targets).map(([key, val]) => (
                  <div key={key} className="bg-[#F7F9FA] rounded-lg px-3 py-1.5">
                    <p className="text-[10px] text-[#051A24]/40">{key}</p>
                    <p className="text-xs font-medium text-[#051A24]">{val}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 py-4">
              <p className="text-[10px] text-[#051A24]/40 uppercase tracking-widest mb-3">A/B Creative Variations</p>
              <div className="space-y-2">
                {campaign.creative_variations.map((v) => {
                  const videoSrc = campaign.id === 'paid_001' && v.variation === 'A' ? '/v1-creative-bg.mp4'
                    : campaign.id === 'paid_001' && v.variation === 'B' ? '/v2-creative-bg.mp4'
                    : null;
                  return (
                  <div key={v.variation} className="bg-[#F7F9FA] rounded-xl overflow-hidden">
                    {videoSrc && (
                      <video
                        src={videoSrc}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full aspect-[9/16] object-cover max-h-[420px]"
                      />
                    )}
                    <div className="flex items-start gap-3 p-3">
                      <div className="w-6 h-6 rounded-full bg-[#051A24] text-white text-[11px] font-medium flex items-center justify-center flex-shrink-0">
                        {v.variation}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] px-2 py-0.5 bg-[#051A24]/5 rounded-full text-[#051A24]/50">Test axis: {v.test_axis}</span>
                        </div>
                        <p className="text-xs text-[#051A24] italic mb-1">"{v.hook}"</p>
                        <p className="text-[11px] text-[#051A24]/50">CTA: {v.cta}</p>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
