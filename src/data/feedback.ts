import type { StrategyFeedbackReport } from '../types';

export const mockFeedback: StrategyFeedbackReport = {
  period: 'May 2026',
  organic_winners: [
    {
      format: 'seller education talking-head',
      reason: 'highest save rate (340 saves) and strong comment quality with seller intent signals',
      recommendation: 'increase from 4 to 8 posts next month — double down on this pillar',
    },
    {
      format: 'neighborhood lifestyle reel',
      reason: 'strong reach (12,100) and 5.1% engagement — outperforming platform average',
      recommendation: 'produce 2 more local guides for July, focus on family-relevant spots',
    },
  ],
  organic_losers: [
    {
      format: 'generic educational posts (non-video)',
      reason: 'lowest engagement rate (2.8%) and minimal saves — audience prefers video format',
      recommendation: 'convert all educational content to talking-head short video format',
    },
    {
      format: 'trust building — static testimonial graphics',
      reason: 'low reach and no measurable lead impact versus video testimonials',
      recommendation: 'replace static graphics with 30-second video testimonial clips',
    },
  ],
  paid_winners: [
    {
      campaign: 'Retargeting — Warm Leads',
      winning_axis: 'offer',
      winning_variation: 'social proof angle — "47 families helped"',
      metric: 'lowest CPL (€12) and highest ROAS (8.2x)',
    },
    {
      campaign: 'Seller Valuation Campaign',
      winning_axis: 'hook',
      winning_variation: '"Your home may be worth more than you think in 2026"',
      metric: 'best CTR (3.1%) and strongest lead quality score',
    },
  ],
  next_month_recommendations: [
    'Use seller education as the primary organic pillar — double post frequency.',
    'Turn the top 2 seller education posts into paid lead-gen creatives.',
    'Test a sub-2-second hook version for buyer campaigns on TikTok.',
    'Reduce static testimonial graphics — replace with 30-second video testimonials.',
    'Expand retargeting audience to 60-day window given strong ROAS.',
    'Create a neighborhood guide series (3 episodes) for local authority building.',
    'Test the winning "rare feature" angle from listing campaign on all future listing content.',
  ],
};
