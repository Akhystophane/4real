import { useRef, useEffect, useState } from 'react';
import { Send, Bot, Database, Search, Globe, CalendarPlus, BarChart2, Sparkles, Wand2, Check, ThumbsUp, RefreshCw, Zap, ChevronDown, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useApp, getViewLabel } from '../../context/AppContext';
import type { AgentThinkingStep, ThinkingStepType, ChatMessage, QualifyingParams } from '../../context/AppContext';
import { PROPERTY_LISTINGS } from '../../data/assets';

const SUGGESTIONS = [
  { label: 'Plan content for June', icon: '📅', desc: 'Build a full month calendar' },
  { label: 'Create a listing video concept', icon: '🎬', desc: 'Script + scene breakdown' },
  { label: 'What should I post this week?', icon: '✍️', desc: 'Curated weekly picks' },
  { label: 'Analyze last month\'s performance', icon: '📊', desc: 'Reach, engagement & leads' },
];

// ── Step config ──────────────────────────────────────────────────────────────────

const STEP_ICONS: Record<ThinkingStepType, React.ReactNode> = {
  database:       <Database    size={12} />,
  search:         <Search      size={12} />,
  browse:         <Globe       size={12} />,
  calendar_write: <CalendarPlus size={12} />,
  analyze:        <BarChart2   size={12} />,
  generate:       <Wand2       size={12} />,
};

const STEP_COLORS: Record<ThinkingStepType, {
  dot: string; ring: string; iconBg: string; iconText: string; labelText: string; line: string;
}> = {
  database:       { dot: 'bg-blue-500',    ring: 'bg-blue-400',    iconBg: 'bg-blue-50',    iconText: 'text-blue-600',   labelText: 'text-blue-700',   line: 'bg-blue-200'    },
  search:         { dot: 'bg-violet-500',  ring: 'bg-violet-400',  iconBg: 'bg-violet-50',  iconText: 'text-violet-600', labelText: 'text-violet-700', line: 'bg-violet-200'  },
  browse:         { dot: 'bg-amber-500',   ring: 'bg-amber-400',   iconBg: 'bg-amber-50',   iconText: 'text-amber-600',  labelText: 'text-amber-700',  line: 'bg-amber-200'   },
  calendar_write: { dot: 'bg-emerald-500', ring: 'bg-emerald-400', iconBg: 'bg-emerald-50', iconText: 'text-emerald-600',labelText: 'text-emerald-700',line: 'bg-emerald-200' },
  analyze:        { dot: 'bg-rose-500',    ring: 'bg-rose-400',    iconBg: 'bg-rose-50',    iconText: 'text-rose-600',   labelText: 'text-rose-700',   line: 'bg-rose-200'    },
  generate:       { dot: 'bg-indigo-500',  ring: 'bg-indigo-400',  iconBg: 'bg-indigo-50',  iconText: 'text-indigo-600', labelText: 'text-indigo-700', line: 'bg-indigo-200'  },
};

// ── ThinkingStepRow ──────────────────────────────────────────────────────────────

