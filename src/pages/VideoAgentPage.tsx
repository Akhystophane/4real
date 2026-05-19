import { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, Play, Pause, Wand2, FileText, Download, Video, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  createJob, startJob, getJobStatus, uploadAudio,
  initStoryboard, getJobStoryboard, finalizeStoryboard, submitReviewWithStoryboard,
  queueRender, getRenderVersions, fetchProposalMapping, submitDomainReview,
} from '../lib/pyramid';
import type { DomainMapping, DomainAsset } from '../lib/pyramid';
import type { PoolAsset } from '../components/video/AssetPoolPanel';
import { AssetPoolPanel } from '../components/video/AssetPoolPanel';

interface Props {
  contentItemId?: string;
}

type VoiceoverStatus = 'idle' | 'generating' | 'done' | 'error';

type PipelineStage =
  | 'idle'
  | 'creating_job'
  | 'uploading'
  | 'processing'      // waiting for AWAITING_REVIEW
  | 'storyboard'      // init + finalize storyboard
  | 'composing'       // compose_post (AWAITING_REVIEW → submit review → wait)
  | 'rendering'       // queueRender + polling
  | 'done'
  | 'error';

interface PipelineStep {
  id: PipelineStage;
  label: string;
}

const STEPS: PipelineStep[] = [
  { id: 'uploading',   label: 'Uploading audio' },
  { id: 'processing',  label: 'Composing pre' },
  { id: 'storyboard',  label: 'Building storyboard' },
  { id: 'composing',   label: 'Composing post' },
  { id: 'rendering',   label: 'Rendering video' },
];

const STEP_ORDER: PipelineStage[] = ['idle', 'creating_job', 'uploading', 'processing', 'storyboard', 'composing', 'rendering', 'done', 'error'];

function stageIndex(s: PipelineStage) { return STEP_ORDER.indexOf(s); }

function isVideoFile(key: string) {
  return ['.mp4', '.webm', '.mov', '.m4v'].some((ext) => key.toLowerCase().endsWith(ext));
}

function getVideoUrl(render: { s3_key: string; url: string }) {
  if (render.url && !render.url.includes('s3%3A')) return render.url;
  const m = render.s3_key.match(/^s3:\/\/([^/]+)\/(.+)$/);
  if (m) return `https://${m[1]}.s3.amazonaws.com/${m[2]}`;
  return render.url;
}

