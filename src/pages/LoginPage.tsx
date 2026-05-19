import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { mockProfile } from '../data/profile';

export function LoginPage() {
  const navigate = useNavigate();
  const { setProfile, setOnboardingComplete, setAppMode, setLoggedIn } = useApp();
  const [entering, setEntering] = useState(false);
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // fade-in on mount
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleEnter = () => {
    if (entering) return;
    setEntering(true);
    // brief exit animation, then land on the full dashboard
    setTimeout(() => {
      setLoggedIn(true);
      setProfile(mockProfile);
      setOnboardingComplete(true);
      setAppMode('split');
      navigate('/app/calendar');
    }, 520);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEnter();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        fontFamily: 'Inter, sans-serif',
        background: 'linear-gradient(135deg, #0A1A22 0%, #0D2233 50%, #051A24 100%)',
        transition: 'opacity 0.5s ease',
        opacity: entering ? 0 : 1,
      }}
    >
      {/* subtle grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* ambient glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)' }}
      />

      {/* card */}
      <div
        className="relative flex flex-col items-center gap-7 px-10 py-12 rounded-3xl"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.6s cubic-bezier(0.23,1,0.32,1), opacity 0.6s ease',
          minWidth: 320,
        }}
      >
        {/* profile photo */}
        <div className="relative">
          <div
            className="w-24 h-24 rounded-full overflow-hidden"
            style={{
              boxShadow: '0 0 0 3px rgba(255,255,255,0.12), 0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <img
              src="/profile.jpg"
              alt="Emmanuel Landau"
              className="w-full h-full object-cover"
            />
          </div>
          {/* online dot */}
          <div
            className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-2"
            style={{ backgroundColor: '#22c55e', borderColor: '#0A1A22' }}
          />
        </div>

        {/* name + role */}
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold text-white tracking-tight">Emmanuel Landau</h1>
          <p className="text-sm text-white/40">EstateFlow AI · Growth Dashboard</p>
        </div>

        {/* enter button / input */}
        <div className="w-full space-y-3">
          {/* invisible focus trap so Enter key works immediately */}
          <input
            ref={inputRef}
            type="text"
            className="sr-only"
            onKeyDown={handleKey}
            autoFocus
            readOnly
          />

          <button
            onClick={handleEnter}
            disabled={entering}
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl text-sm font-medium transition-all duration-200 group"
            style={{
              background: entering
                ? 'rgba(255,255,255,0.06)'
                : 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.14)',
              color: 'rgba(255,255,255,0.9)',
            }}
            onMouseEnter={(e) => {
              if (!entering) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.16)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = entering
                ? 'rgba(255,255,255,0.06)'
                : 'rgba(255,255,255,0.10)';
            }}
          >
            {entering ? (
              <span className="text-white/40">Opening dashboard…</span>
            ) : (
              <>
                Enter dashboard
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-200" />
              </>
            )}
          </button>

          <p className="text-center text-[11px] text-white/20">Press Enter to continue</p>
        </div>
      </div>

      {/* bottom wordmark */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <span className="text-[11px] text-white/15 tracking-widest uppercase">EstateFlow AI</span>
      </div>
    </div>
  );
}
