import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import { FORMAT_LIBRARY } from './formatLibrary.js';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());

// Serve local Downloads folder so browser can load file:// assets over HTTP
app.use('/local-assets', express.static(path.join(process.env.HOME ?? '/Users/emmanuellandau', 'Downloads'), {
  setHeaders: (res) => { res.setHeader('Cache-Control', 'no-store'); },
}));

const rawKey = process.env.ANTHROPIC_API_KEY ?? '';
const geminiKey = process.env.GEMINI_API_KEY ?? '';

// Key type detection:
// - "ABSK..." = Bedrock long-lived API key (bearer token for bedrock-runtime)
// - "bedrock-api-key-..." = Claude Code presigned URL (not usable here)
// - "sk-ant-..." = direct Anthropic API key
const isBedrockLongLived = rawKey.startsWith('ABSK');
const isAnthropicKey = rawKey.startsWith('sk-ant-');

// AI provider selection — set AI_PROVIDER=gemini in .env to route through Gemini
const AI_PROVIDER = process.env.AI_PROVIDER ?? 'anthropic';
const useGemini = AI_PROVIDER === 'gemini' && !!geminiKey;

const anthropic = isAnthropicKey ? new Anthropic({ apiKey: rawKey }) : null;

const BEDROCK_REGION = 'eu-north-1';
const BEDROCK_MODEL = 'eu.anthropic.claude-sonnet-4-5-20250929-v1:0';
const GEMINI_MODEL = 'gemini-2.0-flash';