export function VideoAgentPage({ contentItemId }: Props) {
  const { calendarItems, scripts, setScript, sendMessage, assets, poolAssets, clearPoolAssets, triggerAssetAgent } = useApp();

  const item = calendarItems.find((i) => i.id === contentItemId) ?? calendarItems[0];
  const script = item ? scripts[item.id] : undefined;

  // ── Voice-over state ──────────────────────────────────────────────────────
  const [scriptGenerating, setScriptGenerating] = useState(false);
  const [voiceoverStatus, setVoiceoverStatus] = useState<VoiceoverStatus>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── Pipeline state ────────────────────────────────────────────────────────
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>('idle');
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [statusLabel, setStatusLabel] = useState<string>('');
  const [pipelineProgress, setPipelineProgress] = useState<number | null>(null);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  // ── Asset review pause point ───────────────────────────────────────────────
  const [proposalUrl, setProposalUrl] = useState<string | null>(null);
  const [domainMapping, setDomainMapping] = useState<DomainMapping | null>(null);
  const domainMappingRef = useRef<DomainMapping | null>(null);
  useEffect(() => { domainMappingRef.current = domainMapping; }, [domainMapping]);
  const [domainLoading, setDomainLoading] = useState(false);
  const resumePipelineRef = useRef<(() => Promise<void>) | null>(null);

  // Local editable copy of the script — syncs from context when context changes
  const [editedScript, setEditedScript] = useState(script ?? '');
  const prevScriptRef = useRef(script);
  useEffect(() => {
    if (script !== prevScriptRef.current) {
      prevScriptRef.current = script;
      setEditedScript(script ?? '');
    }
  }, [script]);

  const raw = item as unknown as Record<string, unknown>;
  const hook      = item?.recipe?.hook      ?? raw?.hook as string      ?? '';
  const structure = item?.recipe?.structure ?? raw?.structure as string[] ?? [];
  const cta       = item?.recipe?.cta       ?? raw?.cta as string       ?? '';


  // Revoke blob URLs on unmount
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // Map PoolAssetKind → which domain category list it belongs in
  const kindToDomainCategory = (kind: PoolAsset['kind']): { category: keyof DomainMapping; listKey: string } => {
    switch (kind) {
      case 'logo':     return { category: 'logo',    listKey: 'available_logos' };
      case 'video':
      case 'photo':
      case 'audio':
      case 'document': return { category: 'footage', listKey: 'available_footage' };
    }
  };

  const mergeAssetIntoDomain = useCallback((asset: PoolAsset) => {
    const { category, listKey } = kindToDomainCategory(asset.kind);
    const domainAsset: DomainAsset = {
      id: asset.id,
      description: asset.label,
      path: asset.thumbnail ?? '',
      source: asset.source === 'library' ? 'library' : 'generated',
    };
    setDomainMapping(prev => {
      if (!prev) return prev;
      const cat = (prev[category] ?? {}) as Record<string, unknown>;
      const existing = (cat[listKey] as DomainAsset[] | undefined) ?? [];
      if (existing.some(a => a.id === domainAsset.id)) return prev;
      return {
        ...prev,
        [category]: { ...cat, [listKey]: [...existing, domainAsset] },
      };
    });
  }, []);

  // Fetch domain mapping + trigger asset agent when proposal URL is available
  const assetAgentTriggeredRef = useRef(false);
  useEffect(() => {
    if (!proposalUrl || assetAgentTriggeredRef.current) return;
    assetAgentTriggeredRef.current = true;
    clearPoolAssets();
    setDomainLoading(true);
    fetchProposalMapping(proposalUrl)
      .then(m => setDomainMapping(m))
      .catch(() => setDomainMapping(null))
      .finally(() => setDomainLoading(false));
    if (item) {
      triggerAssetAgent(
        item.required_assets ?? [],
        { title: item.title, format: item.format, pillar: item.pillar },
        jobId!,
        mergeAssetIntoDomain,
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalUrl]);

  // ── Voiceover generation ──────────────────────────────────────────────────
  const handleGenerateScript = () => {
    if (!item) return;
    sendMessage(
      `Generate the voice-over script for the video "${item.title}". Item id: ${item.id}. Format: ${item.format}. Hook: "${hook}". Structure: ${structure.join(', ')}. CTA: "${cta}". Write it in English.`
    );
  };

  const handleGenerateVoiceover = async () => {
    if (!editedScript || !item) return;
    setVoiceoverStatus('generating');
    try {
      const resp = await fetch('/api/voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: editedScript, itemId: item.id }),
      });
      if (!resp.ok) throw new Error(`Server error ${resp.status}`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      setAudioBlob(blob);
      setAudioUrl(url);
      setVoiceoverStatus('done');
    } catch (err) {
      console.error(err);
      setVoiceoverStatus('error');
    }
  };

  // ── Audio player controls ─────────────────────────────────────────────────
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleEnded = () => { setPlaying(false); setProgress(0); };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  // ── Pyramid pipeline ──────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const pollForRenderVersions = useCallback(async (jId: string, startCount: number) => {
    stopPolling();
    pollRef.current = window.setInterval(async () => {
      try {
        const statusData = await getJobStatus(jId);
        setPipelineProgress(statusData.progress ?? null);
        if (statusData.step_detail) setStatusLabel(statusData.step_detail);

        if (statusData.status === 'FAILED') {
          stopPolling();
          setPipelineError(statusData.error?.detail ?? statusData.error?.code ?? 'Render failed');
          setPipelineStage('error');
          return;
        }

        const rendersData = await getRenderVersions(jId).catch(() => ({ job_id: jId, versions: [] }));
        const allRenders = rendersData.versions.flatMap((v) => v.renders);
        const videos = allRenders.filter((r) => isVideoFile(r.s3_key)).map(getVideoUrl);

        if (videos.length > startCount) {
          stopPolling();
          setVideoUrls(videos);
          setPipelineStage('done');
        }
      } catch (err) {
        stopPolling();
        setPipelineError(err instanceof Error ? err.message : String(err));
        setPipelineStage('error');
      }
    }, 3000);
  }, [stopPolling]);

  const pollUntilReview = useCallback(async (jId: string): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      stopPolling();
      pollRef.current = window.setInterval(async () => {
        try {
          const data = await getJobStatus(jId);
          setPipelineProgress(data.progress ?? null);
          if (data.step_detail) setStatusLabel(data.step_detail);

          if (data.status === 'FAILED') {
            stopPolling();
            reject(new Error(data.error?.detail ?? data.error?.code ?? 'Job failed'));
            return;
          }
          if (data.status === 'AWAITING_REVIEW') {
            stopPolling();
            resolve(data.next_action?.proposal_url ?? null);
          }
        } catch (err) {
          stopPolling();
          reject(err);
        }
      }, 3000);
    });
  }, [stopPolling]);

  const handleGenerateVideo = useCallback(async () => {
    if (!item) return;

    if (!audioBlob) return;

    setPipelineStage('creating_job');
    setPipelineError(null);
    setPipelineProgress(null);
    setStatusLabel('Creating job…');

    try {
      // 1. Create job & get presigned upload URL
      const suffix = Math.random().toString(36).slice(2, 7);
      const safeTitle = (item.title
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9\-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 30) || 'video') + '-' + suffix;
      const jobResp = await createJob(safeTitle);
      const jId = jobResp.job_id;
      setJobId(jId);

      if (!jobResp.upload_url || !jobResp.upload_fields || !jobResp.input_s3_key) {
        throw new Error('No upload URL returned from pyramid');
      }

      // 2. Upload voice-over audio to S3
      setPipelineStage('uploading');
      setStatusLabel('Uploading audio to S3…');
      await uploadAudio(jobResp.upload_url, jobResp.upload_fields, audioBlob);

      // 3. Start the job (compose_pre)
      setPipelineStage('processing');
      setStatusLabel('Running compose pre…');
      await startJob(jId, jobResp.input_s3_key);

      // 4. Poll until AWAITING_REVIEW — returns proposal_url
      const proposalUrl = await pollUntilReview(jId);
      if (proposalUrl) setProposalUrl(proposalUrl);

      // 4b. Pause for asset review — submit domain mapping when user clicks Continue
      await new Promise<void>((resolve) => {
        resumePipelineRef.current = async () => {
          if (domainMappingRef.current) {
            await submitDomainReview(jId, domainMappingRef.current).catch(() => {});
          }
          resolve();
        };
      });

      // 5. Init storyboard (may return 202 — poll until exists)
      setPipelineStage('storyboard');
      setStatusLabel('Initialising storyboard…');
      await initStoryboard(jId);

      // Poll GET /jobs/{id}/storyboard until exists: true
      const sessionId = await new Promise<string>((resolve, reject) => {
        const id = window.setInterval(async () => {
          try {
            const sb = await getJobStoryboard(jId);
            if (sb.exists && sb.session_id) {
              clearInterval(id);
              resolve(sb.session_id);
            }
          } catch (err) {
            clearInterval(id);
            reject(err);
          }
        }, 3000);
      });

      // 6. Finalize storyboard immediately (auto-mode, no manual review)
      setStatusLabel('Finalising storyboard…');
      const finalResp = await finalizeStoryboard(sessionId);
      const storyboardKey = finalResp.storyboard_key;

      // 7. Submit review (triggers compose_post)
      setPipelineStage('composing');
      setStatusLabel('Running compose post…');
      await submitReviewWithStoryboard(jId, storyboardKey);

      // 8. Queue render
      setPipelineStage('rendering');
      setStatusLabel('Rendering video…');
      await queueRender(jId);

      // 9. Poll for render completion
      await pollForRenderVersions(jId, 0);
    } catch (err) {
      stopPolling();
      setPipelineError(err instanceof Error ? err.message : String(err));
      setPipelineStage('error');
    }
  }, [audioBlob, item, pollUntilReview, pollForRenderVersions, stopPolling]);

  // ── Step indicator ────────────────────────────────────────────────────────
  function StepRow({ step }: { step: PipelineStep }) {
    const currentIdx = stageIndex(pipelineStage);
    const stepIdx = stageIndex(step.id);
    const isDone = currentIdx > stepIdx && pipelineStage !== 'error';
    const isActive = currentIdx === stepIdx || (step.id === 'rendering' && pipelineStage === 'done');
    const isFailed = pipelineStage === 'error' && currentIdx === stepIdx;

    return (
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {isDone ? (
            <CheckCircle2 size={16} className="text-emerald-500" />
          ) : isFailed ? (
            <AlertCircle size={16} className="text-red-400" />
          ) : isActive ? (
            <Loader2 size={16} className="animate-spin text-[#051A24]" />
          ) : (
            <Circle size={16} className="text-[#051A24]/20" />
          )}
        </div>
        <p className={`text-xs ${isDone ? 'text-[#051A24]/60' : isActive ? 'text-[#051A24] font-medium' : 'text-[#051A24]/30'}`}>
          {step.label}
          {isActive && statusLabel && ` — ${statusLabel}`}
          {isActive && pipelineProgress != null && ` (${Math.round(pipelineProgress * 100)}%)`}
        </p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-6 text-sm text-[#051A24]/40" style={{ fontFamily: 'Inter, sans-serif' }}>
        No content item selected.
      </div>
    );
  }

  const pipelineActive = pipelineStage !== 'idle' && pipelineStage !== 'done' && pipelineStage !== 'error';
  const showAssetPool = !!proposalUrl || domainLoading || domainMapping !== null || poolAssets.length > 0;

  return (
    <div className="flex h-full" style={{ fontFamily: 'Inter, sans-serif' }}>
    {/* Production steps */}
    <div className={`overflow-y-auto flex-shrink-0 ${showAssetPool ? 'w-1/2 border-r border-[#E8EDF0]' : 'w-full'}`}>
    <div className="p-6 max-w-2xl" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs text-[#051A24]/40 uppercase tracking-widest mb-1">Video Production</p>
        <h1 className="text-xl font-medium text-[#051A24] leading-snug">{item.title}</h1>
      </div>

      {/* Brief */}
      <div className="bg-white rounded-2xl border border-[#E8EDF0] p-5 mb-4">
        <p className="text-[10px] text-[#051A24]/40 uppercase tracking-widest mb-3">Brief</p>
        <div className="grid grid-cols-2 gap-3">
          {([['Format', item.format], ['Target', item.target_audience], ['Objective', item.objective], ['Channel', item.channel]] as [string, string][]).map(([label, val]) => (
            <div key={label}>
              <p className="text-[10px] text-[#051A24]/30 uppercase tracking-widest">{label}</p>
              <p className="text-xs text-[#051A24] capitalize mt-0.5">{val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Assets */}
      <div className="bg-white rounded-2xl border border-[#E8EDF0] overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-[#E8EDF0]">
          <p className="text-sm font-medium text-[#051A24]">Required Assets</p>
        </div>
        <div className="divide-y divide-[#E8EDF0]">
          {(item.required_assets ?? []).map((asset, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <div className="w-[15px] h-[15px] rounded-full border-2 border-[#E8EDF0] flex-shrink-0" />
              <p className="text-xs text-[#051A24]">{asset}</p>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-slate-50 text-slate-500">needed</span>
            </div>
          ))}
        </div>
      </div>

      {/* Script */}
      <div className="bg-white rounded-2xl border border-[#E8EDF0] overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-[#E8EDF0] flex items-center justify-between">
          <p className="text-sm font-medium text-[#051A24]">Voice-Over Script</p>
          <button
            onClick={handleGenerateScript}
            disabled={scriptGenerating}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-[#051A24] text-white hover:opacity-80 transition-opacity disabled:opacity-50"
          >
            {scriptGenerating ? <Loader2 size={11} className="animate-spin" /> : <Wand2 size={11} />}
            {scriptGenerating ? 'Writing…' : script ? 'Regenerate' : 'Generate'}
          </button>
        </div>

        {!script && !scriptGenerating ? (
          <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
            <FileText size={28} className="text-[#051A24]/10" />
            <p className="text-xs text-[#051A24]/30">Click Generate to write the spoken script</p>
          </div>
        ) : (
          <div className="px-5 py-4">
            {scriptGenerating ? (
              <div className="text-sm text-[#051A24] leading-relaxed min-h-[12rem]">
                {editedScript}<span className="inline-block w-[2px] h-[1em] bg-[#051A24]/60 ml-[1px] align-middle animate-pulse" />
              </div>
            ) : (
              <textarea
                value={editedScript}
                onChange={(e) => setEditedScript(e.target.value)}
                rows={8}
                className="w-full text-sm text-[#051A24] leading-relaxed bg-transparent resize-none outline-none focus:ring-1 focus:ring-[#051A24]/20 rounded-lg p-1 -m-1 transition-shadow"
                placeholder="Script will appear here…"
              />
            )}
            <p className="text-[10px] text-[#051A24]/25 mt-2 text-right">
              {editedScript.trim().split(/\s+/).filter(Boolean).length} words
            </p>
          </div>
        )}
      </div>

      {/* Voice-over */}
      <div className="bg-white rounded-2xl border border-[#E8EDF0] p-5 mb-4">
        <p className="text-sm font-medium text-[#051A24] mb-4">Voice-Over</p>

        {voiceoverStatus === 'idle' && (
          <button
            onClick={handleGenerateVoiceover}
            disabled={!editedScript.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#051A24] text-white text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-25"
          >
            Generate voice-over
          </button>
        )}

        {voiceoverStatus === 'generating' && (
          <div className="flex items-center gap-3 py-2">
            <Loader2 size={16} className="animate-spin text-[#051A24]" />
            <p className="text-sm text-[#051A24]/60">Generating voice-over…</p>
          </div>
        )}

        {voiceoverStatus === 'error' && (
          <div className="flex items-center gap-3">
            <p className="text-sm text-red-500">Generation failed.</p>
            <button onClick={handleGenerateVoiceover} className="text-xs text-[#051A24]/50 underline">Retry</button>
          </div>
        )}

        {voiceoverStatus === 'done' && audioUrl && (
          <div className="space-y-3">
            <audio
              ref={audioRef}
              src={audioUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
            />
            <div className="flex items-center gap-3 bg-[#F7F9FA] rounded-xl px-4 py-3">
              <button
                onClick={togglePlay}
                className="w-8 h-8 rounded-full bg-[#051A24] text-white flex items-center justify-center hover:opacity-80 transition-opacity flex-shrink-0"
              >
                {playing ? <Pause size={12} fill="white" /> : <Play size={12} fill="white" className="ml-0.5" />}
              </button>
              <div className="flex-1 flex flex-col gap-1">
                <div className="h-8 flex items-center gap-[2px] cursor-pointer" onClick={handleSeek}>
                  {Array.from({ length: 48 }).map((_, i) => {
                    const filled = i / 48 < progress;
                    return (
                      <div
                        key={i}
                        className={`flex-1 rounded-full transition-colors ${filled ? 'bg-[#051A24]' : 'bg-[#051A24]/15'}`}
                        style={{ height: `${16 + Math.sin(i * 0.7) * 9 + Math.sin(i * 1.9) * 4}px` }}
                      />
                    );
                  })}
                </div>
              </div>
              <span className="text-xs text-[#051A24]/40 flex-shrink-0 tabular-nums">
                {fmt(duration > 0 ? progress * duration : 0)} / {fmt(duration)}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleGenerateVoiceover}
                className="flex items-center gap-1.5 text-[11px] text-[#051A24]/40 hover:text-[#051A24] transition-colors"
              >
                <Wand2 size={10} /> Regenerate
              </button>
              <a
                href={audioUrl}
                download={`voiceover-${item.id}.mp3`}
                className="flex items-center gap-1.5 text-[11px] text-[#051A24]/40 hover:text-[#051A24] transition-colors"
              >
                <Download size={10} /> Download MP3
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Video Generation */}
      {voiceoverStatus === 'done' && (
        <div className="bg-white rounded-2xl border border-[#E8EDF0] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-[#051A24]">Video Generation</p>
            {pipelineStage === 'idle' && (
              <button
                onClick={handleGenerateVideo}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-[#051A24] text-white hover:opacity-80 transition-opacity"
              >
                <Video size={11} /> Generate video
              </button>
            )}
            {pipelineStage === 'error' && (
              <button
                onClick={handleGenerateVideo}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
              >
                Retry
              </button>
            )}
          </div>

          {pipelineStage === 'idle' && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Video size={28} className="text-[#051A24]/10" />
              <p className="text-xs text-[#051A24]/30">Click Generate video to run the full pipeline</p>
            </div>
          )}

          {(pipelineActive || pipelineStage === 'error') && (
            <div className="space-y-3 py-2">
              {STEPS.map((step) => <StepRow key={step.id} step={step} />)}
              {pipelineError && (
                <div className="mt-3 bg-red-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-red-500">{pipelineError}</p>
                  {jobId && <p className="text-[10px] text-red-400/60 mt-1 font-mono">Job: {jobId}</p>}
                </div>
              )}
            </div>
          )}

          {pipelineStage === 'done' && videoUrls.length > 0 && (
            <div className="space-y-4">
              <div className="space-y-3">
                {STEPS.map((step) => <StepRow key={step.id} step={step} />)}
              </div>
              <div className="mt-4 space-y-3">
                {videoUrls.map((url, i) => (
                  <div key={i} className="rounded-xl overflow-hidden border border-[#E8EDF0]">
                    <div className="aspect-video bg-black">
                      <video src={url} controls className="w-full h-full" preload="metadata" crossOrigin="anonymous" />
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 bg-[#F7F9FA]">
                      <span className="text-xs text-[#051A24]/40">Video {videoUrls.length > 1 ? i + 1 : ''}</span>
                      <div className="flex items-center gap-3">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-[#051A24]/40 hover:text-[#051A24] transition-colors"
                        >
                          Open
                        </a>
                        <a
                          href={url}
                          download={`video-${item.id}-${i + 1}.mp4`}
                          className="flex items-center gap-1 text-[11px] text-[#051A24]/40 hover:text-[#051A24] transition-colors"
                        >
                          <Download size={10} /> Download
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </div>

    {/* Asset pool — right side, always mounted when active */}
    {showAssetPool && (
      <div className="flex-1 flex flex-col h-full overflow-hidden border-l border-[#E8EDF0]">
        <AssetPoolPanel
          domainMapping={domainMapping}
          domainLoading={domainLoading}
          agentAssets={poolAssets}
          onRemoveAgentAsset={() => {}}
          onContinue={() => resumePipelineRef.current?.()}
          continueDisabled={domainLoading}
        />
      </div>
    )}
    </div>
  );
}
