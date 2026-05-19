import type { PaidStrategy } from '../types';

export const mockPaidStrategy: PaidStrategy = {
  campaigns: [
    {
      id: 'paid_001',
      campaign: 'Seller Valuation Campaign',
      objective: 'lead generation',
      audience_segment: 'homeowners in Paris 15th, age 35–65, property owners',
      budget_monthly: 800,
      kpi_targets: {
        CTR: '> 2.5%',
        CPL: '< €35',
        lead_quality: 'qualified seller leads only',
      },
      creative_variations: [
        {
          variation: 'A',
          test_axis: 'hook',
          hook: 'Your home may be worth more than you think in 2026',
          cta: 'Get a free valuation',
        },
        {
          variation: 'B',
          test_axis: 'hook',
          hook: '3 signs now is a good time to sell in your neighborhood',
          cta: 'Book a seller consultation',
        },
      ],
      success_metrics: ['CTR', 'CPL', 'lead quality', 'consultation bookings'],
    },
    {
      id: 'paid_002',
      campaign: 'Buyer Lead Campaign',
      objective: 'lead generation',
      audience_segment: 'renters and buyers in Paris, age 28–45, looking to purchase in next 12 months',
      budget_monthly: 600,
      kpi_targets: {
        CTR: '> 1.8%',
        CPL: '< €50',
        ROAS: '> 3x',
      },
      creative_variations: [
        {
          variation: 'A',
          test_axis: 'hook',
          hook: 'Looking for a family apartment in Paris 15th? See what is available now',
          cta: 'Browse listings',
        },
        {
          variation: 'B',
          test_axis: 'hook',
          hook: 'New listings under €600k in the 15th — updated weekly',
          cta: 'Get early access',
        },
      ],
      success_metrics: ['CTR', 'CPL', 'ROAS', 'viewing requests'],
    },
    {
      id: 'paid_003',
      campaign: 'Listing Promotion — 42 Rue du Commerce',
      objective: 'property interest generation',
      audience_segment: 'buyers in Paris 15th and surrounding areas, age 30–55, high income',
      budget_monthly: 400,
      kpi_targets: {
        video_views: '> 10,000',
        CTR: '> 3%',
        viewing_requests: '> 15',
      },
      creative_variations: [
        {
          variation: 'A',
          test_axis: 'creative format',
          hook: 'Would you live here? Beautiful 3-bed in the heart of Paris 15th',
          cta: 'Book a viewing',
        },
        {
          variation: 'B',
          test_axis: 'creative format',
          hook: 'This apartment has a rare feature you almost never find in the 15th',
          cta: 'See the full tour',
        },
      ],
      success_metrics: ['video views', 'CTR', 'viewing requests', 'time on listing'],
    },
    {
      id: 'paid_004',
      campaign: 'Retargeting — Warm Leads',
      objective: 'conversion',
      audience_segment: 'website visitors last 30 days + 50%+ video viewers + CRM warm leads',
      budget_monthly: 300,
      kpi_targets: {
        CTR: '> 4%',
        CPL: '< €20',
        conversion_rate: '> 8%',
      },
      creative_variations: [
        {
          variation: 'A',
          test_axis: 'offer',
          hook: 'Still thinking about selling? We have helped 47 families in the 15th this year alone.',
          cta: 'Book your free valuation now',
        },
        {
          variation: 'B',
          test_axis: 'urgency',
          hook: 'Spring is the best time to sell in Paris. Do not miss the window.',
          cta: 'Contact us today',
        },
      ],
      success_metrics: ['CTR', 'CPL', 'consultation bookings', 'conversion rate'],
    },
  ],
};