// Gemini provider — translates Anthropic message/tool format ↔ Gemini REST API
async function callGemini(body: Record<string, unknown>): Promise<Anthropic.Message> {
  const messages = (body.messages as Array<{ role: string; content: string | unknown[] }>) ?? [];
  const systemPrompt = body.system as string | undefined;
  const anthropicTools = (body.tools as Anthropic.Tool[] | undefined) ?? [];

  // Convert Anthropic messages → Gemini contents
  // Anthropic tool_use / tool_result blocks need special handling
  const contents: unknown[] = [];
  for (const m of messages) {
    if (typeof m.content === 'string') {
      contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] });
      continue;
    }
    // content is an array of blocks
    const blocks = m.content as Array<Record<string, unknown>>;
    const parts: unknown[] = [];
    for (const block of blocks) {
      if (block.type === 'text') {
        parts.push({ text: block.text });
      } else if (block.type === 'tool_use') {
        parts.push({ functionCall: { name: block.name, args: block.input ?? {} } });
      } else if (block.type === 'tool_result') {
        // Gemini expects function responses from the "user" role
        let responseObj: unknown;
        try { responseObj = JSON.parse(block.content as string); } catch { responseObj = { result: block.content }; }
        parts.push({ functionResponse: { name: block.tool_use_id, response: responseObj } });
      }
    }
    if (parts.length > 0) {
      contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts });
    }
  }

  // Convert Anthropic tool definitions → Gemini function declarations
  const functionDeclarations = anthropicTools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.input_schema,
  }));

  const payload: Record<string, unknown> = { contents };
  if (systemPrompt) {
    payload.system_instruction = { parts: [{ text: systemPrompt }] };
  }
  if (functionDeclarations.length > 0) {
    payload.tools = [{ function_declarations: functionDeclarations }];
    payload.tool_config = { function_calling_config: { mode: 'AUTO' } };
  }

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
  );
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Gemini ${resp.status}: ${text.slice(0, 300)}`);
  }

  const data = await resp.json() as {
    candidates: Array<{
      content: { parts: Array<{ text?: string; functionCall?: { name: string; args: Record<string, unknown> } }> };
      finishReason: string;
    }>;
  };

  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];

  // Translate Gemini parts → Anthropic content blocks
  const content: Anthropic.ContentBlock[] = [];
  let toolIndex = 0;
  for (const part of parts) {
    if (part.text) {
      content.push({ type: 'text', text: part.text });
    } else if (part.functionCall) {
      content.push({
        type: 'tool_use',
        id: `gemini_tool_${Date.now()}_${toolIndex++}`,
        name: part.functionCall.name,
        input: part.functionCall.args ?? {},
      } as unknown as Anthropic.ContentBlock);
    }
  }

  const finishReason = candidate?.finishReason;
  const stopReason: Anthropic.Message['stop_reason'] =
    finishReason === 'STOP' ? 'end_turn' :
    finishReason === 'MAX_TOKENS' ? 'max_tokens' :
    content.some(b => b.type === 'tool_use') ? 'tool_use' : 'end_turn';

  return {
    id: `gemini-${Date.now()}`,
    type: 'message',
    role: 'assistant',
    content,
    model: GEMINI_MODEL,
    stop_reason: stopReason,
    stop_sequence: null,
    usage: { input_tokens: 0, output_tokens: 0 },
  } as unknown as Anthropic.Message;
}

async function callClaude(body: Record<string, unknown>): Promise<Anthropic.Message> {
  if (useGemini) return callGemini(body);

  if (isBedrockLongLived) {
    const url = `https://bedrock-runtime.${BEDROCK_REGION}.amazonaws.com/model/${BEDROCK_MODEL}/invoke`;
    const { model: _model, ...bodyWithoutModel } = body as Record<string, unknown> & { model?: string };
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${rawKey}`,
        'X-Amzn-Bedrock-Api-Key': rawKey,
      },
      body: JSON.stringify({ ...bodyWithoutModel, anthropic_version: 'bedrock-2023-05-31' }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Bedrock ${resp.status}: ${text.slice(0, 300)}`);
    }
    return resp.json() as Promise<Anthropic.Message>;
  }
  if (isAnthropicKey) {
    return anthropic!.messages.create(body as Parameters<typeof anthropic.messages.create>[0]);
  }
  throw new Error('No valid API key configured.');
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_format_library',
    description: 'Retrieve the curated library of proven real estate video formats with engagement benchmarks, hook patterns, and scene structure templates. Always call this first when creating any video concept or content plan — pick the best-fit format before crafting anything.',
    input_schema: {
      type: 'object' as const,
      properties: {
        pillar: { type: 'string', description: 'Optional: filter by content pillar to get only relevant formats', enum: ['seller education', 'buyer education', 'listing content', 'local authority', 'trust building', 'educational'] },
      },
      required: [],
    },
  },
  {
    name: 'get_user_profile',
    description: 'Get the agent\'s profile — business goals, location, target audiences, brand tone, posting frequency, and available assets. Call this when you need to personalise content to their specific context.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_calendar_items',
    description: 'Read the current content calendar. Call this to see what is already scheduled — use it to avoid repeating pillars or formats, and to find gaps.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'search_web',
    description: 'Search the web for fresh, localised information. Use for local-authority or neighbourhood content — current events, markets, activities, neighbourhood news, local businesses. Also use to get fresh Paris real estate market data. Pass a specific, targeted query.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Specific search query, e.g. "Paris 15ème arrondissement événements été 2026" or "marchés et activités Paris 15th juin 2026"' },
        reason: { type: 'string', description: 'Why you are searching — shown to the user as context' },
      },
      required: ['query', 'reason'],
    },
  },
  {
    name: 'propose_concept',
    description: 'Present a video concept to the user for approval BEFORE crafting the full recipe. Call this after selecting a format and gathering context, but BEFORE calling add_calendar_items. Include the format name, the hook angle, and a one-sentence rationale. Wait for user approval before proceeding.',
    input_schema: {
      type: 'object' as const,
      properties: {
        format_name:    { type: 'string', description: 'The chosen video format name from the library' },
        format_id:      { type: 'string', description: 'The format id from the library' },
        pillar:         { type: 'string', enum: ['seller education', 'buyer education', 'listing content', 'local authority', 'trust building', 'educational'] },
        hook_angle:     { type: 'string', description: 'The specific hook angle — the opening line or provocative premise' },
        rationale:      { type: 'string', description: 'One sentence: why this format and hook fits the user\'s goals and calendar right now' },
        suggested_date: { type: 'string', description: 'ISO date YYYY-MM-DD — next available slot' },
      },
      required: ['format_name', 'format_id', 'pillar', 'hook_angle', 'rationale', 'suggested_date'],
    },
  },
  {
    name: 'add_calendar_items',
    description: 'Add one or more content items to the calendar. Only call this AFTER the user has approved a concept via propose_concept (or when planning a full calendar batch where individual approval is not needed).',
    input_schema: {
      type: 'object' as const,
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id:                { type: 'string', description: 'Unique id e.g. "item_001"' },
              title:             { type: 'string', description: 'Content piece title' },
              channel:           { type: 'string', enum: ['organic', 'paid'] },
              platforms:         { type: 'array', items: { type: 'string', enum: ['Instagram', 'TikTok', 'YouTube Shorts', 'Facebook', 'LinkedIn'] } },
              pillar:            { type: 'string', enum: ['seller education', 'buyer education', 'listing content', 'local authority', 'trust building', 'educational'] },
              target_audience:   { type: 'string' },
              objective:         { type: 'string' },
              format:            { type: 'string' },
              hook:              { type: 'string', description: 'Opening hook line' },
              structure:         { type: 'array', items: { type: 'string' }, description: 'Scene/section breakdown' },
              cta:               { type: 'string' },
              required_assets:   { type: 'array', items: { type: 'string' } },
              scheduled_date:    { type: 'string', description: 'ISO date YYYY-MM-DD' },
              production_status: { type: 'string', enum: ['strategy_approved', 'assets_needed', 'script_drafted', 'voiceover_generated', 'video_pending', 'editing', 'ready_for_review', 'approved', 'scheduled', 'published', 'performance_tracked'] },
            },
            required: ['id', 'title', 'channel', 'platforms', 'pillar', 'target_audience', 'objective', 'format', 'hook', 'structure', 'cta', 'required_assets', 'scheduled_date', 'production_status'],
          },
          minItems: 1,
        },
      },
      required: ['items'],
    },
  },
  {
    name: 'switch_view',
    description: 'Switch the active view/panel shown to the user.',
    input_schema: {
      type: 'object' as const,
      properties: {
        view: { type: 'string', enum: ['calendar', 'strategy/organic', 'strategy/paid', 'analytics'] },
      },
      required: ['view'],
    },
  },
  {
    name: 'get_analytics',
    description: 'Get the analytics summary — reach, engagement, top pillars, paid CPL/CTR.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'generate_script',
    description: 'Generate a plain spoken-word script for a video.',
    input_schema: {
      type: 'object' as const,
      properties: {
        item_id:   { type: 'string' },
        title:     { type: 'string' },
        format:    { type: 'string' },
        hook:      { type: 'string' },
        structure: { type: 'array', items: { type: 'string' } },
        cta:       { type: 'string' },
        language:  { type: 'string', description: 'Language to write in, e.g. "French" or "English"', default: 'English' },
      },
      required: ['item_id', 'title', 'format', 'hook', 'structure', 'cta'],
    },
  },
];

// ─── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the EstateFlow AI growth agent — a specialist AI for real estate professionals who want to build their social media presence and generate leads.

Today's date: ${new Date().toISOString().split('T')[0]}

## Tool call order for video / content concept requests

When the user asks for a video concept, a single piece of content, or a listing video, follow this exact sequence:

