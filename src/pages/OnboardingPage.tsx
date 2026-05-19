import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { mockProfile } from '../data/profile';
import type { AgentProfile } from '../types';

const STEPS = [
  'Business Info',
  'Goals',
  'Audience',
  'Content Prefs',
  'Assets',
  'Your Profile',
];

const PROPERTY_SEGMENTS = [
  'Family apartments', 'Investment properties', 'Luxury homes',
  'Student housing', 'New developments', 'Commercial real estate', 'Rentals',
];

const GOALS = [
  'Get more seller leads', 'Get more buyer leads', 'Promote listings',
  'Build local authority', 'Grow Instagram/TikTok presence', 'Retarget warm leads', 'Increase brand awareness',
];

const AUDIENCES = [
  'Sellers', 'Buyers', 'Investors', 'Renters', 'Landlords',
  'First-time buyers', 'Luxury clients', 'Students', 'Families',
];

const PLATFORMS = ['Instagram', 'TikTok', 'YouTube Shorts', 'Facebook', 'LinkedIn'];

const ASSETS = [
  'Website', 'CRM', 'Instagram account', 'Property photos',
  'Property videos', 'Customer testimonials', 'Brand logo', 'Local market reports',
];

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="flex-1 h-1 rounded-full transition-all duration-300"
          style={{ backgroundColor: i <= step ? '#051A24' : '#E8EDF0' }}
        />
      ))}
    </div>
  );
}

function CheckItem({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all duration-150 w-full ${
        checked
          ? 'border-[#051A24] bg-[#051A24] text-white'
          : 'border-[#E8EDF0] bg-white text-[#051A24]/70 hover:border-[#051A24]/30'
      }`}
    >
      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${checked ? 'border-white bg-white' : 'border-current'}`}>
        {checked && <div className="w-2 h-2 rounded-sm bg-[#051A24]" />}
      </div>
      {label}
    </button>
  );
}

