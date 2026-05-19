export type PropertySegment =
  | 'family apartments'
  | 'investment properties'
  | 'luxury homes'
  | 'student housing'
  | 'new developments'
  | 'commercial real estate'
  | 'rentals';

export type BusinessGoal =
  | 'get more seller leads'
  | 'get more buyer leads'
  | 'promote listings'
  | 'build local authority'
  | 'grow Instagram/TikTok presence'
  | 'retarget warm leads'
  | 'increase brand awareness';

export type TargetAudience =
  | 'sellers'
  | 'buyers'
  | 'investors'
  | 'renters'
  | 'landlords'
  | 'first-time buyers'
  | 'luxury clients'
  | 'students'
  | 'families';

export type Platform = 'Instagram' | 'TikTok' | 'YouTube Shorts' | 'Facebook' | 'LinkedIn';

export type ContentFrequency = 'high' | 'medium' | 'low';

export type ContentPillar =
  | 'seller education'
  | 'buyer education'
  | 'listing content'
  | 'local authority'
  | 'trust building'
  | 'educational';

export type ProductionStatus =
  | 'strategy_approved'
  | 'assets_needed'
  | 'script_drafted'
  | 'voiceover_generated'
  | 'video_pending'
  | 'editing'
  | 'ready_for_review'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'performance_tracked';

export type ContentChannel = 'organic' | 'paid';

export interface AgentProfile {
  business_name: string;
  location: string;
  property_segments: PropertySegment[];
  primary_goal: BusinessGoal;
  secondary_goal: BusinessGoal;
  target_audiences: TargetAudience[];
  platforms: Platform[];
  content_frequency: ContentFrequency;
  willing_to_film: boolean;
  available_assets: string[];
  brand_tone: string;
}

export interface CreativeRecipe {
  hook: string;
  structure: string[];
  cta: string;
}

export interface ContentItem {
  id: string;
  title: string;
  channel: ContentChannel;
  platforms: Platform[];
  pillar: ContentPillar;
  target_audience: TargetAudience;
  objective: string;
  format: string;
  recipe: CreativeRecipe;
  required_assets: string[];
  scheduled_date: string;
  production_status: ProductionStatus;
  performance_status: 'not_published' | 'published' | 'tracked';
}

export interface OrganicStrategy {
  monthly_post_count: number;
  stories_per_week: number;
  pillars: ContentPillar[];
  content_items: ContentItem[];
}

export interface ABVariation {
  variation: string;
  test_axis: string;
  hook: string;
  cta: string;
}

export interface PaidCampaign {
  id: string;
  campaign: string;
  objective: string;
  audience_segment: string;
  budget_monthly: number;
  kpi_targets: Record<string, string>;
  creative_variations: ABVariation[];
  success_metrics: string[];
}

export interface PaidStrategy {
  campaigns: PaidCampaign[];
}

export interface ContentCalendar {
  month: string;
  year: number;
  items: ContentItem[];
}

export interface AssetRecord {
  id: string;
  type: string;
  label: string;
  source: string;
  status: 'approved' | 'missing' | 'pending';
}

export type AssetType = 'photo' | 'video' | 'logo' | 'document' | 'audio';
export type AssetCategory = 'brand' | 'property' | 'media';

export interface AssetLink {
  kind: 'property' | 'brand' | 'event' | 'client';
  id: string;
  label: string;
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  category: AssetCategory;
  url: string;       // external link, Google Drive, etc.
  thumbnail?: string; // direct image URL for preview
  tags: string[];
  linkedTo?: AssetLink;
  addedAt: string;   // ISO date string
  notes?: string;
}

export interface VideoProductionJob {
  content_item_id: string;
  assets: AssetRecord[];
  script: {
    hook: string;
    scenes: { timestamp: string; description: string }[];
    cta: string;
  };
  voiceover_status: 'not_started' | 'generated';
  video_status: 'not_started' | 'ready_for_review';
  output?: {
    title: string;
    duration: number;
    format: string;
    caption: string;
    thumbnail_url: string;
  };
}

export interface PillarPerformance {
  pillar: ContentPillar;
  reach: number;
  engagement_rate: number;
  saves: number;
}

export interface OrganicPerformanceReport {
  period: string;
  total_reach: number;
  total_impressions: number;
  avg_engagement_rate: number;
  follower_growth: number;
  top_formats: { format: string; avg_views: number }[];
  pillar_performance: PillarPerformance[];
}

export interface CampaignPerformance {
  campaign_id: string;
  campaign_name: string;
  ctr: number;
  cpc: number;
  cpl: number;
  lead_volume: number;
  roas: number;
  winning_variation: string;
  winning_axis: string;
}

export interface PaidPerformanceReport {
  period: string;
  total_spend: number;
  total_leads: number;
  avg_cpl: number;
  avg_roas: number;
  campaigns: CampaignPerformance[];
}

export interface FeedbackItem {
  format: string;
  reason: string;
  recommendation: string;
}

export interface PaidWinner {
  campaign: string;
  winning_axis: string;
  winning_variation: string;
  metric: string;
}

export interface StrategyFeedbackReport {
  period: string;
  organic_winners: FeedbackItem[];
  organic_losers: FeedbackItem[];
  paid_winners: PaidWinner[];
  next_month_recommendations: string[];
}