1. get_format_library — pick the best-fit format. Note the engagement benchmark and hook patterns.
2. get_user_profile — confirm their goals, neighbourhood, tone, and assets.
3. get_calendar_items — scan what's already scheduled. Identify pillar gaps and avoid repeating a format used in the last 2 weeks.
4. search_web — ONLY for local-authority, neighbourhood, or seasonal content. Search for real current events, places, or market data specific to their location. Skip this step for listing tours or talking-head seller education.
5. propose_concept — present the chosen format, hook angle, and rationale. STOP and wait for user approval. Do not call add_calendar_items yet.
6. (after approval) add_calendar_items — craft the full detailed recipe: specific hook, scene-by-scene structure using the format template, assets list, realistic scheduled date (Mon/Wed/Fri).
7. switch_view("calendar") — show the result.

## Tool call order for full calendar planning (multiple items)

When the user asks to plan a full week or month:
1. get_format_library
2. get_user_profile
3. get_calendar_items
4. add_calendar_items — write all items at once, varied formats, balanced pillars, no approval gate needed for batch planning
5. switch_view("calendar")

## search_web guidance

Use search_web when creating local-authority or neighbourhood content. Search for:
- Current events, markets, festivals in their neighbourhood this month
- Recent real estate market news for their city/arrondissement
- Specific streets, parks, cafés, schools — real named places
Pass a specific French or English query. The result gives you real hooks and scene details.

## General behaviour

- Be direct and tactical — no filler
- Do NOT narrate what you are about to do. Just call the tools. The UI shows the steps visually.
- After ALL tools are done and concept is proposed, write 2–4 sentences max.
- Dates must be Mon/Wed/Fri, future, relative to today
- All content must be specific: real hooks, real scene breakdowns, real CTAs — never generic placeholders
- When crafting hooks, use the hook_patterns from the format library as inspiration but adapt them to the user's specific neighbourhood, goals, and any fresh data from search_web
- CRITICAL: For video / content concept requests, call get_format_library + get_user_profile + get_calendar_items in the SAME round (all at once, in parallel). Then call search_web (if local content) and propose_concept in the SAME next round. Never split these across more rounds than necessary.`;

// ─── Web search (DuckDuckGo instant answer + scrape fallback) ─────────────────

async function searchWeb(query: string): Promise<string> {
  try {
    // DuckDuckGo instant answer API
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
    const ddgResp = await fetch(ddgUrl, { headers: { 'User-Agent': 'EstateFlowAI/1.0' } });
    const ddgData = await ddgResp.json() as Record<string, unknown>;

    const results: string[] = [];

    if (ddgData.AbstractText && typeof ddgData.AbstractText === 'string' && ddgData.AbstractText.length > 20) {
      results.push(ddgData.AbstractText as string);
    }

    const relatedTopics = ddgData.RelatedTopics as Array<{ Text?: string; FirstURL?: string }> | undefined;
    if (Array.isArray(relatedTopics)) {
      relatedTopics.slice(0, 4).forEach((t) => {
        if (t.Text) results.push(t.Text);
      });
    }

    if (results.length > 0) {
      return JSON.stringify({ query, source: 'DuckDuckGo', results: results.slice(0, 5) });
    }

    // Fallback: scrape Wikipedia for neighbourhood/place queries
    const wikiQuery = encodeURIComponent(query.replace(/\b(2026|events?|activit[eé]s?|mars|juin|juillet)\b/gi, '').trim());
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${wikiQuery}`;
    const wikiResp = await fetch(wikiUrl, { headers: { 'User-Agent': 'EstateFlowAI/1.0' } });
    if (wikiResp.ok) {
      const wikiData = await wikiResp.json() as { extract?: string; title?: string };
      if (wikiData.extract) {
        return JSON.stringify({ query, source: 'Wikipedia', results: [wikiData.extract.slice(0, 600)] });
      }
    }

    return JSON.stringify({ query, source: 'none', results: [], note: 'No results found — use your training knowledge for this location.' });
  } catch {
    return JSON.stringify({ query, source: 'error', results: [], note: 'Search failed — use training knowledge.' });
  }
}

