import { createContext, useContext, useState, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { AgentProfile, ContentItem, Asset } from '../types';
import type { PoolAsset } from '../components/video/AssetPoolPanel';
import { mockProfile } from '../data/profile';
import { mockOrganicStrategy } from '../data/organicStrategy';
import { mockAssets } from '../data/assets';

// ─── View / layout ─────────────────────────────────────────────────────────────

export type ActiveView =
  | 'calendar'
  | 'strategy/organic'
  | 'strategy/paid'
  | 'analytics'
  | 'assets'
  | { type: 'video'; contentItemId: string };

export type AppMode = 'home' | 'split';

// ─── Agent thinking steps ──────────────────────────────────────────────────────

export type ThinkingStepType = 'database' | 'search' | 'browse' | 'calendar_write' | 'analyze' | 'generate';
export type ThinkingStepStatus = 'pending' | 'running' | 'done';

export interface AgentThinkingStep {
  id: string;
  type: ThinkingStepType;
  label: string;
  detail?: string; // extra detail shown while running
  status: ThinkingStepStatus;
}

// ─── Chat ──────────────────────────────────────────────────────────────────────

export interface ConceptProposal {
  format_name: string;
  format_id: string;
  pillar: string;
  hook_angle: string;
  rationale: string;
  suggested_date: string;
  _resumeConversation?: unknown[]; // full server-side msgs state for clean resume
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  thinkingSteps?: AgentThinkingStep[];
  conceptProposal?: ConceptProposal;
  proposalStatus?: 'pending' | 'approved' | 'rejected' | 'autopilot';
  isAgentWorking?: boolean; // true while SSE is open but between tool rounds
  // Qualifying form embedded in chat (shown before a plan-content request is sent)
  qualifyingForm?: { answered: boolean };
  // Property mention — set on user messages when @ is used
  propertyMention?: { id: string; label: string };
  // Property assets strip — set on assistant messages after sendListingVideo
  propertyAssets?: Asset[];
  // Rendered video URL — set after all generation steps complete
  renderedVideo?: string;
}

// ─── Qualifying form params ────────────────────────────────────────────────────

export interface QualifyingParams {
  period: string;          // e.g. "June 2026", "this week"
  postsPerWeek: number;    // 1 | 2 | 3 | 5
  willingToFilm: boolean;
  originalRequest: string; // the raw user message that triggered the form
}

// ─── Context ───────────────────────────────────────────────────────────────────

interface AppContextValue {
  loggedIn: boolean;
  setLoggedIn: (v: boolean) => void;
  profile: AgentProfile | null;
  setProfile: (p: AgentProfile) => void;
  onboardingComplete: boolean;
  setOnboardingComplete: (v: boolean) => void;
  activeView: ActiveView;
  setActiveView: (v: ActiveView) => void;
  appMode: AppMode;
  setAppMode: (m: AppMode) => void;
  chatHistory: ChatMessage[];
  sendMessage: (text: string, mention?: { id: string; label: string }) => void;
  sendListingVideo: (propertyId: string, propertyLabel: string, userText: string) => void;
  approveConcept: (msgId: string, approved: boolean, feedback?: string) => void;
  triggerOnboardingFlow: () => void;
  calendarItems: ContentItem[];
  patchCalendarItems: (updater: (prev: ContentItem[]) => ContentItem[]) => void;
  newItemIds: Set<string>;
  scripts: Record<string, string>;
  setScript: (itemId: string, script: string) => void;
  assets: Asset[];
  addAsset: (asset: Asset) => void;
  // Asset pool — populated by the asset agent during video production
  poolAssets: PoolAsset[];
  clearPoolAssets: () => void;
  triggerAssetAgent: (
    requiredAssets: string[],
    jobContext: { title: string; format: string; pillar: string },
    jobId: string,
    onAssetResolved?: (asset: PoolAsset) => void,
  ) => void;
  // Autopilot — auto-approves concepts one by one until the plan is complete
  autopilotActive: boolean;
  autopilotConceptsLeft: number;
  startAutopilot: (conceptsTotal: number) => void;
  stopAutopilot: () => void;
  // Qualifying form submission (fires sendMessage with enriched prompt)
  submitQualifyingForm: (msgId: string, params: QualifyingParams) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// ─── Utils ─────────────────────────────────────────────────────────────────────

export function getViewLabel(view: ActiveView): string {
  if (typeof view === 'object') return 'video production';
  return ({ calendar: 'content calendar', 'strategy/organic': 'organic strategy', 'strategy/paid': 'paid strategy', analytics: 'analytics dashboard', assets: 'asset library' } as Record<string, string>)[view] ?? view;
}

let _uid = 0;
const uid = () => `id_${++_uid}_${Date.now()}`;

// ─── Intent detection ──────────────────────────────────────────────────────────

export type Intent = 'plan_content' | 'listing_video' | 'analyze' | 'onboarding' | 'general';

// Returns true when the user is asking to plan a batch of content (week/month)
// In that case we show the qualifying form before sending to the agent
export function detectPlanIntent(text: string): boolean {
  const t = text.toLowerCase();
  return !!(t.match(/plan|schedul|content.*(?:week|month|june|july|mai|juin|juillet|august|ao[uû]t)/i) ||
            t.match(/(?:week|month|june|july|juin|juillet).*content/i) ||
            t.match(/full.*(?:calendar|plan|month|week)/i) ||
            t.match(/what.*post.*(week|month)/i));
}

export function detectIntent(text: string): Intent {
  const t = text.toLowerCase();
  if (t.match(/plan|content|month|june|may|calendar|schedul|strateg|post/)) return 'plan_content';
  if (t.match(/listing|video|produc|shoot|film|record|creat.*video/))       return 'listing_video';
  if (t.match(/analyt|perform|stats|result|metric|report/))                  return 'analyze';
  return 'general';
}

// ─── Flow definitions ──────────────────────────────────────────────────────────
// Each step has a durationMs for the mock. Wire real async calls here later —
// call setStepStatus(id, 'running') before the call, 'done' after it resolves.

interface FlowStep {
  type: ThinkingStepType;
  label: string;
  detail: string;
  durationMs: number;
}

const FLOWS: Record<Intent, FlowStep[]> = {
  onboarding: [
    { type: 'database',  label: 'Loading your business profile',         detail: 'Dumont Immobilier · Paris 15th',           durationMs: 900  },
    { type: 'search',    label: 'Researching Paris 15th real estate',    detail: 'Market trends, avg price/m², activity',    durationMs: 1300 },
    { type: 'browse',    label: 'Scanning top-performing content formats',detail: 'Reels, TikTok, YouTube Shorts — RE niche', durationMs: 1100 },
    { type: 'browse',    label: 'Analysing Paris 15th competitor accounts',detail: '12 accounts checked · 3 format patterns', durationMs: 1000 },
    { type: 'analyze',   label: 'Matching formats to your goals',         detail: 'Seller leads · Local authority · Trust',   durationMs: 950  },
    { type: 'generate',  label: 'Drafting May content strategy',          detail: '12 pieces · 6 pillars · 3×/week',         durationMs: 1100 },
    { type: 'calendar_write', label: 'Writing content plan to calendar',  detail: 'May 2026 · All slots assigned',           durationMs: 1200 },
  ],
  plan_content: [
    { type: 'database',  label: 'Consulting content format library',      detail: '240 formats · RE-specific templates',     durationMs: 800  },
    { type: 'browse',    label: 'Browsing Instagram Reels trends',        detail: 'Paris real estate · this week',           durationMs: 1200 },
    { type: 'search',    label: 'Searching local events — Paris 15th',    detail: 'June markets, exhibitions, openings',     durationMs: 900  },
    { type: 'analyze',   label: 'Matching formats to business goals',     detail: 'Seller leads · Authority · Trust',        durationMs: 850  },
    { type: 'generate',  label: 'Writing content briefs',                 detail: '8 pieces · hooks, scripts, CTAs',        durationMs: 1000 },
    { type: 'calendar_write', label: 'Filling June calendar',             detail: 'Mon, Wed, Fri · 6 pillars covered',      durationMs: 1100 },
  ],
  listing_video: [
    { type: 'database',  label: 'Loading listing video templates',        detail: 'Tour, lifestyle, feature-led formats',    durationMs: 750  },
    { type: 'browse',    label: 'Checking top listing reels — Paris',     detail: 'Analysing hooks, pacing, CTAs',           durationMs: 1100 },
    { type: 'analyze',   label: 'Selecting optimal format for this listing', detail: 'Lifestyle-first · rare feature hook', durationMs: 900  },
    { type: 'generate',  label: 'Writing script and scene breakdown',     detail: '22s · 6 scenes · 9:16 vertical',         durationMs: 1000 },
    { type: 'calendar_write', label: 'Adding video concept to calendar',  detail: 'Scheduled · assets checklist attached',  durationMs: 700  },
  ],
  analyze: [
    { type: 'database',  label: 'Pulling May performance data',           detail: 'Organic reach, engagement, saves',       durationMs: 850  },
    { type: 'analyze',   label: 'Computing pillar performance breakdown', detail: '6 pillars · engagement + save rate',     durationMs: 1100 },
    { type: 'search',    label: 'Benchmarking against Paris RE accounts', detail: '8 comparable accounts analysed',         durationMs: 950  },
    { type: 'generate',  label: 'Generating strategy recommendations',    detail: 'Winners, losers, next-month actions',    durationMs: 900  },
  ],
  general: [
    { type: 'analyze',   label: 'Processing your request',               detail: 'Context · profile · calendar data',       durationMs: 700  },
    { type: 'generate',  label: 'Formulating response',                  detail: '',                                        durationMs: 600  },
  ],
};

// ─── Replies ───────────────────────────────────────────────────────────────────

const REPLIES: Record<Intent, string[]> = {
  onboarding: [
    "Your May content plan is ready. I've scheduled 12 pieces across seller education, local authority, listing content, trust-building, buyer education, and educational pillars — all mapped to your primary goal of getting more seller leads. Check the calendar.",
  ],
  plan_content: [
    "June plan is done — 8 new pieces added to the calendar. I weighted it 40% seller education (your top converter from May), 25% local authority, 20% listing content, 15% trust-building. Spread Mon/Wed/Fri. Open the calendar to review and edit.",
    "Done. June is now planned: seller education leads, supported by local authority and two listing tours. I left 3 open slots for reactive content — market news, last-minute listings. Everything is in the calendar.",
  ],
  listing_video: [
    "Listing video concept is in the calendar. Script: 0–2s hook with the 'rare feature' angle (your best-performing paid creative), 2–14s lifestyle walk-through, 14–18s location context, 18–22s CTA. Click the card to open the Video Agent and generate the voice-over.",
    "Done — listing video added. I used the lifestyle-first format based on your top organic performer in May. The hook leads with the courtyard view angle, which outperforms generic tours by 2.3× in your market segment.",
  ],
  analyze: [
    "May recap: 48K reach, 4.7% avg engagement. Seller education was your strongest pillar — 6.2% engagement, 340 saves. Local authority underperformed vs its potential; 2 more neighborhood pieces in June would compound reach. Retargeting is your best paid channel at €12 CPL — worth expanding.",
    "Your top format in May was talking-head educational shorts at 8,400 avg views. The generic static posts dragged your overall rate to 2.8% — I'd cut those and reallocate to video. Paid-wise, the 'rare feature' hook on your listing promo hit 4.3% CTR — use that angle more broadly.",
  ],
  general: [
    "Based on your May performance and current calendar, I'd focus on seller education first — it's your primary goal and strongest pillar. Then local authority to reinforce the Paris 15th positioning. Want me to put together a specific June plan?",
    "Got it. To do that well I'd want to look at your current calendar and May analytics together. Want me to run a full analysis and suggest what to change?",
  ],
};

function pickReply(intent: Intent): string {
  const pool = REPLIES[intent];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── June items injected by plan_content ───────────────────────────────────────

const JUNE_ITEMS: ContentItem[] = [
  { id: 'june_001', title: 'Plan your summer sale — why June is the right moment', channel: 'organic', platforms: ['Instagram', 'TikTok'], pillar: 'seller education', target_audience: 'sellers', objective: 'generate seller consultation requests', format: 'talking-head short video', recipe: { hook: 'If you are thinking of selling this year, June is the window you have been waiting for.', structure: ['hook', 'market context', 'why June', 'urgency', 'CTA'], cta: 'Book a free June consultation' }, required_assets: ['agent talking-head', 'market data overlay'], scheduled_date: '2026-06-02', production_status: 'strategy_approved', performance_status: 'not_published' },
  { id: 'june_002', title: 'Best family parks in Paris 15th — summer guide', channel: 'organic', platforms: ['Instagram', 'YouTube Shorts'], pillar: 'local authority', target_audience: 'families', objective: 'build local authority', format: 'neighborhood lifestyle reel', recipe: { hook: 'Summer in Paris 15th hits different when you know these spots.', structure: ['hook', 'Parc André Citroën', 'Parc Georges Brassens', 'Square Blomet', 'CTA'], cta: 'Save this for your weekend' }, required_assets: ['on-location footage', 'B-roll summer clips'], scheduled_date: '2026-06-05', production_status: 'strategy_approved', performance_status: 'not_published' },
  { id: 'june_003', title: 'New listing: rooftop terrace apartment — 75015', channel: 'organic', platforms: ['Instagram', 'TikTok', 'YouTube Shorts'], pillar: 'listing content', target_audience: 'buyers', objective: 'generate viewing requests', format: 'lifestyle listing tour', recipe: { hook: 'A rooftop terrace in Paris 15th — this rarely comes up.', structure: ['hook', 'terrace reveal', 'living space', 'bedroom', 'price reveal', 'CTA'], cta: 'DM to book a private viewing' }, required_assets: ['property photos', 'rooftop footage', 'listing details'], scheduled_date: '2026-06-09', production_status: 'assets_needed', performance_status: 'not_published' },
  { id: 'june_004', title: '3 things buyers always regret not asking before signing', channel: 'organic', platforms: ['Instagram', 'TikTok'], pillar: 'buyer education', target_audience: 'buyers', objective: 'attract buyer leads', format: 'talking-head educational short', recipe: { hook: 'Most buyers find out too late. Here are the 3 questions you must ask before signing anything.', structure: ['hook', 'question 1', 'question 2', 'question 3', 'CTA'], cta: 'Save this before your next property visit' }, required_assets: ['agent talking-head', 'text overlays'], scheduled_date: '2026-06-12', production_status: 'strategy_approved', performance_status: 'not_published' },
  { id: 'june_005', title: 'Client story — found their forever home in 3 weeks', channel: 'organic', platforms: ['Instagram', 'LinkedIn'], pillar: 'trust building', target_audience: 'buyers', objective: 'build credibility', format: 'testimonial short', recipe: { hook: 'They had been searching for 8 months. We found their apartment in 3 weeks.', structure: ['hook', 'client backstory', 'our process', 'result', 'client quote', 'CTA'], cta: "Want the same? Let's talk." }, required_assets: ['client photo', 'property exterior', 'result data'], scheduled_date: '2026-06-16', production_status: 'strategy_approved', performance_status: 'not_published' },
  { id: 'june_006', title: 'Paris real estate market update — June 2026', channel: 'organic', platforms: ['Instagram', 'LinkedIn', 'YouTube Shorts'], pillar: 'educational', target_audience: 'sellers', objective: 'build authority', format: 'market update talking-head', recipe: { hook: 'Here is what is actually happening in the Paris property market this June.', structure: ['hook', 'price trends', 'volume data', 'sellers takeaway', 'buyers takeaway', 'CTA'], cta: 'Follow for monthly market updates' }, required_assets: ['agent talking-head', 'market data graphics'], scheduled_date: '2026-06-19', production_status: 'strategy_approved', performance_status: 'not_published' },
  { id: 'june_007', title: 'Why I only work in Paris 15th — and why that matters for you', channel: 'organic', platforms: ['Instagram', 'TikTok'], pillar: 'trust building', target_audience: 'sellers', objective: 'differentiation and seller leads', format: 'personal story talking-head', recipe: { hook: 'I could work anywhere in Paris. I chose the 15th — and here is why that gives you an edge.', structure: ['hook', 'personal story', 'depth of local knowledge', 'results proof', 'CTA'], cta: 'Work with someone who truly knows your neighborhood' }, required_assets: ['agent talking-head', 'neighborhood B-roll'], scheduled_date: '2026-06-23', production_status: 'strategy_approved', performance_status: 'not_published' },
  { id: 'june_008', title: 'The seller mistake that cost €18,000 — a real story', channel: 'organic', platforms: ['Instagram', 'TikTok', 'YouTube Shorts'], pillar: 'seller education', target_audience: 'sellers', objective: 'generate seller leads via fear of loss', format: 'story-driven talking-head', recipe: { hook: 'A seller turned down an offer last year. It cost them €18,000. Here is what happened.', structure: ['hook', 'the situation', 'the decision', 'the outcome', 'the lesson', 'CTA'], cta: 'Do not make the same call without professional advice' }, required_assets: ['agent talking-head', 'anonymized case data'], scheduled_date: '2026-06-26', production_status: 'script_drafted', performance_status: 'not_published' },
];

const LISTING_VIDEO_ITEM: ContentItem = {
  id: 'video_new_001', title: 'Listing tour: rooftop terrace — courtyard view · 75015', channel: 'organic', platforms: ['Instagram', 'TikTok', 'YouTube Shorts'], pillar: 'listing content', target_audience: 'buyers', objective: 'generate viewing requests', format: 'lifestyle listing tour', recipe: { hook: 'This apartment has a rare courtyard view almost impossible to find in the 15th.', structure: ['hook', 'courtyard reveal', 'living space', 'kitchen', 'master bedroom', 'CTA'], cta: 'DM to book a private viewing this week' }, required_assets: ['property photos', 'walk-through video', 'listing details', 'drone courtyard shot'], scheduled_date: '2026-06-03', production_status: 'script_drafted', performance_status: 'not_published',
};

// ─── Core agent runner ─────────────────────────────────────────────────────────

function runFlow(
  intent: Intent,
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setCalendarItems: React.Dispatch<React.SetStateAction<ContentItem[]>>,
  setActiveView: (v: ActiveView) => void,
  setAppMode: (m: AppMode) => void,
  setNewItemIds: React.Dispatch<React.SetStateAction<Set<string>>>,
) {
  const flow = FLOWS[intent];
  const steps: AgentThinkingStep[] = flow.map((f) => ({
    id: uid(), type: f.type, label: f.label, detail: f.detail, status: 'pending' as const,
  }));

  // For onboarding, start with empty calendar so items appear one by one
  if (intent === 'onboarding') setCalendarItems([]);

  const msgId = uid();
  const placeholder: ChatMessage = { id: msgId, role: 'assistant', content: '', timestamp: new Date(), thinkingSteps: steps };
  setChatHistory((p) => [...p, placeholder]);

  const updateSteps = (updater: (s: AgentThinkingStep[]) => AgentThinkingStep[]) => {
    setChatHistory((prev) => prev.map((m) =>
      m.id === msgId ? { ...m, thinkingSteps: updater(m.thinkingSteps ?? []) } : m
    ));
  };

  let elapsed = 0;
  flow.forEach((flowStep, i) => {
    // → running
    setTimeout(() => {
      updateSteps((s) => s.map((x, j) => j === i ? { ...x, status: 'running' } : x));
    }, elapsed);

    elapsed += flowStep.durationMs;

    // → done
    setTimeout(() => {
      updateSteps((s) => s.map((x, j) => j <= i ? { ...x, status: 'done' } : x));

      if (flowStep.type === 'calendar_write') {
        // open calendar panel with animation
        setActiveView('calendar');
        setAppMode('split');
        // add items one by one with stagger
        const toAdd = intent === 'plan_content' ? JUNE_ITEMS
                    : intent === 'listing_video' ? [LISTING_VIDEO_ITEM]
                    : intent === 'onboarding' ? mockOrganicStrategy.content_items
                    : [];
        toAdd.forEach((item, k) => {
          setTimeout(() => {
            setCalendarItems((prev) => {
              if (prev.some((x) => x.id === item.id)) return prev;
              return [...prev, item];
            });
            setNewItemIds((prev) => new Set([...prev, item.id]));
            // clear the "new" flag after animation completes
            setTimeout(() => {
              setNewItemIds((prev) => { const next = new Set(prev); next.delete(item.id); return next; });
            }, 1200);
          }, k * 180);
        });
      }

      if (i === flow.length - 1) {
        setTimeout(() => {
          setChatHistory((prev) => prev.map((m) =>
            m.id === msgId ? { ...m, content: pickReply(intent) } : m
          ));
          if (intent === 'analyze') {
            setTimeout(() => { setActiveView('analytics'); setAppMode('split'); }, 300);
          }
        }, 500);
      }
    }, elapsed);
  });
}

// ─── Provider ──────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('calendar');
  const [appMode, setAppMode] = useState<AppMode>('home');
  const [calendarItems, setCalendarItems] = useState<ContentItem[]>(mockOrganicStrategy.content_items);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());
  const [scripts, setScripts] = useState<Record<string, string>>({});
  const setScript = useCallback((itemId: string, script: string) => {
    setScripts((prev) => ({ ...prev, [itemId]: script }));
  }, []);

  const [assets, setAssets] = useState<Asset[]>(mockAssets);
  // Keep a synchronous ref so sendListingVideo can read current assets without stale closure
  const mockAssetsRef = useRef<Asset[]>(mockAssets);
  const addAsset = useCallback((asset: Asset) => {
    setAssets((prev) => {
      const next = [asset, ...prev];
      mockAssetsRef.current = next;
      return next;
    });
  }, []);

  // Asset pool state
  let _poolUid = 0;
  const poolUid = () => `pool_${++_poolUid}_${Date.now()}`;
  const [poolAssets, setPoolAssets] = useState<PoolAsset[]>([]);
  const clearPoolAssets = useCallback(() => setPoolAssets([]), []);

  const triggerAssetAgent = useCallback(async (
    requiredAssets: string[],
    jobContext: { title: string; format: string; pillar: string },
    jobId: string,
    onAssetResolved?: (asset: PoolAsset) => void,
  ) => {
    // Inject an agent message into chat
    const msgId = uid();
    const agentMsg: ChatMessage = {
      id: msgId, role: 'assistant', content: '', timestamp: new Date(), thinkingSteps: [],
    };
    setChatHistory(prev => { chatHistoryRef.current = [...prev, agentMsg]; return chatHistoryRef.current; });

    const updateMsg = (updater: (m: ChatMessage) => ChatMessage) =>
      setChatHistory(prev => prev.map(m => m.id === msgId ? updater(m) : m));

    const addStep = (step: import('../context/AppContext').AgentThinkingStep) =>
      updateMsg(m => ({ ...m, thinkingSteps: [...(m.thinkingSteps ?? []), step] }));

    const markStepDone = (stepId: string, detail?: string) =>
      updateMsg(m => ({
        ...m,
        thinkingSteps: (m.thinkingSteps ?? []).map(s =>
          s.id === stepId ? { ...s, status: 'done' as const, ...(detail ? { detail } : {}) } : s
        ),
      }));

    // Add initial step
    const initStepId = uid();
    addStep({ id: initStepId, type: 'database', label: 'Scanning asset library', detail: `${requiredAssets.length} slots to fill`, status: 'running' });

    try {
      const resp = await fetch('/api/asset-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Please resolve all required asset slots for this video.' }],
          requiredAssets,
          jobContext,
          libraryAssets: assets.map(a => ({
            id: a.id, name: a.name, type: a.type, category: a.category,
            tags: a.tags, thumbnail: a.thumbnail, notes: a.notes,
          })),
        }),
      });

      if (!resp.ok || !resp.body) throw new Error(`Server error ${resp.status}`);

      markStepDone(initStepId, `${assets.length} library assets indexed`);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      const slotStepIds: Record<string, string> = {}; // slot → stepId

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() ?? '';

        for (const part of parts) {
          let event = ''; let data = '';
          for (const line of part.split('\n')) {
            if (line.startsWith('event: ')) event = line.slice(7);
            else if (line.startsWith('data: ')) data = line.slice(6);
          }
          if (!event || !data) continue;
          let payload: Record<string, unknown>;
          try { payload = JSON.parse(data); } catch { continue; }

          if (event === 'asset_searching_pexels') {
            const slot = payload.slot as string;
            const stepId = uid();
            slotStepIds[slot] = stepId;
            addStep({ id: stepId, type: 'search', label: `Searching Pexels: ${payload.query}`, detail: `for "${slot}"`, status: 'running' });
          } else if (event === 'asset_found') {
            const slot = payload.slot as string;
            const existingStepId = slotStepIds[slot];
            if (existingStepId) {
              markStepDone(existingStepId, `Found: ${payload.label}`);
            } else {
              const stepId = uid();
              slotStepIds[slot] = stepId;
              addStep({ id: stepId, type: 'search', label: `Found: ${payload.label}`, detail: `for "${slot}"`, status: 'running' });
              setTimeout(() => markStepDone(stepId), 300);
            }
            const poolId = poolUid();
            const src = (payload.source as string) === 'pexels' ? 'pexels' : 'library';
            const resolvedAsset: PoolAsset = {
              id: poolId, label: payload.label as string,
              kind: payload.kind as PoolAsset['kind'],
              status: 'found', source: src as PoolAsset['source'],
              thumbnail: payload.thumbnail as string | undefined,
              detail: payload.detail as string | undefined,
            };
            setPoolAssets(prev => [...prev, resolvedAsset]);
            onAssetResolved?.(resolvedAsset);
          } else if (event === 'asset_generating') {
            const slot = payload.slot as string;
            const stepId = uid();
            slotStepIds[slot] = stepId;
            addStep({ id: stepId, type: 'generate', label: `Generating: ${payload.label}`, detail: `for "${slot}"`, status: 'running' });
            const poolId = poolUid();
            setPoolAssets(prev => [...prev, {
              id: poolId, label: payload.label as string,
              kind: payload.kind as PoolAsset['kind'],
              status: 'generating', source: 'generated',
              detail: payload.description as string | undefined,
            }]);
          } else if (event === 'asset_generated') {
            const slot = payload.slot as string;
            const stepId = slotStepIds[slot];
            if (stepId) markStepDone(stepId, 'generated');
            setPoolAssets(prev => {
              const idx = prev.findLastIndex(a => a.label === payload.label);
              if (idx === -1) return prev;
              const next = [...prev];
              next[idx] = { ...next[idx], status: 'created' };
              const created = next[idx];
              onAssetResolved?.(created);
              return next;
            });
          } else if (event === 'asset_missing') {
            const slot = payload.slot as string;
            const stepId = uid();
            addStep({ id: stepId, type: 'analyze', label: `Needs upload: ${slot}`, detail: payload.reason as string, status: 'running' });
            setPoolAssets(prev => [...prev, {
              id: poolUid(), label: slot, kind: 'photo',
              status: 'error', source: 'library',
              errorMsg: payload.reason as string,
            }]);
            setTimeout(() => markStepDone(stepId), 300);
          } else if (event === 'text') {
            updateMsg(m => ({ ...m, content: payload.content as string }));
          } else if (event === 'error') {
            updateMsg(m => ({ ...m, content: `Asset agent error: ${payload.message}` }));
          }
        }
      }
    } catch (err) {
      updateMsg(m => ({ ...m, content: `Asset agent failed: ${err instanceof Error ? err.message : String(err)}` }));
    } finally {
      updateMsg(m => ({ ...m, isAgentWorking: false }));
    }
  }, [assets]);

  // Autopilot state
  const [autopilotActive, setAutopilotActive] = useState(false);
  const [autopilotConceptsLeft, setAutopilotConceptsLeft] = useState(0);
  const autopilotRef = useRef(false); // synchronous ref so SSE handlers see latest value

  const startAutopilot = useCallback((conceptsTotal: number) => {
    autopilotRef.current = true;
    setAutopilotActive(true);
    setAutopilotConceptsLeft(conceptsTotal);
  }, []);

  const stopAutopilot = useCallback(() => {
    autopilotRef.current = false;
    setAutopilotActive(false);
    setAutopilotConceptsLeft(0);
  }, []);

  const patchCalendarItems = useCallback(
    (updater: (prev: ContentItem[]) => ContentItem[]) => setCalendarItems(updater),
    []
  );

  // Chat history ref for building the messages array sent to the server
  const chatHistoryRef = useRef<ChatMessage[]>([]);
  const calendarItemsRef = useRef<ContentItem[]>(mockOrganicStrategy.content_items);
  // Stores the resume conversation state keyed by message id — written synchronously when proposal arrives
  const pendingResumeRef = useRef<Record<string, unknown[]>>({});
  // Forward ref so triggerNextAutopilotConcept can call approveConcept without circular dependency
  const approveConceptRef = useRef<(msgId: string, approved: boolean, feedback?: string) => void>(() => {});

  const sendListingVideo = useCallback((propertyId: string, propertyLabel: string, userText: string) => {
    if (appMode === 'home') setAppMode('split');

    // a. Add user message with propertyMention
    const userMsg: ChatMessage = {
      id: uid(), role: 'user', content: userText, timestamp: new Date(),
      propertyMention: { id: propertyId, label: propertyLabel },
    };
    setChatHistory((p) => { chatHistoryRef.current = [...p, userMsg]; return chatHistoryRef.current; });

    // b. Look up property assets from current assets state (captured at call time via closure)
    // We use setAssets read trick: store in ref then read
    // Instead, we capture assets from the outer closure — assets is in scope via useState
    const propAssets = mockAssetsRef.current.filter((a) => a.linkedTo?.id === propertyId);

    // c. Add assistant message placeholder with propertyAssets
    const msgId = uid();
    const N = propAssets.length;
    const assistantMsg: ChatMessage = {
      id: msgId, role: 'assistant', content: '', timestamp: new Date(),
      thinkingSteps: [],
      propertyAssets: propAssets,
      isAgentWorking: true,
    };
    setChatHistory((p) => { chatHistoryRef.current = [...p, assistantMsg]; return chatHistoryRef.current; });

    const updateMsg = (updater: (m: ChatMessage) => ChatMessage) => {
      setChatHistory((prev) => prev.map((m) => m.id === msgId ? updater(m) : m));
    };

    // d. Run thinking steps sequentially
    const flowSteps: FlowStep[] = [
      { type: 'database', label: 'Pulling property assets',    detail: `${N} photos · Seregno listing`,              durationMs: 4000  },
      { type: 'analyze',  label: 'Generating scene prompts',   detail: 'hook · 6 scenes · lifestyle format',         durationMs: 12000 },
      { type: 'generate', label: 'Planning camera movements',  detail: 'pan, zoom, dolly · 9:16 vertical',           durationMs: 10000 },
      { type: 'browse',   label: 'Calling Seedance API',       detail: 'seedance-1-lite · rendering 22s',            durationMs: 55000 },
      { type: 'generate', label: 'Compositing final video',    detail: 'voiceover + music + captions',               durationMs: 25000 },
    ];

    const steps: AgentThinkingStep[] = flowSteps.map((f) => ({
      id: uid(), type: f.type, label: f.label, detail: f.detail, status: 'pending' as const,
    }));

    // Inject steps into the message
    updateMsg((m) => ({ ...m, thinkingSteps: steps }));

    let elapsed = 0;
    flowSteps.forEach((flowStep, i) => {
      // → running
      setTimeout(() => {
        setChatHistory((prev) => prev.map((m) =>
          m.id === msgId ? {
            ...m,
            thinkingSteps: (m.thinkingSteps ?? []).map((x, j) => j === i ? { ...x, status: 'running' as const } : x),
          } : m
        ));
      }, elapsed);

      elapsed += flowStep.durationMs;

      // → done
      setTimeout(() => {
        const isLast = i === flowSteps.length - 1;
        setChatHistory((prev) => prev.map((m) => {
          if (m.id !== msgId) return m;
          const updated = {
            ...m,
            thinkingSteps: (m.thinkingSteps ?? []).map((x, j) => j <= i ? { ...x, status: 'done' as const } : x),
          };
          if (isLast) {
            return {
              ...updated,
              content: 'Listing video generated and saved to your asset library.',
              isAgentWorking: false,
            };
          }
          return updated;
        }));
      }, elapsed);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appMode, addAsset]);

  const sendMessage = useCallback(async (text: string, mention?: { id: string; label: string } | boolean) => {
    // Support legacy internal calls that pass `true` as second arg (bypassPlanIntercept)
    const bypassPlanIntercept = mention === true;
    const mentionObj = (mention && mention !== true) ? mention as { id: string; label: string } : undefined;

    if (appMode === 'home') setAppMode('split');

    // If a property mention is attached and the text contains a listing/video keyword → sendListingVideo
    if (mentionObj && /video|listing|tour|film|créer|generat|produc/i.test(text)) {
      sendListingVideo(mentionObj.id, mentionObj.label, text);
      return;
    }

    // Intercept plan-content requests — show qualifying form inline before sending to agent
    if (!bypassPlanIntercept && detectPlanIntent(text)) {
      const userMsg: ChatMessage = { id: uid(), role: 'user', content: text, timestamp: new Date(), propertyMention: mentionObj };
      const formMsg: ChatMessage = {
        id: uid(), role: 'assistant', content: '', timestamp: new Date(),
        qualifyingForm: { answered: false },
      };
      setChatHistory((p) => {
        const next = [...p, userMsg, formMsg];
        chatHistoryRef.current = next;
        return next;
      });
      return;
    }

    const userMsg: ChatMessage = { id: uid(), role: 'user', content: text, timestamp: new Date(), propertyMention: mentionObj };
    setChatHistory((p) => { chatHistoryRef.current = [...p, userMsg]; return chatHistoryRef.current; });

    // Create assistant placeholder with no steps yet
    const msgId = uid();
    const placeholder: ChatMessage = { id: msgId, role: 'assistant', content: '', timestamp: new Date(), thinkingSteps: [] };
    setChatHistory((p) => { chatHistoryRef.current = [...p, placeholder]; return chatHistoryRef.current; });

    const updateMsg = (updater: (m: ChatMessage) => ChatMessage) => {
      setChatHistory((prev) => prev.map((m) => m.id === msgId ? updater(m) : m));
    };

    const addStep = (step: AgentThinkingStep) => {
      updateMsg((m) => ({ ...m, thinkingSteps: [...(m.thinkingSteps ?? []), step] }));
    };

    const markStepDone = (stepId: string) => {
      updateMsg((m) => ({
        ...m,
        thinkingSteps: (m.thinkingSteps ?? []).map((s) => s.id === stepId ? { ...s, status: 'done' as const } : s),
      }));
    };

    // Tool name → step type + label builder
    // detail is derived from the actual tool input for live transparency
    const toolMeta: Record<string, {
      type: ThinkingStepType;
      label: string;
      detail?: (input: Record<string, unknown>) => string;
    }> = {
      get_format_library: { type: 'database', label: 'Browsing format library',
        detail: (i) => i.pillar ? `filtering by pillar: ${i.pillar}` : 'scanning all 14 proven RE formats' },
      get_user_profile:   { type: 'database', label: 'Loading agent profile',
        detail: () => 'Dumont Immobilier · Paris 15th · goals & tone' },
      get_calendar_items: { type: 'database', label: 'Reading current calendar',
        detail: () => 'checking scheduled content & pillar gaps' },
      search_web:         { type: 'browse',   label: 'Searching the web',
        detail: (i) => i.query ? `searching: "${i.query}"` : '' },
      propose_concept:    { type: 'generate', label: 'Drafting concept',
        detail: (i) => i.format_name ? `selected: ${i.format_name}` : '' },
      get_analytics:      { type: 'analyze',  label: 'Loading analytics data',
        detail: () => 'reach, engagement, top pillars · May 2026' },
      add_calendar_items: { type: 'calendar_write', label: 'Writing to calendar',
        detail: (i) => {
          const items = Array.isArray(i.items) ? i.items as Record<string, unknown>[] : [];
          if (items.length === 1) return `adding: "${items[0].title ?? 'item'}"`;
          return `adding ${items.length} items`;
        },
      },
      switch_view:        { type: 'browse',   label: 'Switching view',
        detail: (i) => i.view ? `opening ${i.view}` : '' },
      generate_script:    { type: 'generate', label: 'Writing voice-over script',
        detail: (i) => i.title ? `script for: "${i.title}"` : '' },
    };

    // Build messages for API — include all completed turns that have text content
    // (skip the current in-flight placeholder; skip empty assistant turns with no text)
    const apiMessages = chatHistoryRef.current
      .filter((m) => m.id !== msgId && (m.role === 'user' ? true : m.content.length > 0))
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    apiMessages.push({ role: 'user', content: text });

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, calendarItems: calendarItemsRef.current }),
      });

      if (!resp.ok || !resp.body) throw new Error(`Server error ${resp.status}`);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      const stepIds: Record<string, string> = {}; // tool_use_id → step uid
      let activeStepCount = 0; // how many tool_start events have no matching tool_done yet

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';

        let eventName = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) { eventName = line.slice(7).trim(); continue; }
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6));

          if (eventName === 'text_delta') {
            updateMsg((m) => ({ ...m, content: m.content + data.delta, isAgentWorking: false }));
          }

          if (eventName === 'tool_start') {
            const meta = toolMeta[data.name] ?? { type: 'analyze' as ThinkingStepType, label: data.name };
            const stepId = uid();
            stepIds[data.id] = stepId;
            const detail = meta.detail ? meta.detail(data.input ?? {}) : '';
            activeStepCount++;
            updateMsg((m) => ({ ...m, isAgentWorking: false,
              thinkingSteps: [...(m.thinkingSteps ?? []), { id: stepId, type: meta.type, label: meta.label, detail, status: 'running' as const }],
            }));
          }

          if (eventName === 'concept_proposal') {
            // Store resume state synchronously in a ref so approveConcept can read it immediately
            if (data._resumeConversation) {
              pendingResumeRef.current[msgId] = data._resumeConversation as unknown[];
            }
            const { _resumeConversation: _rc, ...proposalData } = data as ConceptProposal & { _resumeConversation?: unknown[] };
            void _rc;

            if (autopilotRef.current) {
              // Autopilot: show the concept briefly as "autopilot" status then auto-approve
              updateMsg((m) => ({
                ...m,
                conceptProposal: proposalData as ConceptProposal,
                proposalStatus: 'autopilot',
              }));
              // Auto-approve after short visual pause so user can see the concept
              setTimeout(() => {
                approveConcept(msgId, true);
              }, 1800);
            } else {
              updateMsg((m) => ({
                ...m,
                conceptProposal: proposalData as ConceptProposal,
                proposalStatus: 'pending',
              }));
            }
          }

          if (eventName === 'tool_done') {
            const stepId = stepIds[data.id];
            activeStepCount = Math.max(0, activeStepCount - 1);
            const allDoneNow = activeStepCount === 0;
            if (stepId) {
              let doneDetail = '';
              if (data.name === 'get_format_library' && data.result?.formats) {
                doneDetail = `${data.result.formats.length} formats loaded`;
              } else if (data.name === 'search_web' && data.result?.results?.length) {
                doneDetail = `${data.result.results.length} results · ${data.result.source}`;
              } else if (data.name === 'get_calendar_items' && data.result?.count !== undefined) {
                doneDetail = `${data.result.count} items on calendar`;
              } else if (data.name === 'propose_concept' && data.result?.format_name) {
                doneDetail = `proposed: ${data.result.format_name}`;
              } else if (data.name === 'add_calendar_items' && data.result?.added) {
                doneDetail = `${data.result.added} item${data.result.added > 1 ? 's' : ''} added`;
              }
              updateMsg((m) => ({
                ...m,
                // show the "thinking between rounds" indicator only if all steps done and no content yet
                isAgentWorking: allDoneNow && !m.content && !m.conceptProposal,
                thinkingSteps: (m.thinkingSteps ?? []).map((s) =>
                  s.id === stepId ? { ...s, status: 'done' as const, detail: doneDetail || s.detail } : s
                ),
              }));
            }

            // Apply side effects
            if (data.name === 'add_calendar_items' && Array.isArray(data.input?.items)) {
              const items = data.input.items as ContentItem[];
              items.forEach((item, k) => {
                setTimeout(() => {
                  setCalendarItems((prev) => {
                    const next = prev.some((x) => x.id === item.id) ? prev : [...prev, item];
                    calendarItemsRef.current = next;
                    return next;
                  });
                  setNewItemIds((prev) => new Set([...prev, item.id]));
                  setTimeout(() => {
                    setNewItemIds((prev) => { const n = new Set(prev); n.delete(item.id); return n; });
                  }, 1200);
                }, k * 180);
              });
            }

            if (data.name === 'switch_view' && data.input?.view) {
              setTimeout(() => {
                setActiveView(data.input.view as ActiveView);
                setAppMode('split');
              }, 300);
            }

            if (data.name === 'generate_script' && data.result?.item_id && data.result?.script) {
              setScript(data.result.item_id as string, data.result.script as string);
            }
          }

          if (eventName === 'error') {
            updateMsg((m) => ({ ...m, content: `Error: ${data.message}` }));
          }
        }
      }
    } catch (err) {
      updateMsg((m) => ({ ...m, isAgentWorking: false, content: `Something went wrong: ${err instanceof Error ? err.message : String(err)}` }));
    } finally {
      updateMsg((m) => ({ ...m, isAgentWorking: false }));
    }
  }, [appMode, sendListingVideo]);

  // Fire the next autopilot concept cycle — creates a visible assistant bubble with full steps
  // Does NOT add a user message, so chat stays clean
  const triggerNextAutopilotConcept = useCallback(async () => {
    if (!autopilotRef.current) return;

    const newMsgId = uid();
    const placeholder: ChatMessage = {
      id: newMsgId, role: 'assistant', content: '', timestamp: new Date(), thinkingSteps: [],
    };
    setChatHistory((prev) => { chatHistoryRef.current = [...prev, placeholder]; return chatHistoryRef.current; });

    const updateMsg = (updater: (m: ChatMessage) => ChatMessage) => {
      setChatHistory((prev) => prev.map((m) => m.id === newMsgId ? updater(m) : m));
    };

    const toolMeta: Record<string, { type: ThinkingStepType; label: string; detail?: (i: Record<string, unknown>) => string }> = {
      get_format_library: { type: 'database', label: 'Browsing format library',
        detail: (i) => i.pillar ? `filtering by pillar: ${i.pillar}` : 'scanning all 14 proven RE formats' },
      get_user_profile:   { type: 'database', label: 'Loading agent profile',
        detail: () => 'Dumont Immobilier · Paris 15th · goals & tone' },
      get_calendar_items: { type: 'database', label: 'Reading current calendar',
        detail: () => 'checking scheduled content & pillar gaps' },
      search_web:         { type: 'browse',   label: 'Searching the web',
        detail: (i) => i.query ? `searching: "${i.query}"` : '' },
      propose_concept:    { type: 'generate', label: 'Drafting concept',
        detail: (i) => i.format_name ? `selected: ${i.format_name}` : '' },
      add_calendar_items: { type: 'calendar_write', label: 'Writing to calendar',
        detail: (i) => { const items = Array.isArray(i.items) ? i.items as Record<string, unknown>[] : []; return items.length === 1 ? `adding: "${items[0].title ?? 'item'}"` : `adding ${items.length} items`; } },
      switch_view: { type: 'browse', label: 'Switching view', detail: (i) => i.view ? `opening ${i.view}` : '' },
    };

    // Build messages from history — exclude the placeholder we just added
    const apiMessages = chatHistoryRef.current
      .filter((m) => m.id !== newMsgId && (m.role === 'user' ? true : m.content.length > 0))
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    apiMessages.push({
      role: 'user',
      content: 'Now propose the next video concept for this content plan. Check the calendar for what\'s already scheduled, pick a fresh pillar and format, search for local context if relevant, then propose_concept.',
    });

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, calendarItems: calendarItemsRef.current }),
      });
      if (!resp.ok || !resp.body) { updateMsg(m => ({ ...m, content: `Error: ${resp.status}` })); return; }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      const stepIds: Record<string, string> = {};
      let activeStepCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        let eventName = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) { eventName = line.slice(7).trim(); continue; }
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6));

          if (eventName === 'text_delta') {
            updateMsg(m => ({ ...m, content: m.content + data.delta, isAgentWorking: false }));
          }

          if (eventName === 'tool_start') {
            const meta = toolMeta[data.name] ?? { type: 'analyze' as ThinkingStepType, label: data.name };
            const stepId = uid();
            stepIds[data.id] = stepId;
            const detail = meta.detail ? meta.detail(data.input ?? {}) : '';
            activeStepCount++;
            updateMsg(m => ({ ...m, isAgentWorking: false,
              thinkingSteps: [...(m.thinkingSteps ?? []), { id: stepId, type: meta.type, label: meta.label, detail, status: 'running' as const }],
            }));
          }

          if (eventName === 'concept_proposal') {
            if (data._resumeConversation) pendingResumeRef.current[newMsgId] = data._resumeConversation as unknown[];
            const { _resumeConversation: _rc, ...proposalData } = data as ConceptProposal & { _resumeConversation?: unknown[] };
            void _rc;
            if (autopilotRef.current) {
              updateMsg(m => ({ ...m, conceptProposal: proposalData as ConceptProposal, proposalStatus: 'autopilot' }));
              // Auto-approve — handled by the approveConcept ref below
              setTimeout(() => approveConceptRef.current(newMsgId, true), 1800);
            } else {
              updateMsg(m => ({ ...m, conceptProposal: proposalData as ConceptProposal, proposalStatus: 'pending' }));
            }
          }

          if (eventName === 'tool_done') {
            const stepId = stepIds[data.id];
            activeStepCount = Math.max(0, activeStepCount - 1);
            const allDoneNow = activeStepCount === 0;
            let doneDetail = '';
            if (data.name === 'get_format_library' && data.result?.formats) doneDetail = `${data.result.formats.length} formats loaded`;
            else if (data.name === 'search_web' && data.result?.results?.length) doneDetail = `${data.result.results.length} results · ${data.result.source}`;
            else if (data.name === 'get_calendar_items' && data.result?.count !== undefined) doneDetail = `${data.result.count} items on calendar`;
            else if (data.name === 'propose_concept' && data.result?.format_name) doneDetail = `proposed: ${data.result.format_name}`;
            else if (data.name === 'add_calendar_items' && data.result?.added) doneDetail = `${data.result.added} item${data.result.added > 1 ? 's' : ''} added`;
            if (stepId) updateMsg(m => ({
              ...m,
              isAgentWorking: allDoneNow && !m.content && !m.conceptProposal,
              thinkingSteps: (m.thinkingSteps ?? []).map(s => s.id === stepId ? { ...s, status: 'done' as const, detail: doneDetail || s.detail } : s),
            }));

            if (data.name === 'add_calendar_items' && Array.isArray(data.input?.items)) {
              (data.input.items as ContentItem[]).forEach((item, k) => {
                setTimeout(() => {
                  setCalendarItems(prev => { const next = prev.some(x => x.id === item.id) ? prev : [...prev, item]; calendarItemsRef.current = next; return next; });
                  setNewItemIds(prev => new Set([...prev, item.id]));
                  setTimeout(() => setNewItemIds(prev => { const n = new Set(prev); n.delete(item.id); return n; }), 1200);
                }, k * 180);
              });
            }
            if (data.name === 'switch_view' && data.input?.view) {
              setTimeout(() => { setActiveView(data.input.view as ActiveView); setAppMode('split'); }, 300);
            }
          }

          if (eventName === 'error') updateMsg(m => ({ ...m, content: `Error: ${data.message}` }));
        }
      }
    } catch (err) {
      updateMsg(m => ({ ...m, isAgentWorking: false, content: `Error: ${err instanceof Error ? err.message : String(err)}` }));
    } finally {
      updateMsg(m => ({ ...m, isAgentWorking: false }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Approve or reject a concept proposal — resumes the agent using stored conversation state
  const approveConcept = useCallback((msgId: string, approved: boolean, feedback?: string) => {
    // Read from the synchronous ref — chatHistoryRef may be stale for this msg
    const resumeConversation = pendingResumeRef.current[msgId];

    setChatHistory((prev) => prev.map((m) =>
      m.id === msgId ? { ...m, proposalStatus: approved ? 'approved' : 'rejected' } : m
    ));

    const resumeUserMessage = approved
      ? 'Approved. Now call add_calendar_items with the full detailed recipe for this concept, then switch_view("calendar").'
      : (feedback ? `Change direction: ${feedback}. Propose a different concept.` : 'Change direction — propose a different concept.');

    if (resumeConversation && approved) {
      // Resume directly from saved server state — skip re-research entirely
      const newMsgId = uid();
      const placeholder: ChatMessage = { id: newMsgId, role: 'assistant', content: '', timestamp: new Date(), thinkingSteps: [] };
      setChatHistory((prev) => { chatHistoryRef.current = [...prev, placeholder]; return chatHistoryRef.current; });

      const updateMsg = (updater: (m: ChatMessage) => ChatMessage) => {
        setChatHistory((prev) => prev.map((m) => m.id === newMsgId ? updater(m) : m));
      };

      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [],
          calendarItems: calendarItemsRef.current,
          resumeConversation,
          resumeUserMessage,
        }),
      }).then(async (resp) => {
        if (!resp.ok || !resp.body) { updateMsg(m => ({ ...m, content: `Error: ${resp.status}` })); return; }
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        const stepIds: Record<string, string> = {};

        const toolMeta: Record<string, { type: ThinkingStepType; label: string; detail?: (i: Record<string, unknown>) => string }> = {
          add_calendar_items: { type: 'calendar_write', label: 'Writing to calendar',
            detail: (i) => { const items = Array.isArray(i.items) ? i.items as Record<string, unknown>[] : []; return items.length === 1 ? `adding: "${items[0].title ?? 'item'}"` : `adding ${items.length} items`; } },
          switch_view: { type: 'browse', label: 'Switching view', detail: (i) => i.view ? `opening ${i.view}` : '' },
          search_web:  { type: 'browse', label: 'Searching the web', detail: (i) => i.query ? `searching: "${i.query}"` : '' },
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          let eventName = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) { eventName = line.slice(7).trim(); continue; }
            if (!line.startsWith('data: ')) continue;
            const data = JSON.parse(line.slice(6));

            if (eventName === 'text_delta') updateMsg(m => ({ ...m, content: m.content + data.delta }));

            if (eventName === 'tool_start') {
              const meta = toolMeta[data.name] ?? { type: 'generate' as ThinkingStepType, label: data.name };
              const stepId = uid();
              stepIds[data.id] = stepId;
              const detail = meta.detail ? meta.detail(data.input ?? {}) : '';
              updateMsg(m => ({ ...m, thinkingSteps: [...(m.thinkingSteps ?? []), { id: stepId, type: meta.type, label: meta.label, detail, status: 'running' as const }] }));
            }

            if (eventName === 'tool_done') {
              const stepId = stepIds[data.id];
              let doneDetail = '';
              if (data.name === 'add_calendar_items' && data.result?.added) doneDetail = `${data.result.added} item${data.result.added > 1 ? 's' : ''} added`;
              if (stepId) updateMsg(m => ({ ...m, thinkingSteps: (m.thinkingSteps ?? []).map(s => s.id === stepId ? { ...s, status: 'done' as const, detail: doneDetail || s.detail } : s) }));

              if (data.name === 'add_calendar_items' && Array.isArray(data.input?.items)) {
                (data.input.items as ContentItem[]).forEach((item, k) => {
                  setTimeout(() => {
                    setCalendarItems(prev => { const next = prev.some(x => x.id === item.id) ? prev : [...prev, item]; calendarItemsRef.current = next; return next; });
                    setNewItemIds(prev => new Set([...prev, item.id]));
                    setTimeout(() => setNewItemIds(prev => { const n = new Set(prev); n.delete(item.id); return n; }), 1200);
                  }, k * 180);
                });
              }
              if (data.name === 'switch_view' && data.input?.view) {
                setTimeout(() => { setActiveView(data.input.view as ActiveView); setAppMode('split'); }, 300);
              }
            }

            if (eventName === 'error') updateMsg(m => ({ ...m, content: `Error: ${data.message}` }));
          }
        }
      }).then(() => {
        // After the calendar write completes, if autopilot is still on, kick off the next concept
        if (autopilotRef.current) {
          setAutopilotConceptsLeft((prev) => {
            const remaining = Math.max(0, prev - 1);
            if (remaining > 0) {
              setTimeout(() => triggerNextAutopilotConcept(), 900);
            } else {
              autopilotRef.current = false;
              setAutopilotActive(false);
            }
            return remaining;
          });
        }
      }).catch(err => updateMsg(m => ({ ...m, content: `Error: ${err instanceof Error ? err.message : String(err)}` })));
    } else {
      // Rejection or no stored state — fall back to a new message
      sendMessage(resumeUserMessage);
    }
  }, [sendMessage, setActiveView, setAppMode]);

  // Keep ref in sync so triggerNextAutopilotConcept can call it without circular dep
  approveConceptRef.current = approveConcept;

  // Called when the qualifying form is submitted — marks the form answered and sends enriched message
  const submitQualifyingForm = useCallback((formMsgId: string, params: QualifyingParams) => {
    // Mark the form as answered
    let originalRequest = params.originalRequest;
    setChatHistory((prev) => {
      // Grab the user message that preceded the form
      const formIdx = prev.findIndex((m) => m.id === formMsgId);
      if (formIdx > 0 && prev[formIdx - 1].role === 'user') {
        originalRequest = prev[formIdx - 1].content;
      }
      return prev.map((m) => m.id === formMsgId ? { ...m, qualifyingForm: { answered: true } } : m);
    });

    // Small delay so the "Got it" state renders before agent starts
    setTimeout(() => {
      const filmNote = params.willingToFilm
        ? 'The agent films themselves — plan content using their own footage.'
        : 'The agent does NOT film themselves — plan content using text-to-speech voiceover and an AI avatar (no personal footage).';
      const enriched = `${originalRequest}

Planning parameters:
- Period: ${params.period}
- Posting frequency: ${params.postsPerWeek} posts per week
- ${filmNote}

Please plan all posts for this period. Use propose_concept for the FIRST video concept only — I will approve or set autopilot for the rest.`;

      // Bypass the plan intercept so we don't loop back into the form
      sendMessage(enriched, true);
    }, 400);
  }, [sendMessage]);

  // Called from onboarding completion — fires the initial agent flow automatically
  const triggerOnboardingFlow = useCallback(() => {
    const greeting: ChatMessage = {
      id: uid(), role: 'assistant',
      content: "Welcome to EstateFlow AI — I'm setting up your growth dashboard now. Give me a moment to research your market and build your first content plan.",
      timestamp: new Date(),
    };
    setChatHistory([greeting]);
    setTimeout(() => runFlow('onboarding', setChatHistory, setCalendarItems, setActiveView, setAppMode, setNewItemIds), 800);
  }, []);

  return (
    <AppContext.Provider value={{
      loggedIn, setLoggedIn,
      profile, setProfile,
      onboardingComplete, setOnboardingComplete,
      approveConcept,
      activeView, setActiveView,
      appMode, setAppMode,
      chatHistory, sendMessage, sendListingVideo, triggerOnboardingFlow,
      calendarItems, patchCalendarItems, newItemIds,
      scripts, setScript,
      assets, addAsset,
      poolAssets, clearPoolAssets, triggerAssetAgent,
      autopilotActive, autopilotConceptsLeft, startAutopilot, stopAutopilot,
      submitQualifyingForm,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { mockProfile };