function RadioItem({ label, checked, onSelect }: { label: string; checked: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all duration-150 w-full ${
        checked
          ? 'border-[#051A24] bg-[#051A24] text-white'
          : 'border-[#E8EDF0] bg-white text-[#051A24]/70 hover:border-[#051A24]/30'
      }`}
    >
      <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${checked ? 'border-white' : 'border-current'}`}>
        {checked && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>
      {label}
    </button>
  );
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const { setProfile, setOnboardingComplete, setAppMode, triggerOnboardingFlow } = useApp();

  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  const [businessName, setBusinessName] = useState('');
  const [city, setCity] = useState('');
  const [segments, setSegments] = useState<string[]>([]);
  const [primaryGoal, setPrimaryGoal] = useState('');
  const [secondaryGoal, setSecondaryGoal] = useState('');
  const [audiences, setAudiences] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [frequency, setFrequency] = useState('');
  const [willingToFilm, setWillingToFilm] = useState<boolean | null>(null);
  const [assets, setAssets] = useState<string[]>([]);

  const toggle = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  const handleGenerate = () => {
    setStep(5);
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setDone(true);
      setProfile(mockProfile);
    }, 2200);
  };

  const handleEnterDashboard = () => {
    setOnboardingComplete(true);
    setAppMode('home');
    navigate('/app');
    setTimeout(() => triggerOnboardingFlow(), 150);
  };

  return (
    <div className="min-h-screen bg-[#F7F9FA] flex items-center justify-center px-4 py-12" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="w-full max-w-lg">
        <div className="mb-6">
          <span className="text-[#051A24] text-lg font-semibold">EstateFlow AI</span>
          <p className="text-sm text-[#051A24]/50 mt-0.5">{STEPS[step]}</p>
        </div>

        <ProgressBar step={step} total={STEPS.length} />

        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-medium text-[#051A24]">Tell us about your business</h2>
            <p className="text-sm text-[#051A24]/50">We will use this to tailor your content strategy.</p>
            <input
              className="w-full px-4 py-3 rounded-xl border border-[#E8EDF0] bg-white text-sm text-[#051A24] placeholder-[#051A24]/30 outline-none focus:border-[#051A24]/40"
              placeholder="Agency or agent name (e.g. Dumont Immobilier)"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
            <input
              className="w-full px-4 py-3 rounded-xl border border-[#E8EDF0] bg-white text-sm text-[#051A24] placeholder-[#051A24]/30 outline-none focus:border-[#051A24]/40"
              placeholder="City and neighborhood (e.g. Paris 15th)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <p className="text-xs text-[#051A24]/40 pt-1">Property segments you focus on:</p>
            <div className="grid grid-cols-2 gap-2">
              {PROPERTY_SEGMENTS.map((s) => (
                <CheckItem key={s} label={s} checked={segments.includes(s)} onToggle={() => toggle(segments, setSegments, s)} />
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-medium text-[#051A24]">What are your main goals?</h2>
            <p className="text-sm text-[#051A24]/50">Select your primary goal, then your secondary goal.</p>
            <p className="text-xs font-medium text-[#051A24]/60">Primary goal</p>
            <div className="grid grid-cols-1 gap-2">
              {GOALS.map((g) => (
                <RadioItem key={g} label={g} checked={primaryGoal === g} onSelect={() => setPrimaryGoal(g)} />
              ))}
            </div>
            <p className="text-xs font-medium text-[#051A24]/60 pt-2">Secondary goal</p>
            <div className="grid grid-cols-1 gap-2">
              {GOALS.filter((g) => g !== primaryGoal).map((g) => (
                <RadioItem key={g} label={g} checked={secondaryGoal === g} onSelect={() => setSecondaryGoal(g)} />
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-medium text-[#051A24]">Who are you targeting?</h2>
            <p className="text-sm text-[#051A24]/50">Select all audiences that apply to your business.</p>
            <div className="grid grid-cols-2 gap-2">
              {AUDIENCES.map((a) => (
                <CheckItem key={a} label={a} checked={audiences.includes(a)} onToggle={() => toggle(audiences, setAudiences, a)} />
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-medium text-[#051A24]">Content preferences</h2>
            <p className="text-sm text-[#051A24]/50">This shapes your content calendar volume and platform mix.</p>
            <p className="text-xs font-medium text-[#051A24]/60">Platforms</p>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORMS.map((p) => (
                <CheckItem key={p} label={p} checked={platforms.includes(p)} onToggle={() => toggle(platforms, setPlatforms, p)} />
              ))}
            </div>
            <p className="text-xs font-medium text-[#051A24]/60 pt-2">Posting frequency</p>
            <div className="grid grid-cols-3 gap-2">
              {[['high', '~3/day'], ['medium', '~5/week'], ['low', '~1/week']].map(([val, label]) => (
                <RadioItem key={val} label={label} checked={frequency === val} onSelect={() => setFrequency(val)} />
              ))}
            </div>
            <p className="text-xs font-medium text-[#051A24]/60 pt-2">Are you willing to appear on camera?</p>
            <div className="grid grid-cols-2 gap-2">
              <RadioItem label="Yes" checked={willingToFilm === true} onSelect={() => setWillingToFilm(true)} />
              <RadioItem label="No — AI avatar" checked={willingToFilm === false} onSelect={() => setWillingToFilm(false)} />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-medium text-[#051A24]">What assets do you have?</h2>
            <p className="text-sm text-[#051A24]/50">The more assets available, the richer your content output.</p>
            <div className="grid grid-cols-2 gap-2">
              {ASSETS.map((a) => (
                <CheckItem key={a} label={a} checked={assets.includes(a)} onToggle={() => toggle(assets, setAssets, a)} />
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            {generating && (
              <div className="flex flex-col items-center gap-4 py-12">
                <Loader2 size={32} className="animate-spin text-[#051A24]" />
                <p className="text-sm text-[#051A24]/60">Generating your growth profile…</p>
                <p className="text-xs text-[#051A24]/30">Analyzing market, goals, and content opportunities</p>
              </div>
            )}
            {done && (
              <div className="space-y-5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-green-600" />
                  <h2 className="text-xl font-medium text-[#051A24]">Your profile is ready</h2>
                </div>
                <div className="bg-white rounded-2xl border border-[#E8EDF0] p-5 space-y-3">
                  <div>
                    <p className="text-xs text-[#051A24]/40 uppercase tracking-widest mb-1">Business</p>
                    <p className="text-sm font-medium text-[#051A24]">{mockProfile.business_name}</p>
                    <p className="text-xs text-[#051A24]/50">{mockProfile.location}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#051A24]/40 uppercase tracking-widest mb-1">Primary Goal</p>
                    <p className="text-sm text-[#051A24]">{mockProfile.primary_goal}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#051A24]/40 uppercase tracking-widest mb-1">Target Audiences</p>
                    <div className="flex flex-wrap gap-1.5">
                      {mockProfile.target_audiences.map((a) => (
                        <span key={a} className="px-2 py-0.5 bg-[#051A24]/5 rounded-full text-xs text-[#051A24]/70">{a}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-[#051A24]/40 uppercase tracking-widest mb-1">Platforms</p>
                    <div className="flex flex-wrap gap-1.5">
                      {mockProfile.platforms.map((p) => (
                        <span key={p} className="px-2 py-0.5 bg-[#051A24]/5 rounded-full text-xs text-[#051A24]/70">{p}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-[#051A24]/40 uppercase tracking-widest mb-1">Brand Tone</p>
                    <p className="text-xs text-[#051A24]/60 italic">{mockProfile.brand_tone}</p>
                  </div>
                </div>
                <button
                  onClick={handleEnterDashboard}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-[#051A24] text-white text-sm font-medium hover:opacity-80 transition-opacity"
                >
                  Enter your dashboard
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
          </div>
        )}

        {step < 5 && (
          <div className="flex items-center justify-between mt-8">
            {step > 0 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="text-sm text-[#051A24]/40 hover:text-[#051A24] transition-colors"
              >
                Back
              </button>
            ) : <div />}
            <button
              onClick={step === 4 ? handleGenerate : () => setStep((s) => s + 1)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#051A24] text-white text-sm font-medium hover:opacity-80 transition-opacity"
            >
              {step === 4 ? 'Generate my profile' : 'Continue'}
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