// ─── Tool execution ────────────────────────────────────────────────────────────

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  calendarItems: unknown[],
): Promise<{ result: string; isConceptProposal?: boolean }> {

  if (name === 'get_format_library') {
    const pillarFilter = input.pillar as string | undefined;
    const formats = pillarFilter
      ? FORMAT_LIBRARY.filter(f => f.pillars.includes(pillarFilter))
      : FORMAT_LIBRARY;
    return { result: JSON.stringify({ formats: formats.map(f => ({
      id: f.id, name: f.name, pillars: f.pillars, platforms: f.platforms,
      avg_engagement_note: f.avg_engagement_note, hook_patterns: f.hook_patterns,
      structure_template: f.structure_template, best_for: f.best_for,
      production_difficulty: f.production_difficulty,
    })) }) };
  }

  if (name === 'get_user_profile') {
    return { result: JSON.stringify({
      business_name: 'Dumont Immobilier',
      location: 'Paris 15th arrondissement (75015)',
      neighbourhood_focus: ['Commerce', 'Beaugrenelle', 'Grenelle', 'Vaugirard'],
      property_segments: ['family apartments', 'investment properties'],
      primary_goal: 'generate seller leads',
      secondary_goal: 'build local authority in Paris 15th',
      target_audiences: ['sellers', 'investors', 'families'],
      platforms: ['Instagram', 'TikTok', 'YouTube Shorts'],
      posting_schedule: 'Mon/Wed/Fri — 3×/week',
      willing_to_film: true,
      brand_tone: 'professional, local expert, trustworthy, direct',
      available_assets: ['agent talking-head', 'property photos', 'neighbourhood B-roll', 'client testimonials'],
      language: 'English',
    }) };
  }

  if (name === 'get_calendar_items') {
    if (!calendarItems || calendarItems.length === 0) return { result: JSON.stringify({ count: 0, items: [] }) };
    return { result: JSON.stringify({ count: calendarItems.length, items: calendarItems }) };
  }

  if (name === 'search_web') {
    const query = input.query as string;
    const result = await searchWeb(query);
    return { result };
  }

  if (name === 'propose_concept') {
    // Signal the client to pause and show the approval card
    return {
      result: JSON.stringify({ proposed: true, ...input }),
      isConceptProposal: true,
    };
  }

  if (name === 'get_analytics') {
    return { result: JSON.stringify({
      period: 'May 2026',
      organic: {
        reach: 48200, impressions: 112000, engagement_rate: 4.7, follower_growth: 234,
        top_pillar: 'seller education', top_pillar_engagement: 6.2, top_pillar_saves: 340,
        top_format: 'talking-head educational short', top_format_avg_views: 8400,
        underperforming: 'generic static posts (2.8% engagement)',
      },
      paid: {
        ctr: 3.1, cpl: 12.4, roas: 2.8, lead_volume: 38,
        best_campaign: 'retargeting', best_ctr_hook: 'rare feature listing — 4.3% CTR',
      },
      recommendations: [
        'Cut generic static posts, reallocate to video',
        'Expand retargeting — best CPL at €12.4',
        'Add 2 more local authority pieces in June to compound reach',
      ],
    }) };
  }

  if (name === 'switch_view') return { result: JSON.stringify({ switched: true, view: input.view }) };

  if (name === 'add_calendar_items') {
    const items = Array.isArray(input.items) ? input.items as Record<string, unknown>[] : [];
    const normalized = items.map((item) => {
      if (item.recipe) return item;
      return { ...item, recipe: { hook: item.hook ?? '', structure: item.structure ?? [], cta: item.cta ?? '' } };
    });
    input.items = normalized;
    return { result: JSON.stringify({ added: normalized.length }) };
  }

  if (name === 'generate_script') {
    const { item_id, title, format, hook, structure, cta, language = 'English' } = input as {
      item_id: string; title: string; format: string; hook: string;
      structure: string[]; cta: string; language?: string;
    };
    const prompt = `Write a plain spoken-word script for a short social media video.

Format: ${format}
Title: ${title}
Hook (first line): ${hook}
Structure to cover: ${Array.isArray(structure) ? structure.join(', ') : structure}
CTA (last line): ${cta}
Language: ${language}

Rules:
- Plain spoken words only — no scene markers, no timestamps, no brackets, no annotations
- Write exactly as it should be spoken aloud, word for word
- ~100 words, punchy and direct
- Start with the hook line
- End with the CTA
- No title, no labels, just the script`;

    const resp = await callClaude({
      model: isAnthropicKey ? 'claude-sonnet-4-5' : BEDROCK_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    const script = resp.content.find((b) => b.type === 'text')?.text ?? '';
    return { result: JSON.stringify({ item_id, script }) };
  }

  return { result: JSON.stringify({ ok: true }) };
}

// ─── SSE chat endpoint ─────────────────────────────────────────────────────────

interface ChatRequestBody {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  calendarItems?: unknown[];
  // When resuming after a concept approval, pass the full conversation state
  // so the server skips the research phase and goes straight to add_calendar_items
  resumeConversation?: Anthropic.MessageParam[];
  resumeUserMessage?: string;
}

app.post('/api/chat', async (req, res) => {
  const { messages, calendarItems = [], resumeConversation, resumeUserMessage } = req.body as ChatRequestBody;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    let msgs: Anthropic.MessageParam[];
    if (resumeConversation && resumeUserMessage) {
      // Resume from saved state — append the user's approval/rejection message
      msgs = [...resumeConversation, { role: 'user', content: resumeUserMessage }];
    } else {
      msgs = messages.map((m) => ({ role: m.role, content: m.content }));
    }

    // Track whether the agent has completed its propose_concept call yet
    let conceptProposed = false;
    // Detect if this is a concept/video request that requires propose_concept
    const lastUserMsg = messages[messages.length - 1]?.content?.toLowerCase() ?? '';
    const requiresProposal = /video|concept|content|listing|post|plan|creat|tour|reels?/i.test(lastUserMsg)
      && !/analyt|perform|stats|script/i.test(lastUserMsg);

    let round = 0;
    while (round < 8) {
      round++;

      // ── Bedrock / Gemini path: non-streaming ─────────────────────────────────
      if (isBedrockLongLived || useGemini) {
        const response = await callClaude({
          model: useGemini ? GEMINI_MODEL : BEDROCK_MODEL,
          max_tokens: 8192,
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages: msgs,
        });

        let replyText = '';
        const toolUses: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];

        for (const block of response.content) {
          if (block.type === 'text') {
            replyText = block.text;
            // Don't emit yet — hold until after tool_done events so UI order is correct
          } else if (block.type === 'tool_use') {
            let input = block.input as Record<string, unknown>;
            if (typeof input === 'string') {
              try { input = JSON.parse(input); } catch { input = {}; }
            }
            send('tool_start', { id: block.id, name: block.name, input });
            toolUses.push({ id: block.id, name: block.name, input });
          }
        }

        // Text-only response (no tools) — check if we still need a proposal
        if (response.stop_reason === 'end_turn' || toolUses.length === 0) {
          if (requiresProposal && !conceptProposed && round <= 5) {
            // Model stalled with narration — suppress the text and nudge it forward
            msgs.push({ role: 'assistant', content: replyText || 'Understood.' });
            msgs.push({ role: 'user', content: 'Now call the remaining tools: search_web (if local content) and propose_concept. Do not reply with text — call the tools.' });
            continue;
          }
          if (replyText) send('text_delta', { delta: replyText });
          break;
        }

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        const assistantContent = response.content.map((block) => {
          if (block.type === 'tool_use') {
            const tu = toolUses.find((t) => t.id === block.id);
            return tu ? { ...block, input: tu.input } : block;
          }
          return block;
        });
        let proposalSent = false;
        for (const tu of toolUses) {
          const { result, isConceptProposal } = await executeTool(tu.name, tu.input, calendarItems);
          const parsed = JSON.parse(result);
          send('tool_done', { id: tu.id, name: tu.name, input: tu.input, result: parsed });
          if (isConceptProposal) {
            proposalSent = true;
            conceptProposed = true;
            // Will send concept_proposal after msgs are updated (need full state)
          }
          toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: result });
        }

        msgs.push({ role: 'assistant', content: assistantContent });
        msgs.push({ role: 'user', content: toolResults });

        // If a concept proposal was sent, stop here — wait for user approval
        if (proposalSent) {
          // Send proposal with the full conversation state so the client can resume cleanly
          const proposalData = toolResults
            .map(r => { try { return JSON.parse(r.content as string); } catch { return null; } })
            .find(r => r?.proposed);
          send('concept_proposal', { ...proposalData, _resumeConversation: msgs });
          if (replyText) send('text_delta', { delta: replyText });
          break;
        }
        // If there's reply text and no more tools needed, we're done
        if (replyText && conceptProposed) {
          send('text_delta', { delta: replyText });
          break;
        }
        continue; // loop back for another Bedrock round
      }

      // ── Anthropic direct path: true streaming ────────────────────────────────
      const stream = anthropic!.messages.stream({
        model: 'claude-sonnet-4-5',
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages: msgs,
      });

      let replyText = '';
      const toolUses: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];
      // Track open tool_use blocks by their block index → { id, name, accumulated json }
      const openToolBlocks: Record<number, { id: string; name: string; json: string }> = {};

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          if (event.content_block.type === 'tool_use') {
            openToolBlocks[event.index] = { id: event.content_block.id, name: event.content_block.name, json: '' };
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            replyText += event.delta.text;
            send('text_delta', { delta: event.delta.text });
          } else if (event.delta.type === 'input_json_delta') {
            const block = openToolBlocks[event.index];
            if (block) block.json += event.delta.partial_json;
          }
        } else if (event.type === 'content_block_stop') {
          const block = openToolBlocks[event.index];
          if (block) {
            let input: Record<string, unknown> = {};
            try { input = JSON.parse(block.json || '{}'); } catch { input = {}; }
            send('tool_start', { id: block.id, name: block.name, input });
            toolUses.push({ id: block.id, name: block.name, input });
            delete openToolBlocks[event.index];
          }
        }
      }

      const finalMsg = await stream.finalMessage();

      if (finalMsg.stop_reason === 'end_turn' || toolUses.length === 0) break;

      // Execute tools
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      const assistantContent = finalMsg.content.map((block) => {
        if (block.type === 'tool_use') {
          const tu = toolUses.find((t) => t.id === block.id);
          return tu ? { ...block, input: tu.input } : block;
        }
        return block;
      });
      let proposalSent = false;
      for (const tu of toolUses) {
        const { result, isConceptProposal } = await executeTool(tu.name, tu.input, calendarItems);
        const parsed = JSON.parse(result);
        send('tool_done', { id: tu.id, name: tu.name, input: tu.input, result: parsed });
        if (isConceptProposal) {
          send('concept_proposal', parsed);
          proposalSent = true;
        }
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: result });
      }

      msgs.push({ role: 'assistant', content: assistantContent });
      msgs.push({ role: 'user', content: toolResults });

      if (proposalSent) break; // wait for user approval
    }

    send('done', {});
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    send('error', { message: msg });
  } finally {
    res.end();
  }
});

