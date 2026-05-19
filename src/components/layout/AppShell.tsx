import { useState, useRef, useCallback } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ChatPanel } from './ChatPanel';
import { TopNav } from './TopNav';
import { CalendarPage } from '../../pages/CalendarPage';
import { OrganicStrategyPage } from '../../pages/OrganicStrategyPage';
import { PaidStrategyPage } from '../../pages/PaidStrategyPage';
import { AnalyticsPage } from '../../pages/AnalyticsPage';
import { VideoAgentPage } from '../../pages/VideoAgentPage';
import { AssetsPage } from '../../pages/AssetsPage';

const MIN_CHAT_WIDTH = 260;
const MAX_CHAT_WIDTH = 660;
const DEFAULT_CHAT_WIDTH = 400;

function RightPanel() {
  const { activeView } = useApp();
  if (typeof activeView === 'object' && activeView.type === 'video') {
    return <VideoAgentPage contentItemId={activeView.contentItemId} />;
  }
  switch (activeView) {
    case 'calendar':          return <CalendarPage />;
    case 'strategy/organic':  return <OrganicStrategyPage />;
    case 'strategy/paid':     return <PaidStrategyPage />;
    case 'analytics':         return <AnalyticsPage />;
    case 'assets':            return <AssetsPage />;
    default:                  return <CalendarPage />;
  }
}

export function AppShell() {
  const { appMode, setAppMode, loggedIn } = useApp();

  if (!loggedIn) return <Navigate to="/app" replace />;
  const [chatWidth, setChatWidth] = useState(DEFAULT_CHAT_WIDTH);
  const [rightVisible, setRightVisible] = useState(true);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(DEFAULT_CHAT_WIDTH);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = chatWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const delta = ev.clientX - startX.current;
      const next = Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, startWidth.current + delta));
      setChatWidth(next);
    };

    const onMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [chatWidth]);

  // Home mode: centered chat, no right panel
  if (appMode === 'home') {
    return (
      <div className="h-screen overflow-hidden bg-[#F7F9FA] flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
        <ChatPanel centerMode />
      </div>
    );
  }

  // Split mode: resizable chat + right panel
  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F9FA]" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Chat column */}
      <div style={{ width: chatWidth, minWidth: chatWidth, flexShrink: 0 }} className="flex flex-col h-full">
        <ChatPanel />
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        className="w-1 flex-shrink-0 relative group cursor-col-resize z-10"
        style={{ backgroundColor: '#E8EDF0' }}
      >
        <div className="absolute inset-y-0 -left-1.5 -right-1.5 group-hover:bg-[#051A24]/8 transition-colors" />
      </div>

      {/* Right panel — slides in when revealed */}
      {rightVisible && (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden animate-slideInRight">
          <div className="flex items-center border-b bg-white" style={{ borderColor: '#E8EDF0' }}>
            <button
              onClick={() => setRightVisible(false)}
              className="flex-shrink-0 px-3 py-3 text-[#051A24]/30 hover:text-[#051A24] hover:bg-[#F7F9FA] transition-all"
              title="Hide panel"
            >
              <PanelLeftClose size={15} strokeWidth={1.8} />
            </button>
            <div className="w-px self-stretch" style={{ backgroundColor: '#E8EDF0' }} />
            <div className="flex-1"><TopNav /></div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <RightPanel />
          </div>
        </div>
      )}

      {/* Restore button when right panel is hidden */}
      {!rightVisible && (
        <button
          onClick={() => setRightVisible(true)}
          className="flex-shrink-0 flex items-center justify-center w-8 h-screen text-[#051A24]/30 hover:text-[#051A24] hover:bg-white/60 transition-all border-l"
          style={{ borderColor: '#E8EDF0' }}
          title="Show panel"
        >
          <PanelLeftOpen size={15} strokeWidth={1.8} />
        </button>
      )}
    </div>
  );
}