function ThinkingStepRow({ step, isLast, index }: { step: AgentThinkingStep; isLast: boolean; index: number }) {
  const c = STEP_COLORS[step.type];
  const isDone    = step.status === 'done';
  const isRunning = step.status === 'running';
  const isPending = step.status === 'pending';

  return (
    <div className="animate-step-in flex gap-3 min-w-0" style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}>
      {/* timeline column */}
      <div className="flex flex-col items-center flex-shrink-0" style={{ width: 20 }}>
        {/* dot / icon */}
        <div className="relative flex items-center justify-center" style={{ width: 20, height: 20 }}>
          {isRunning && (
            <span
              className={`absolute inset-0 rounded-full ${c.ring} animate-pulse-ring`}
              style={{ borderRadius: '50%' }}
            />
          )}
          <div
            className={`relative z-10 rounded-full flex items-center justify-center transition-all duration-500 ${
              isDone
                ? 'w-4 h-4 bg-[#051A24]'
                : isRunning
                  ? `w-4 h-4 ${c.dot}`
                  : 'w-2.5 h-2.5 bg-[#051A24]/15'
            }`}
          >
            {isDone && <Check size={8} color="white" strokeWidth={3} />}
          </div>
        </div>
        {/* connector line */}
        {!isLast && (
          <div
            className={`flex-1 w-px mt-0.5 transition-colors duration-700 ${
              isDone ? 'bg-[#051A24]/20' : 'bg-[#051A24]/08'
            }`}
            style={{ minHeight: 10 }}
          />
        )}
      </div>

      {/* content */}
      <div
        className={`flex-1 min-w-0 pb-3 transition-all duration-300 ${isLast ? 'pb-0' : ''}`}
      >
        {/* row: icon chip + label */}
        <div className="flex items-center gap-2">
          <div
            className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all duration-300 ${
              isPending ? 'bg-[#051A24]/06 text-[#051A24]/25' : `${c.iconBg} ${c.iconText}`
            }`}
          >
            {STEP_ICONS[step.type]}
          </div>
          <span
            className={`text-[11px] font-medium leading-none transition-all duration-300 ${
              isDone    ? 'text-[#051A24]/50' :
              isRunning ? `${c.labelText} font-semibold` :
              'text-[#051A24]/30'
            }`}
          >
            {step.label}
          </span>
        </div>

        {/* detail line — italic ↳ style, shown while running or done */}
        {step.detail && (isRunning || isDone) && (
          <div className={`mt-1 ml-7 animate-fade-in flex items-start gap-1 ${isDone ? 'opacity-50' : ''}`}>
            <span className={`text-[10px] ${c.labelText} opacity-60 mt-px`}>↳</span>
            <div className={`relative overflow-hidden text-[10px] italic ${c.labelText} opacity-80 font-normal leading-relaxed`}>
              {step.detail}
              {/* shimmer sweep only while running */}
              {isRunning && <span className="absolute inset-0 animate-shimmer pointer-events-none" />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Qualifying form card ──────────────────────────────────────────────────────────

const FREQ_OPTIONS: { label: string; value: number; sub: string }[] = [
  { label: '1×/week', value: 1, sub: '~4/month' },
  { label: '2×/week', value: 2, sub: '~8/month' },
  { label: '3×/week', value: 3, sub: '~12/month' },
  { label: '5×/week', value: 5, sub: '~20/month' },
];

function QualifyingCard({ msg }: { msg: ChatMessage }) {
  const { submitQualifyingForm } = useApp();
  const [freq, setFreq] = useState<number>(3);
  const [willFilm, setWillFilm] = useState<boolean | null>(null);
  const [period, setPeriod] = useState('');

  if (msg.qualifyingForm?.answered) {
    return (
      <div className="rounded-xl border border-[#E8EDF0] bg-[#F7F9FA] px-3.5 py-2.5 flex items-center gap-2 animate-fade-in">
        <Check size={13} className="text-emerald-500 flex-shrink-0" />
        <span className="text-[11px] text-[#051A24]/50">Got it — planning your content now…</span>
      </div>
    );
  }

  const canSubmit = willFilm !== null;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const params: QualifyingParams = {
      period: period.trim() || 'the next 4 weeks',
      postsPerWeek: freq,
      willingToFilm: willFilm!,
      originalRequest: '', // will be taken from prior user message
    };
    submitQualifyingForm(msg.id, params);
  };

  return (
    <div className="rounded-2xl border border-[#E8EDF0] bg-white shadow-sm overflow-hidden animate-step-in">
      <div className="px-3.5 pt-3 pb-2 border-b border-[#E8EDF0] flex items-center gap-2">
        <span className="text-base">📋</span>
        <span className="text-[11px] font-semibold text-[#051A24]">A few quick questions</span>
        <span className="ml-auto text-[10px] text-[#051A24]/30">helps me plan smarter</span>
      </div>

      <div className="px-3.5 py-3 space-y-4">
        {/* period */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-[#051A24]/50 uppercase tracking-wide">Which period?</p>
          <div className="relative">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="appearance-none w-full px-3 pr-7 py-2 rounded-xl border border-[#E8EDF0] text-sm text-[#051A24] outline-none bg-white cursor-pointer"
            >
              <option value="">Next 4 weeks (default)</option>
              <option value="June 2026">June 2026</option>
              <option value="July 2026">July 2026</option>
              <option value="this week">This week</option>
              <option value="next 2 weeks">Next 2 weeks</option>
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#051A24]/30 pointer-events-none" />
          </div>
        </div>

        {/* frequency */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-[#051A24]/50 uppercase tracking-wide">Posting frequency</p>
          <div className="grid grid-cols-4 gap-1.5">
            {FREQ_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setFreq(o.value)}
                className={`flex flex-col items-center py-2 px-1 rounded-xl border text-center transition-all duration-150 ${
                  freq === o.value
                    ? 'border-[#051A24] bg-[#051A24] text-white'
                    : 'border-[#E8EDF0] text-[#051A24]/60 hover:border-[#051A24]/30'
                }`}
              >
                <span className="text-[11px] font-semibold leading-none">{o.label}</span>
                <span className={`text-[9px] mt-0.5 ${freq === o.value ? 'text-white/60' : 'text-[#051A24]/30'}`}>{o.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* filming */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-[#051A24]/50 uppercase tracking-wide">Willing to film yourself?</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { val: true,  label: "Yes — I'll film myself",   sub: 'Uses your own footage' },
              { val: false, label: 'No — AI avatar + TTS', sub: 'Text-to-speech & AI avatar' },
            ].map((o) => (
              <button
                key={String(o.val)}
                onClick={() => setWillFilm(o.val)}
                className={`flex flex-col items-start px-3 py-2.5 rounded-xl border text-left transition-all duration-150 ${
                  willFilm === o.val
                    ? 'border-[#051A24] bg-[#051A24] text-white'
                    : 'border-[#E8EDF0] text-[#051A24]/60 hover:border-[#051A24]/30'
                }`}
              >
                <span className="text-[11px] font-semibold leading-snug">{o.label}</span>
                <span className={`text-[9px] mt-0.5 ${willFilm === o.val ? 'text-white/60' : 'text-[#051A24]/30'}`}>{o.sub}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-3.5 pb-3">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#051A24] text-white text-[11px] font-medium disabled:opacity-30 hover:opacity-80 transition-opacity active:scale-95"
        >
          <Sparkles size={11} />
          Start planning
        </button>
      </div>
    </div>
  );
}

// ── Concept approval card ────────────────────────────────────────────────────────

const PILLAR_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'seller education':  { bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-400'    },
  'local authority':   { bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-400'   },
  'listing content':   { bg: 'bg-violet-50',  text: 'text-violet-700', dot: 'bg-violet-400'  },
  'trust building':    { bg: 'bg-emerald-50', text: 'text-emerald-700',dot: 'bg-emerald-400' },
  'buyer education':   { bg: 'bg-rose-50',    text: 'text-rose-700',   dot: 'bg-rose-400'    },
  'educational':       { bg: 'bg-indigo-50',  text: 'text-indigo-700', dot: 'bg-indigo-400'  },
};

function ConceptApprovalCard({ msg }: { msg: ChatMessage }) {
  const { approveConcept, startAutopilot, autopilotActive } = useApp();
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [countdown, setCountdown] = useState(2);
  const proposal = msg.conceptProposal!;
  const status = msg.proposalStatus;
  const pc = PILLAR_COLORS[proposal.pillar] ?? { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-400' };

  // Countdown tick for autopilot status
  useEffect(() => {
    if (status !== 'autopilot') return;
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((n) => n - 1), 600);
    return () => clearTimeout(t);
  }, [status, countdown]);

  if (status === 'approved') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 flex items-center gap-2">
        <Check size={13} className="text-emerald-600 flex-shrink-0" />
        <span className="text-[11px] text-emerald-700 font-medium">Concept approved — building the full recipe…</span>
      </div>
    );
  }
  if (status === 'autopilot') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 overflow-hidden animate-step-in">
        <div className="px-3.5 pt-3 pb-2 border-b border-amber-200 flex items-center gap-2">
          <Zap size={12} className="text-amber-600" />
          <span className="text-[11px] font-semibold text-amber-800">Autopilot — auto-approving in {countdown}s…</span>
          <div className="ml-auto flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1 h-1 rounded-full bg-amber-400 animate-bounce"
                style={{ animationDelay: `${i * 0.18}s`, animationDuration: '1s' }}
              />
            ))}
          </div>
        </div>
        <div className="px-3.5 py-2.5 space-y-1.5">
          <div className="flex gap-3">
            <span className="text-[10px] text-amber-700/60 w-12 flex-shrink-0 pt-0.5">Format</span>
            <span className="text-[11px] font-medium text-amber-900">{proposal.format_name}</span>
          </div>
          <div className="flex gap-3">
            <span className="text-[10px] text-amber-700/60 w-12 flex-shrink-0 pt-0.5">Hook</span>
            <span className="text-[11px] text-amber-900 italic leading-snug">"{proposal.hook_angle}"</span>
          </div>
          <div className="flex gap-3">
            <span className="text-[10px] text-amber-700/60 w-12 flex-shrink-0 pt-0.5">Date</span>
            <span className="text-[11px] text-amber-900/70">{proposal.suggested_date}</span>
          </div>
        </div>
        {/* progress bar */}
        <div className="h-0.5 bg-amber-100">
          <div
            className="h-full bg-amber-400 transition-all"
            style={{ width: `${((2 - countdown) / 2) * 100}%`, transitionDuration: '600ms' }}
          />
        </div>
      </div>
    );
  }
  if (status === 'rejected') {
    return (
      <div className="rounded-xl border border-[#E8EDF0] bg-[#F7F9FA] px-3 py-2.5 flex items-center gap-2">
        <RefreshCw size={13} className="text-[#051A24]/40 flex-shrink-0" />
        <span className="text-[11px] text-[#051A24]/50 italic">Changing direction…</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#E8EDF0] bg-white shadow-sm overflow-hidden animate-step-in">
      {/* header */}
      <div className="px-3.5 pt-3 pb-2 border-b border-[#E8EDF0] flex items-center gap-2">
        <span className="text-base">🎬</span>
        <span className="text-[11px] font-semibold text-[#051A24]">Concept ready for approval</span>
        <span className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full ${pc.bg} ${pc.text}`}>
          {proposal.pillar}
        </span>
      </div>

      {/* body */}
      <div className="px-3.5 py-3 space-y-2.5">
        <div className="flex gap-3">
          <span className="text-[10px] text-[#051A24]/40 w-12 flex-shrink-0 pt-0.5">Format</span>
          <span className="text-[11px] font-medium text-[#051A24]">{proposal.format_name}</span>
        </div>
        <div className="flex gap-3">
          <span className="text-[10px] text-[#051A24]/40 w-12 flex-shrink-0 pt-0.5">Hook</span>
          <span className="text-[11px] text-[#051A24] italic leading-snug">"{proposal.hook_angle}"</span>
        </div>
        <div className="flex gap-3">
          <span className="text-[10px] text-[#051A24]/40 w-12 flex-shrink-0 pt-0.5">Why</span>
          <span className="text-[11px] text-[#051A24]/70 leading-snug">{proposal.rationale}</span>
        </div>
        <div className="flex gap-3">
          <span className="text-[10px] text-[#051A24]/40 w-12 flex-shrink-0 pt-0.5">Date</span>
          <span className="text-[11px] text-[#051A24]/70">{proposal.suggested_date}</span>
        </div>
      </div>

      {/* feedback input when changing direction */}
      {showFeedback && (
        <div className="px-3.5 pb-3">
          <input
            autoFocus
            type="text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') approveConcept(msg.id, false, feedback || undefined);
            }}
            placeholder="What should be different? (optional)"
            className="w-full text-[11px] px-2.5 py-1.5 rounded-lg border border-[#E8EDF0] outline-none bg-[#F7F9FA] placeholder-[#051A24]/30 text-[#051A24]"
          />
        </div>
      )}

      {/* actions */}
      <div className="px-3.5 pb-3 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => approveConcept(msg.id, true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#051A24] text-white text-[11px] font-medium hover:opacity-80 transition-all active:scale-95"
          >
            <ThumbsUp size={11} />
            Approve
          </button>
          <button
            onClick={() => {
              if (showFeedback) {
                approveConcept(msg.id, false, feedback || undefined);
              } else {
                setShowFeedback(true);
              }
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-[#E8EDF0] text-[#051A24]/60 text-[11px] font-medium hover:text-[#051A24] hover:border-[#051A24]/20 transition-all active:scale-95"
          >
            <RefreshCw size={11} />
            {showFeedback ? 'Send feedback' : 'Change direction'}
          </button>
        </div>
        {/* Autopilot — only show if not already in autopilot */}
        {!autopilotActive && (
          <button
            onClick={() => {
              startAutopilot(8); // plan up to 8 more concepts autonomously
              approveConcept(msg.id, true);
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-[11px] font-medium hover:bg-amber-100 transition-all active:scale-95"
          >
            <Zap size={11} />
            Approve + run autopilot for the rest
          </button>
        )}
      </div>
    </div>
  );
}

// ── Between-rounds thinking indicator ────────────────────────────────────────────

function BetweenRoundsIndicator() {
  return (
    <div className="flex gap-3 min-w-0 animate-fade-in">
      {/* timeline dot */}
      <div className="flex flex-col items-center flex-shrink-0" style={{ width: 20 }}>
        <div className="relative flex items-center justify-center" style={{ width: 20, height: 20 }}>
          <span className="absolute inset-0 rounded-full bg-[#051A24]/10 animate-pulse-ring" />
          <span className="relative z-10 inline-flex rounded-full h-2 w-2 bg-[#051A24]/25" />
        </div>
      </div>
      {/* label */}
      <div className="flex-1 min-w-0 pb-0 flex items-center gap-2" style={{ minHeight: 20 }}>
        <span className="text-[10px] italic text-[#051A24]/35 leading-none">thinking…</span>
        <span className="flex items-center gap-[3px]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1 h-1 rounded-full bg-[#051A24]/20 animate-bounce"
              style={{ animationDelay: `${i * 0.18}s`, animationDuration: '1s' }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

// ── Typing dots ──────────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-[5px] px-3.5 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[#051A24]/25 animate-bounce"
          style={{ animationDelay: `${i * 0.18}s`, animationDuration: '1s' }}
        />
      ))}
    </div>
  );
}

// ── MessageBubble ────────────────────────────────────────────────────────────────

// ── Markdown renderer ─────────────────────────────────────────────────────────────

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => (
          <p className="text-sm text-[#051A24] leading-relaxed mb-2 last:mb-0">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-[#051A24]">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-[#051A24]/75">{children}</em>
        ),
        ul: ({ children }) => (
          <ul className="my-2 space-y-1 pl-0">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-2 space-y-1 pl-0 list-none counter-reset-item">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="flex gap-2 text-sm text-[#051A24] leading-relaxed">
            <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#051A24]/30 mt-2" />
            <span>{children}</span>
          </li>
        ),
        h1: ({ children }) => (
          <h1 className="text-sm font-semibold text-[#051A24] mb-1 mt-2 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-sm font-semibold text-[#051A24] mb-1 mt-2 first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-[11px] font-semibold text-[#051A24]/60 uppercase tracking-wide mb-1 mt-2 first:mt-0">{children}</h3>
        ),
        code: ({ children }) => (
          <code className="text-[11px] font-mono bg-[#051A24]/06 text-[#051A24] px-1 py-0.5 rounded">{children}</code>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-[#051A24]/15 pl-3 my-2 text-sm text-[#051A24]/60 italic">{children}</blockquote>
        ),
        hr: () => <hr className="border-[#E8EDF0] my-3" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const hasSteps       = msg.thinkingSteps && msg.thinkingSteps.length > 0;
  const hasContent     = msg.content.length > 0;
  const hasProposal    = !!msg.conceptProposal;
  const hasQualifying  = !!msg.qualifyingForm;
  const hasAssets      = !!msg.propertyAssets && msg.propertyAssets.length > 0;
  const hasVideo       = !!msg.renderedVideo;
  const isLoading      = msg.role === 'assistant' && !hasContent && !hasSteps && !hasProposal && !hasQualifying && !hasAssets && !hasVideo;

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] flex flex-col items-end gap-1.5">
          <div className="px-3 py-2 rounded-2xl rounded-tr-sm bg-[#051A24] text-white text-sm leading-relaxed">
            {msg.content}
          </div>
          {msg.propertyMention && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#051A24]/08 border border-[#051A24]/12 text-[10px] text-[#051A24]/60">
              <span>🏠</span>
              <span>{msg.propertyMention.label}</span>
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-2">
      <div className="w-5 h-5 rounded-full bg-[#051A24] flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
        <Bot size={10} color="white" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        {/* typing dots — before any step has arrived */}
        {isLoading && (
          <div className="inline-block rounded-2xl rounded-tl-sm bg-white border border-[#E8EDF0] shadow-sm">
            <TypingDots />
          </div>
        )}

        {/* property asset thumbnail strip */}
        {hasAssets && (
          <div className="overflow-x-auto flex gap-2 pb-1 animate-fade-in">
            {msg.propertyAssets!.slice(0, 6).map((asset) => (
              <div
                key={asset.id}
                className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-[#E8EDF0] bg-[#F7F9FA]"
                title={asset.name}
              >
                {asset.thumbnail ? (
                  <img
                    src={asset.thumbnail}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#051A24]/20 text-[10px]">
                    📷
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* thinking steps — contained card */}
        {hasSteps && (
          <div className="bg-white border border-[#E8EDF0] rounded-2xl rounded-tl-sm shadow-sm px-3 pt-3 pb-2 space-y-0">
            {msg.thinkingSteps!.map((step, i) => (
              <ThinkingStepRow
                key={step.id}
                step={step}
                index={i}
                isLast={i === msg.thinkingSteps!.length - 1 && !msg.isAgentWorking}
              />
            ))}
            {/* between-rounds indicator — shown while agent is working but no new step yet */}
            {msg.isAgentWorking && <BetweenRoundsIndicator />}
          </div>
        )}

        {/* qualifying form — shown for plan-content requests before agent is called */}
        {hasQualifying && <QualifyingCard msg={msg} />}

        {/* concept approval card */}
        {hasProposal && <ConceptApprovalCard msg={msg} />}

        {/* rendered video card */}
        {hasVideo && (
          <div className="rounded-2xl border border-[#E8EDF0] bg-white shadow-sm overflow-hidden animate-fade-in">
            <video
              src={msg.renderedVideo}
              controls
              className="w-full rounded-t-2xl"
            />
            <div className="px-3.5 py-2.5 flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#051A24]">Listing video ready</span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                <Check size={10} />
                Saved to asset library
              </span>
            </div>
          </div>
        )}

        {/* reply text */}
        {hasContent && (
          <div className="px-3 py-2.5 rounded-2xl rounded-tl-sm bg-white border border-[#E8EDF0] shadow-sm animate-fade-in">
            <MarkdownContent content={msg.content} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── ChatPanel ────────────────────────────────────────────────────────────────────

interface ChatPanelProps {
  centerMode?: boolean;
}

export function ChatPanel({ centerMode = false }: ChatPanelProps) {
  const { chatHistory, sendMessage, activeView, autopilotActive, autopilotConceptsLeft, stopAutopilot } = useApp();
  const [input, setInput] = useState('');
  const [mention, setMention] = useState<{ id: string; label: string } | null>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSend = (text?: string) => {
    const t = (text ?? input).trim();
    if (!t) return;
    setInput('');
    sendMessage(t, mention ?? undefined);
    setMention(null);
    setMentionQuery('');
    setShowMentionPicker(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === 'Escape') { setShowMentionPicker(false); }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';

    // Detect @mention trigger
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1) {
      const afterAt = val.slice(lastAt + 1);
      // Only show picker if there's no space after @
      if (!afterAt.includes(' ')) {
        setMentionQuery(afterAt);
        setShowMentionPicker(true);
        return;
      }
    }
    setShowMentionPicker(false);
  };

  const filteredProperties = PROPERTY_LISTINGS.filter((p) =>
    p.label.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const selectMention = (prop: { id: string; label: string }) => {
    setMention(prop);
    // Remove the @<query> fragment from the input
    const lastAt = input.lastIndexOf('@');
    setInput(lastAt !== -1 ? input.slice(0, lastAt) : input);
    setShowMentionPicker(false);
    setMentionQuery('');
    textareaRef.current?.focus();
  };

  const hasMessages = chatHistory.length > 0;
  const viewLabel   = getViewLabel(activeView);

  // ── CENTER MODE (home / loading screen) ──────────────────────────────────────
  if (centerMode) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {/* ambient orbs */}
        <div
          className="pointer-events-none absolute rounded-full animate-orb-float"
          style={{
            width: 320, height: 320,
            background: 'radial-gradient(circle, rgba(5,26,36,0.06) 0%, transparent 70%)',
            top: '15%', left: '50%', transform: 'translateX(-50%)',
          }}
        />
        <div
          className="pointer-events-none absolute rounded-full animate-orb2-float"
          style={{
            width: 180, height: 180,
            background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)',
            bottom: '25%', right: '15%',
          }}
        />

        {/* messages scroll area */}
        {hasMessages ? (
          <div className="w-full max-w-xl mb-5 space-y-3 max-h-[45vh] overflow-y-auto">
            {chatHistory.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        ) : (
          /* hero — only shown before first message */
          <div className="mb-8 flex flex-col items-center gap-4">
            {/* icon mark */}
            <div className="relative">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: '#051A24' }}
              >
                <Sparkles size={24} color="white" strokeWidth={1.5} />
              </div>
              {/* subtle glow ring */}
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{ boxShadow: '0 0 0 6px rgba(5,26,36,0.06), 0 0 0 14px rgba(5,26,36,0.03)' }}
              />
            </div>

            <div className="text-center space-y-1">
              <p className="text-xl font-semibold text-[#051A24] tracking-tight">EstateFlow AI</p>
              <p className="text-sm text-[#051A24]/40">Your real estate growth agent</p>
            </div>

            {/* capability pills */}
            <div className="flex items-center gap-2 mt-1">
              {['Content planning', 'Video concepts', 'Analytics'].map((cap) => (
                <span
                  key={cap}
                  className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-[#051A24]/05 text-[#051A24]/50 border border-[#051A24]/08"
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* input card */}
        <div className="w-full max-w-xl relative z-10">
          {/* mention picker popover — center mode */}
          {showMentionPicker && filteredProperties.length > 0 && (
            <div className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-[#E8EDF0] rounded-xl shadow-lg overflow-hidden z-50">
              {filteredProperties.map((p) => (
                <button
                  key={p.id}
                  onMouseDown={(e) => { e.preventDefault(); selectMention(p); }}
                  className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[#F7F9FA] transition-colors"
                >
                  <span className="text-sm">🏠</span>
                  <span className="text-[12px] text-[#051A24]">{p.label}</span>
                </button>
              ))}
            </div>
          )}
          <div
            className="bg-white rounded-2xl border shadow-md px-4 py-3.5 flex flex-col gap-2 transition-shadow focus-within:shadow-lg"
            style={{ borderColor: '#E0E7EA' }}
          >
            {/* mention pill — center mode */}
            {mention && (
              <div className="flex items-center gap-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#051A24]/08 border border-[#051A24]/12 text-[10px] text-[#051A24]/70">
                  <span>🏠</span>
                  <span>{mention.label}</span>
                  <button
                    onClick={() => setMention(null)}
                    className="ml-0.5 text-[#051A24]/40 hover:text-[#051A24] transition-colors"
                  >
                    <X size={9} />
                  </button>
                </span>
              </div>
            )}
            <div className="flex items-end gap-3">
              <textarea
                ref={textareaRef}
                className="flex-1 text-sm text-[#051A24] placeholder-[#051A24]/30 resize-none outline-none bg-transparent leading-relaxed"
                placeholder="What do you want to work on today?"
                rows={1}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                style={{ minHeight: '24px', maxHeight: '140px' }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() && !mention}
                className="w-8 h-8 rounded-xl bg-[#051A24] flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-20 hover:opacity-75 active:scale-95 mb-0.5"
              >
                <Send size={13} color="white" />
              </button>
            </div>
          </div>

          {/* suggestion cards */}
          {!hasMessages && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => handleSend(s.label)}
                  className="group text-left px-3.5 py-3 rounded-xl bg-white border border-[#E8EDF0] hover:border-[#051A24]/20 hover:shadow-sm transition-all"
                >
                  <span className="text-base leading-none">{s.icon}</span>
                  <p className="text-[11px] font-medium text-[#051A24]/80 mt-1.5 leading-snug group-hover:text-[#051A24]">{s.label}</p>
                  <p className="text-[10px] text-[#051A24]/35 mt-0.5 leading-snug">{s.desc}</p>
                </button>
              ))}
            </div>
          )}

          <p className="text-[10px] text-[#051A24]/18 text-center mt-3">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    );
  }

  // ── SPLIT MODE (sidebar) ──────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col h-full w-full"
      style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#FAFBFC' }}
    >
      {/* header */}
      <div className="px-4 py-3 border-b flex items-center gap-2.5 bg-white" style={{ borderColor: '#E8EDF0' }}>
        <div className="w-7 h-7 rounded-full bg-[#051A24] flex items-center justify-center flex-shrink-0 shadow-sm">
          <Bot size={13} color="white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#051A24]">Growth Agent</p>
          <p className="text-[10px] text-[#051A24]/40 truncate">Focused on: {viewLabel}</p>
        </div>
        {autopilotActive ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-50 border border-amber-200">
              <Zap size={10} className="text-amber-600" />
              <span className="text-[10px] font-medium text-amber-700">Autopilot on</span>
              <span className="text-[10px] text-amber-600/60">{autopilotConceptsLeft} left</span>
            </div>
            <button
              onClick={stopAutopilot}
              className="text-[10px] text-[#051A24]/30 hover:text-[#051A24] transition-colors"
            >
              Stop
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-[#051A24]/30">Live</span>
          </div>
        )}
      </div>

      {/* messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {chatHistory.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      <div className="border-t px-3 py-3 bg-white relative" style={{ borderColor: '#E8EDF0' }}>
        {/* mention picker popover — split mode */}
        {showMentionPicker && filteredProperties.length > 0 && (
          <div className="absolute bottom-full mb-1 left-3 right-3 bg-white border border-[#E8EDF0] rounded-xl shadow-lg overflow-hidden z-50">
            {filteredProperties.map((p) => (
              <button
                key={p.id}
                onMouseDown={(e) => { e.preventDefault(); selectMention(p); }}
                className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[#F7F9FA] transition-colors"
              >
                <span className="text-sm">🏠</span>
                <span className="text-[11px] text-[#051A24]">{p.label}</span>
              </button>
            ))}
          </div>
        )}
        <div
          className="flex flex-col gap-1.5 bg-[#F7F9FA] rounded-xl border px-3 py-2 transition-shadow focus-within:shadow-sm focus-within:border-[#051A24]/20"
          style={{ borderColor: '#E8EDF0' }}
        >
          {/* mention pill — split mode */}
          {mention && (
            <span className="inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-full bg-[#051A24]/08 border border-[#051A24]/12 text-[10px] text-[#051A24]/70">
              <span>🏠</span>
              <span>{mention.label}</span>
              <button
                onClick={() => setMention(null)}
                className="ml-0.5 text-[#051A24]/40 hover:text-[#051A24] transition-colors"
              >
                <X size={9} />
              </button>
            </span>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              className="flex-1 text-sm text-[#051A24] placeholder-[#051A24]/30 resize-none outline-none bg-transparent leading-relaxed"
              placeholder="Ask your growth agent… (type @ to mention a property)"
              rows={1}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              style={{ minHeight: '22px', maxHeight: '120px' }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() && !mention}
              className="w-7 h-7 rounded-lg bg-[#051A24] flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-20 hover:opacity-75 active:scale-95 mb-0.5"
            >
              <Send size={11} color="white" />
            </button>
          </div>
        </div>

        {/* suggestion chips in sidebar */}
        {!hasMessages && (
          <div className="mt-2 flex flex-col gap-0.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => handleSend(s.label)}
                className="text-left text-[11px] px-2.5 py-1.5 rounded-lg text-[#051A24]/50 hover:text-[#051A24] hover:bg-[#E8EDF0]/60 transition-all flex items-center gap-2"
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        )}
        <p className="text-[10px] text-[#051A24]/20 text-center mt-1.5">Enter · Shift+Enter new line</p>
      </div>
    </div>
  );
}