// ─── Asset agent SSE endpoint ──────────────────────────────────────────────────

interface AssetAgentRequest {
  messages: Array<{ role: 'user' | 'agent'; content: string }>;
  requiredAssets: string[];
  jobContext: {
    title: string;
    format: string;
    pillar: string;
  };
  libraryAssets: Array<{
    id: string;
    name: string;
    type: string;
    category: string;
    tags: string[];
    thumbnail?: string;
    notes?: string;
  }>;
}

const PEXELS_API_KEY = '0UtWYfv1TiXjERUIbSxB4KLQAYQr1AnlMg2Jjrj4oDDB7ytX90BdKJ3l';

interface PexelsHit {
  id: number;
  url: string;
  description: string;
  thumbnail: string;
  download_url: string;
  duration: number;
  width: number;
  height: number;
}

async function searchPexels(query: string, perPage = 15): Promise<PexelsHit[]> {
  const resp = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}`,
    { headers: { Authorization: PEXELS_API_KEY } },
  );
  if (!resp.ok) throw new Error(`Pexels ${resp.status}: ${await resp.text()}`);
  const json = await resp.json() as { videos: Array<Record<string, unknown>> };
  return (json.videos ?? []).map((v) => {
    const files = v.video_files as Array<Record<string, unknown>>;
    // pick highest-resolution file (quality field is null on this account)
    const best = files.reduce<Record<string, unknown> | null>((acc, f) => {
      if (!acc) return f;
      return ((f['width'] as number) * (f['height'] as number)) >
             ((acc['width'] as number) * (acc['height'] as number)) ? f : acc;
    }, null) ?? files[0];
    const pictures = v.video_pictures as Array<Record<string, unknown>>;
    // description lives in the URL slug: .../video/some-descriptive-slug-123456/
    const slug = (v['url'] as string).split('/').filter(Boolean).at(-2) ?? '';
    const description = slug.replace(/-\d+$/, '').replace(/-/g, ' ');
    return {
      id: v['id'] as number,
      url: v['url'] as string,
      description,
      thumbnail: pictures?.[0]?.['picture'] as string ?? '',
      download_url: best?.['link'] as string ?? '',
      duration: v['duration'] as number ?? 0,
      width: v['width'] as number ?? 0,
      height: v['height'] as number ?? 0,
    };
  });
}

const ASSET_AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'find_asset',
    description: 'Search the user\'s existing asset library for an asset matching a need. Use this first before generating or searching stock. Pass the slot you are trying to fill and the best matching asset from the library.',
    input_schema: {
      type: 'object' as const,
      properties: {
        slot:       { type: 'string', description: 'The required asset slot being filled, e.g. "agent talking-head"' },
        asset_id:   { type: 'string', description: 'The id of the matching asset from the library' },
        asset_name: { type: 'string', description: 'The name of the matching asset' },
        asset_kind: { type: 'string', enum: ['photo', 'video', 'audio', 'document', 'logo'], description: 'Asset type' },
        thumbnail:  { type: 'string', description: 'Thumbnail URL from the library asset, if available' },
        reason:     { type: 'string', description: 'One sentence: why this asset fits the slot' },
      },
      required: ['slot', 'asset_id', 'asset_name', 'asset_kind', 'reason'],
    },
  },
  {
    name: 'search_pexels',
    description: 'Search Pexels stock footage for B-roll video clips. Use when no library asset fits and the slot needs generic footage (cityscape, real estate exterior, lifestyle, people walking, etc.). Returns real video URLs ready to use.',
    input_schema: {
      type: 'object' as const,
      properties: {
        slot:  { type: 'string', description: 'The asset slot being filled' },
        query: { type: 'string', description: 'Short, generic B-roll search query in English, e.g. "luxury apartment interior", "city skyline aerial", "couple signing documents"' },
        label: { type: 'string', description: 'Short human-readable label for the card, e.g. "Aerial city B-roll"' },
      },
      required: ['slot', 'query', 'label'],
    },
  },
  {
    name: 'pick_pexels_result',
    description: 'Confirm the chosen Pexels candidate after calling search_pexels. Pass the id of the single best match from the candidates list.',
    input_schema: {
      type: 'object' as const,
      properties: {
        slot:      { type: 'string', description: 'The asset slot being filled' },
        pexels_id: { type: 'number', description: 'The id of the chosen candidate from search_pexels results' },
        label:     { type: 'string', description: 'Short human-readable label for the card' },
      },
      required: ['slot', 'pexels_id', 'label'],
    },
  },
  {
    name: 'generate_asset',
    description: 'Generate a new asset when no suitable one exists in the library. Use for things like data overlays, text graphics, or market stats cards. Do NOT generate audio/voiceover (already handled), and do NOT generate photos or videos of real places.',
    input_schema: {
      type: 'object' as const,
      properties: {
        slot:        { type: 'string', description: 'The required asset slot being filled' },
        asset_kind:  { type: 'string', enum: ['photo', 'document', 'logo'], description: 'What type to generate' },
        description: { type: 'string', description: 'What to generate — specific, visual description' },
        label:       { type: 'string', description: 'Short label for the generated asset card, e.g. "Market data overlay"' },
      },
      required: ['slot', 'asset_kind', 'description', 'label'],
    },
  },
  {
    name: 'flag_missing',
    description: 'Flag an asset slot as not fillable from the library, Pexels, or by generation — the user will need to provide it manually. Use only when no library match exists, Pexels has nothing relevant, and generation is not appropriate (e.g. on-location footage of a specific property, client clip).',
    input_schema: {
      type: 'object' as const,
      properties: {
        slot:   { type: 'string', description: 'The slot that cannot be filled' },
        reason: { type: 'string', description: 'Why it cannot be auto-filled' },
      },
      required: ['slot', 'reason'],
    },
  },
];

function buildAssetAgentSystem(
  requiredAssets: string[],
  jobContext: AssetAgentRequest['jobContext'],
  libraryAssets: AssetAgentRequest['libraryAssets'],
): string {
  const libraryIndex = libraryAssets.map(a =>
    `- id:${a.id} | name:"${a.name}" | type:${a.type} | tags:[${a.tags.join(', ')}]${a.notes ? ` | notes:"${a.notes}"` : ''}`
  ).join('\n');

  return `You are the EstateFlow asset resolution agent. Your job is to fill the asset pool for a video production job.

