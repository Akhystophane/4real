import type { VideoProductionJob } from '../types';

export const mockVideoJobs: VideoProductionJob[] = [
  {
    content_item_id: 'content_001',
    assets: [
      { id: 'a1', type: 'agent_clip', label: 'agent_talking_head_intro', source: 'user_upload', status: 'approved' },
      { id: 'a2', type: 'data_graphic', label: 'local_pricing_data_overlay', source: 'generated', status: 'approved' },
      { id: 'a3', type: 'brand_template', label: 'dumont_brand_lower_third', source: 'brand_assets', status: 'approved' },
    ],
    script: {
      hook: 'Most sellers lose money before they even list their home.',
      scenes: [
        { timestamp: '0–2s', description: 'Agent on camera, direct to lens. Hook delivered with confidence.' },
        { timestamp: '2–6s', description: 'Cut to text overlay: Mistake #1 — Skipping pre-sale renovations.' },
        { timestamp: '6–10s', description: 'Back to agent. Mistake #2 — Overpricing based on emotions.' },
        { timestamp: '10–14s', description: 'Agent + price data graphic. Mistake #3 — Not knowing current market comparables.' },
        { timestamp: '14–18s', description: 'Soft close: "These three mistakes cost sellers an average of €15,000."' },
        { timestamp: '18–22s', description: 'CTA screen with logo and contact info.' },
      ],
      cta: 'DM us for a free property valuation — no commitment.',
    },
    voiceover_status: 'not_started',
    video_status: 'not_started',
  },
  {
    content_item_id: 'content_004',
    assets: [
      { id: 'b1', type: 'property_video', label: 'listing_walkthrough_42_rue_commerce', source: 'user_upload', status: 'approved' },
      { id: 'b2', type: 'property_photo', label: 'living_room_wide_angle', source: 'user_upload', status: 'approved' },
      { id: 'b3', type: 'property_photo', label: 'kitchen_natural_light', source: 'user_upload', status: 'approved' },
      { id: 'b4', type: 'property_photo', label: 'master_bedroom_view', source: 'user_upload', status: 'approved' },
      { id: 'b5', type: 'listing_data', label: 'address_and_price_details', source: 'crm', status: 'approved' },
    ],
    script: {
      hook: 'POV: you just moved into this 3-bedroom in the heart of Paris 15th.',
      scenes: [
        { timestamp: '0–2s', description: 'Slow push through the front door. Cinematic reveal of the entrance hallway.' },
        { timestamp: '2–6s', description: 'Living room walk-through. Natural light, parquet floors, Haussmann ceiling height.' },
        { timestamp: '6–10s', description: 'Kitchen — open plan, stone countertops, south-facing window.' },
        { timestamp: '10–14s', description: 'Master bedroom with direct view over the courtyard.' },
        { timestamp: '14–18s', description: 'Back to entrance. Text overlay: 85m² — 3 bedrooms — Paris 15th — €745,000.' },
        { timestamp: '18–22s', description: 'CTA: "DM us to book a private viewing this week."' },
      ],
      cta: 'DM us to book a private viewing — limited slots available.',
    },
    voiceover_status: 'generated',
    video_status: 'ready_for_review',
    output: {
      title: 'POV: your new apartment in Paris 15th',
      duration: 22,
      format: '9:16 vertical',
      caption: 'Thinking of living in Paris 15th? This 3-bedroom just hit the market. DM us to book a viewing before it is gone. 🏠 #Paris15 #Immobilier #Appartement',
      thumbnail_url: 'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
  },
];