## Video context
- Title: ${jobContext.title}
- Format: ${jobContext.format}
- Pillar: ${jobContext.pillar}

## Asset slots to fill
${requiredAssets.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## Available asset library
${libraryIndex || 'No assets in library yet.'}

## Instructions
- For EACH required slot, resolve it using the best available method — in priority order:
  1. find_asset — scan the library for semantic matches first.
  2. search_pexels — use for generic footage/B-roll (city views, interiors, lifestyle) when nothing in the library fits. After getting candidates back, immediately call pick_pexels_result with the best id.
  3. generate_asset — only for graphic overlays, data cards, or simple text visuals.
  4. flag_missing — only when none of the above apply (e.g. specific on-location clip the user must shoot).
- Process ALL slots in one round — call multiple tools in parallel.
- After resolving all slots, write 1-2 sentences summarising what was found and what the user still needs to provide.
- Be direct. No filler.`;
}

app.post('/api/asset-agent', async (req, res) => {
  const { messages, requiredAssets, jobContext, libraryAssets } = req.body as AssetAgentRequest;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const systemPrompt = buildAssetAgentSystem(requiredAssets, jobContext, libraryAssets);

    // Cache Pexels hits by id so pick_pexels_result can resolve them without re-fetching
    const pexelsHitCache = new Map<string, PexelsHit>();

    const msgs: Anthropic.MessageParam[] = messages.map(m => ({
      role: m.role === 'agent' ? 'assistant' : 'user',
      content: m.content,
    }));

    let round = 0;
    while (round < 5) {
      round++;

      if (isBedrockLongLived) {
        const response = await callClaude({
          model: BEDROCK_MODEL,
          max_tokens: 4096,
          system: systemPrompt,
          tools: ASSET_AGENT_TOOLS,
          messages: msgs,
        });

        let replyText = '';
        const toolUses: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];

        for (const block of response.content) {
          if (block.type === 'text') {
            replyText = block.text;
          } else if (block.type === 'tool_use') {
            let input = block.input as Record<string, unknown>;
            if (typeof input === 'string') {
              try { input = JSON.parse(input); } catch { input = {}; }
            }
            toolUses.push({ id: block.id, name: block.name, input });
          }
        }

        // Emit tool starts
        for (const tu of toolUses) {
          send('tool_start', { id: tu.id, name: tu.name, input: tu.input });
        }

        if (response.stop_reason === 'end_turn' || toolUses.length === 0) {
          if (replyText) send('text', { content: replyText });
          break;
        }

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        const assistantContent = response.content.map(block => {
          if (block.type === 'tool_use') {
            const tu = toolUses.find(t => t.id === block.id);
            return tu ? { ...block, input: tu.input } : block;
          }
          return block;
        });

        for (const tu of toolUses) {
          let result = '{}';
          if (tu.name === 'find_asset') {
            send('asset_found', {
              id: tu.input.asset_id,
              slot: tu.input.slot,
              label: tu.input.asset_name,
              kind: tu.input.asset_kind,
              thumbnail: tu.input.thumbnail,
              detail: tu.input.reason,
              source: 'library',
            });
            result = JSON.stringify({ ok: true, slot: tu.input.slot, matched: tu.input.asset_name });
          } else if (tu.name === 'search_pexels') {
            send('asset_searching_pexels', { slot: tu.input.slot, query: tu.input.query, label: tu.input.label });
            try {
              const hits = await searchPexels(String(tu.input.query), 15);
              hits.forEach(h => pexelsHitCache.set(String(h.id), h));
              if (hits.length > 0) {
                result = JSON.stringify({
                  ok: true, slot: tu.input.slot,
                  candidates: hits.map(h => ({ id: h.id, description: h.description, duration: h.duration })),
                  instruction: 'Pick the single best candidate for this slot and call pick_pexels_result with its id.',
                });
              } else {
                result = JSON.stringify({ ok: false, slot: tu.input.slot, error: 'No results found' });
              }
            } catch (e) {
              result = JSON.stringify({ ok: false, slot: tu.input.slot, error: String(e) });
            }
          } else if (tu.name === 'pick_pexels_result') {
            const hit = pexelsHitCache.get(String(tu.input.pexels_id));
            if (hit) {
              send('asset_found', { id: `pexels-${hit.id}`, slot: tu.input.slot, label: String(tu.input.label ?? hit.description), kind: 'video', thumbnail: hit.thumbnail, detail: `Pexels · ${hit.duration}s`, source: 'pexels', download_url: hit.download_url, pexels_url: hit.url });
              result = JSON.stringify({ ok: true, slot: tu.input.slot });
            } else {
              result = JSON.stringify({ ok: false, error: 'Unknown pexels_id — call search_pexels first' });
            }
          } else if (tu.name === 'generate_asset') {
            send('asset_generating', {
              slot: tu.input.slot,
              label: tu.input.label,
              kind: tu.input.asset_kind,
              description: tu.input.description,
            });
            await new Promise(r => setTimeout(r, 800));
            send('asset_generated', {
              slot: tu.input.slot,
              label: tu.input.label,
              kind: tu.input.asset_kind,
            });
            result = JSON.stringify({ ok: true, slot: tu.input.slot, generated: tu.input.label });
          } else if (tu.name === 'flag_missing') {
            send('asset_missing', {
              slot: tu.input.slot,
              reason: tu.input.reason,
            });
            result = JSON.stringify({ ok: true, slot: tu.input.slot, status: 'missing' });
          }
          toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: result });
        }

        msgs.push({ role: 'assistant', content: assistantContent });
        msgs.push({ role: 'user', content: toolResults });

      } else if (isAnthropicKey) {
        const stream = anthropic!.messages.stream({
          model: 'claude-sonnet-4-5',
          max_tokens: 4096,
          system: systemPrompt,
          tools: ASSET_AGENT_TOOLS,
          messages: msgs,
        });

        let replyText = '';
        const toolUses: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];
        const openToolBlocks: Record<number, { id: string; name: string; json: string }> = {};

        for await (const event of stream) {
          if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
            openToolBlocks[event.index] = { id: event.content_block.id, name: event.content_block.name, json: '' };
          } else if (event.type === 'content_block_delta') {
            if (event.delta.type === 'text_delta') replyText += event.delta.text;
            else if (event.delta.type === 'input_json_delta') {
              const b = openToolBlocks[event.index];
              if (b) b.json += event.delta.partial_json;
            }
          } else if (event.type === 'content_block_stop') {
            const b = openToolBlocks[event.index];
            if (b) {
              let input: Record<string, unknown> = {};
              try { input = JSON.parse(b.json || '{}'); } catch { input = {}; }
              send('tool_start', { id: b.id, name: b.name, input });
              toolUses.push({ id: b.id, name: b.name, input });
              delete openToolBlocks[event.index];
            }
          }
        }

        const finalMsg = await stream.finalMessage();
        if (finalMsg.stop_reason === 'end_turn' || toolUses.length === 0) {
          if (replyText) send('text', { content: replyText });
          break;
        }

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        const assistantContent = finalMsg.content.map(block => {
          if (block.type === 'tool_use') {
            const tu = toolUses.find(t => t.id === block.id);
            return tu ? { ...block, input: tu.input } : block;
          }
          return block;
        });

        for (const tu of toolUses) {
          let result = '{}';
          if (tu.name === 'find_asset') {
            send('asset_found', { id: tu.input.asset_id, slot: tu.input.slot, label: tu.input.asset_name, kind: tu.input.asset_kind, thumbnail: tu.input.thumbnail, detail: tu.input.reason, source: 'library' });
            result = JSON.stringify({ ok: true, slot: tu.input.slot, matched: tu.input.asset_name });
          } else if (tu.name === 'search_pexels') {
            send('asset_searching_pexels', { slot: tu.input.slot, query: tu.input.query, label: tu.input.label });
            try {
              const hits = await searchPexels(String(tu.input.query), 15);
              hits.forEach(h => pexelsHitCache.set(String(h.id), h));
              if (hits.length > 0) {
                result = JSON.stringify({
                  ok: true, slot: tu.input.slot,
                  candidates: hits.map(h => ({ id: h.id, description: h.description, duration: h.duration })),
                  instruction: 'Pick the single best candidate for this slot and call pick_pexels_result with its id.',
                });
              } else {
                result = JSON.stringify({ ok: false, slot: tu.input.slot, error: 'No results found' });
              }
            } catch (e) {
              result = JSON.stringify({ ok: false, slot: tu.input.slot, error: String(e) });
            }
          } else if (tu.name === 'pick_pexels_result') {
            const hit = pexelsHitCache.get(String(tu.input.pexels_id));
            if (hit) {
              send('asset_found', { id: `pexels-${hit.id}`, slot: tu.input.slot, label: String(tu.input.label ?? hit.description), kind: 'video', thumbnail: hit.thumbnail, detail: `Pexels · ${hit.duration}s`, source: 'pexels', download_url: hit.download_url, pexels_url: hit.url });
              result = JSON.stringify({ ok: true, slot: tu.input.slot });
            } else {
              result = JSON.stringify({ ok: false, error: 'Unknown pexels_id — call search_pexels first' });
            }
          } else if (tu.name === 'generate_asset') {
            send('asset_generating', { slot: tu.input.slot, label: tu.input.label, kind: tu.input.asset_kind, description: tu.input.description });
            await new Promise(r => setTimeout(r, 800));
            send('asset_generated', { slot: tu.input.slot, label: tu.input.label, kind: tu.input.asset_kind });
            result = JSON.stringify({ ok: true, slot: tu.input.slot, generated: tu.input.label });
          } else if (tu.name === 'flag_missing') {
            send('asset_missing', { slot: tu.input.slot, reason: tu.input.reason });
            result = JSON.stringify({ ok: true, slot: tu.input.slot, status: 'missing' });
          }
          toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: result });
        }

        msgs.push({ role: 'assistant', content: assistantContent });
        msgs.push({ role: 'user', content: toolResults });
        if (replyText) { send('text', { content: replyText }); break; }
      } else {
        throw new Error('No valid API key configured.');
      }
    }

    send('done', {});
  } catch (err) {
    send('error', { message: err instanceof Error ? err.message : String(err) });
  } finally {
    res.end();
  }
});

// ─── Voice-over endpoint ───────────────────────────────────────────────────────

const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY ?? '';
const ELEVENLABS_VOICE_ID = 'jUHQdLfy668sllNiNTSW';
const ELEVENLABS_MODEL = 'eleven_multilingual_v2';

const SPEECHMATICS_KEY = process.env.SPEECHMATICS_API_KEY ?? '';
// Available Speechmatics voices: sarah, theo, megan, jack
const SPEECHMATICS_VOICES: Record<string, string> = {
  sarah: 'sarah',
  theo:  'theo',
  megan: 'megan',
  jack:  'jack',
};

// TTS_PROVIDER=elevenlabs (default) | speechmatics
const TTS_PROVIDER = process.env.TTS_PROVIDER ?? 'elevenlabs';

async function generateElevenLabs(script: string): Promise<{ buffer: Buffer; contentType: string }> {
  const resp = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: script,
        model_id: ELEVENLABS_MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
      }),
    }
  );
  if (!resp.ok) throw new Error(`ElevenLabs ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  return { buffer: Buffer.from(await resp.arrayBuffer()), contentType: 'audio/mpeg' };
}

async function generateSpeechmatics(script: string, voice = 'sarah'): Promise<{ buffer: Buffer; contentType: string }> {
  const voiceId = SPEECHMATICS_VOICES[voice] ?? 'sarah';
  const resp = await fetch(
    `https://preview.tts.speechmatics.com/generate/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SPEECHMATICS_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: script }),
    }
  );
  if (!resp.ok) throw new Error(`Speechmatics ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  return { buffer: Buffer.from(await resp.arrayBuffer()), contentType: 'audio/wav' };
}

app.post('/api/voiceover', async (req, res) => {
  const { script, itemId, provider, voice } = req.body as {
    script: string; itemId: string; provider?: string; voice?: string;
  };
  if (!script) { res.status(400).json({ error: 'script required' }); return; }

  // Per-request provider override, falls back to server default
  const activeProvider = provider ?? TTS_PROVIDER;

  try {
    const { buffer, contentType } = activeProvider === 'speechmatics'
      ? await generateSpeechmatics(script, voice)
      : await generateElevenLabs(script);

    const ext = contentType === 'audio/wav' ? 'wav' : 'mp3';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="voiceover-${itemId}.${ext}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => console.log(`EstateFlow server on http://localhost:${PORT}`));
