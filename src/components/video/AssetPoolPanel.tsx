import { useRef, useState } from 'react';
import { Loader2, Image, Video, Music, FileText, Wand2, Search, Plus, X, Upload, Film } from 'lucide-react';
import type { DomainAsset, DomainMapping } from '../../lib/pyramid';
import { s3ToHttps } from '../../lib/pyramid';

export type PoolAssetStatus = 'searching' | 'generating' | 'found' | 'created' | 'error';
export type PoolAssetKind = 'photo' | 'video' | 'audio' | 'document' | 'logo';

export interface PoolAsset {
  id: string;
  label: string;
  kind: PoolAssetKind;
  status: PoolAssetStatus;
  source: 'library' | 'generated' | 'pexels';
  thumbnail?: string;
  detail?: string;
  errorMsg?: string;
}

interface Props {
  domainMapping: DomainMapping | null;
  domainLoading: boolean;
  agentAssets: PoolAsset[];
  onRemoveAgentAsset: (id: string) => void;
  onContinue: () => void;
  continueDisabled: boolean;
}

// ─── Domain asset card (from pipeline) ────────────────────────────────────

function DomainCard({ asset, onDelete }: { asset: DomainAsset; onDelete: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const url = s3ToHttps(asset.path);
  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(asset.path);
  const isVideo = /\.(mp4|webm|mov|avi)$/i.test(asset.path);

  return (
    <div className="bg-white border border-[#E8EDF0] rounded-xl overflow-hidden group relative hover:border-[#C8D4DA] transition-all">
      {/* Thumbnail */}
      <div className="aspect-video bg-[#F0F4F6] flex items-center justify-center overflow-hidden">
        {isImage ? (
          <img
            src={url}
            alt={asset.description}
            className="w-full h-full object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : isVideo ? (
          <video
            src={url}
            className="w-full h-full object-contain"
            muted
            onMouseEnter={e => (e.target as HTMLVideoElement).play().catch(() => {})}
            onMouseLeave={e => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
          />
        ) : (
          <FileText size={20} className="text-[#051A24]/20" />
        )}
      </div>

      {/* Info */}
      <div className="px-3 py-2.5">
        <p className="text-[10px] text-[#051A24]/30 font-mono truncate mb-1">{asset.id}</p>
        <p className="text-xs text-[#051A24] line-clamp-2 leading-relaxed">
          {asset.description || 'No description'}
        </p>
        {asset.source && (
          <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 bg-[#F0F4F6] rounded text-[#051A24]/40">
            {asset.source}
          </span>
        )}
      </div>

      {/* Delete */}
      {showConfirm ? (
        <div className="mx-3 mb-3 p-2 bg-red-50 border border-red-100 rounded-lg">
          <p className="text-[10px] text-red-400 mb-2">Delete this asset?</p>
          <div className="flex gap-1.5">
            <button onClick={onDelete} className="flex-1 text-[10px] py-1 bg-red-500 text-white rounded-md font-medium">Delete</button>
            <button onClick={() => setShowConfirm(false)} className="flex-1 text-[10px] py-1 bg-[#F0F4F6] text-[#051A24]/50 rounded-md">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          className="mx-3 mb-3 w-[calc(100%-24px)] text-[10px] py-1 text-red-400 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Delete
        </button>
      )}
    </div>
  );
}

// ─── Agent-added card (from useAssetAgent) ─────────────────────────────────

function AgentCard({ asset, onRemove }: { asset: PoolAsset; onRemove: () => void }) {
  const isBusy  = asset.status === 'searching' || asset.status === 'generating';
  const isReady = asset.status === 'found' || asset.status === 'created';
  const isError = asset.status === 'error';

  return (
    <div className="bg-white border border-[#E8EDF0] rounded-xl overflow-hidden group relative hover:border-[#C8D4DA] transition-all">
      <div className="aspect-video bg-[#F0F4F6] flex items-center justify-center overflow-hidden relative">
        {asset.thumbnail && isReady ? (
          <img src={asset.thumbnail} alt={asset.label} className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div className={`text-[#051A24]/20 ${isBusy ? 'animate-pulse' : ''}`}>
            {asset.kind === 'video' ? <Video size={20} /> : asset.kind === 'audio' ? <Music size={20} /> : <Image size={20} />}
          </div>
        )}
        {isBusy && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <Loader2 size={16} className="animate-spin text-[#051A24]/40" />
          </div>
        )}
        {isError && (
          <div className="absolute inset-0 bg-red-50/80 flex items-center justify-center p-2">
            <p className="text-[10px] text-red-400 text-center">Needs manual upload</p>
          </div>
        )}
        {isReady && (
          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 bg-white/90 backdrop-blur-sm border border-[#E8EDF0] rounded-md text-[9px] text-[#051A24]/50">
            {asset.source === 'library' ? <Search size={8} /> : asset.source === 'pexels' ? <Film size={8} /> : <Wand2 size={8} />}
            {asset.source === 'library' ? 'Library' : asset.source === 'pexels' ? 'Pexels' : 'Generated'}
          </div>
        )}
      </div>
      <div className="px-3 py-2.5">
        <p className="text-xs font-medium text-[#051A24] truncate">{asset.label}</p>
        {asset.detail && <p className="text-[10px] text-[#051A24]/40 mt-0.5 line-clamp-2">{asset.detail}</p>}
        {isBusy && <p className="text-[10px] text-[#051A24]/40 mt-0.5">{asset.status === 'searching' ? 'Searching…' : 'Generating…'}</p>}
      </div>
      {(isReady || isError) && (
        <button
          onClick={onRemove}
          className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-white/90 border border-[#E8EDF0] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X size={9} className="text-[#051A24]/40" />
        </button>
      )}
    </div>
  );
}

// ─── Asset section (one per domain type) ──────────────────────────────────

const SECTION_CONFIG = [
  { key: 'footage',    label: 'Footage',     listKey: 'available_footage',     accepts: 'image/*,video/*' },
  { key: 'icon',       label: 'Icons',       listKey: 'available_icons',       accepts: 'image/*' },
  { key: 'person',     label: 'Persons',     listKey: 'available_persons',     accepts: 'image/*,video/*' },
  { key: 'logo',       label: 'Logos',       listKey: 'available_logos',       accepts: 'image/*' },
  { key: 'main_asset', label: 'Main Assets', listKey: 'available_main_assets', accepts: 'image/*,video/*' },
] as const;

function AssetSection({
  label,
  assets,
  accepts,
  onDelete,
}: {
  label: string;
  assets: DomainAsset[];
  accepts: string;
  onDelete: (id: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleted, setDeleted] = useState<Set<string>>(new Set());

  const visible = assets.filter(a => !deleted.has(a.id));

  const handleDelete = (id: string) => {
    setDeleted(prev => new Set([...prev, id]));
    onDelete(id);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E8EDF0] p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-[#051A24]">
          {label}
          <span className="ml-2 text-[#051A24]/30 font-normal text-xs">({visible.length})</span>
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-[#E8EDF0] text-[#051A24]/50 hover:border-[#051A24]/20 hover:text-[#051A24] transition-all"
        >
          <Plus size={11} /> Add
        </button>
        <input ref={fileInputRef} type="file" accept={accepts} multiple className="hidden" />
      </div>

      {visible.length === 0 ? (
        <div className="flex items-center justify-center py-8 border-2 border-dashed border-[#E8EDF0] rounded-xl">
          <div className="text-center">
            <Upload size={18} className="text-[#051A24]/15 mx-auto mb-2" />
            <p className="text-[11px] text-[#051A24]/25">No assets</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {visible.map(asset => (
            <DomainCard key={asset.id} asset={asset} onDelete={() => handleDelete(asset.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main panel ────────────────────────────────────────────────────────────

export function AssetPoolPanel({
  domainMapping,
  domainLoading,
  agentAssets,
  onRemoveAgentAsset,
  onContinue,
  continueDisabled,
}: Props) {
  const [, setDeletedIds] = useState<Set<string>>(new Set());

  const handleDelete = (id: string) => {
    setDeletedIds(prev => new Set([...prev, id]));
  };

  const busyCount = agentAssets.filter(a => a.status === 'searching' || a.status === 'generating').length;

  // Collect sections with assets
  const sections = SECTION_CONFIG.map(cfg => {
    const cat = domainMapping?.[cfg.key as keyof typeof domainMapping] as Record<string, unknown> | undefined;
    const list = (cat?.[cfg.listKey] as DomainAsset[] | undefined) ?? [];
    return { ...cfg, assets: list };
  }).filter(s => s.assets.length > 0 || domainLoading);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E8EDF0] flex-shrink-0">
        <p className="text-sm font-medium text-[#051A24]">Domain & Asset Review</p>
        <p className="text-[10px] text-[#051A24]/40 mt-0.5">
          {domainLoading ? 'Loading pipeline assets…' : `${sections.reduce((n, s) => n + s.assets.length, 0)} assets from pipeline`}
          {agentAssets.length > 0 && ` · ${agentAssets.length} from agent`}
        </p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

        {/* Loading skeleton */}
        {domainLoading && (
          <div className="bg-white rounded-2xl border border-[#E8EDF0] p-5">
            <div className="h-3 w-24 bg-[#F0F4F6] rounded animate-pulse mb-4" />
            <div className="grid grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden">
                  <div className="aspect-video bg-[#F0F4F6] animate-pulse" />
                  <div className="p-3 space-y-1.5">
                    <div className="h-2 bg-[#F0F4F6] rounded animate-pulse w-3/4" />
                    <div className="h-2 bg-[#F0F4F6] rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Domain mapping sections */}
        {!domainLoading && sections.map(s => (
          <AssetSection
            key={s.key}
            label={s.label}
            assets={s.assets}
            accepts={s.accepts}
            onDelete={handleDelete}
          />
        ))}

        {/* In-progress agent assets (not yet merged into domain sections) */}
        {agentAssets.filter(a => a.status === 'searching' || a.status === 'generating' || a.status === 'error').length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E8EDF0] p-5">
            <div className="flex items-center gap-2 mb-4">
              <p className="text-sm font-medium text-[#051A24]">Resolving</p>
              {busyCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-[#051A24]/40">
                  <Loader2 size={10} className="animate-spin" />
                  {busyCount} in progress
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {agentAssets
                .filter(a => a.status === 'searching' || a.status === 'generating' || a.status === 'error')
                .map(asset => (
                  <div key={asset.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <AgentCard asset={asset} onRemove={() => onRemoveAgentAsset(asset.id)} />
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!domainLoading && sections.length === 0 && agentAssets.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-[#F0F4F6] flex items-center justify-center">
              <Search size={18} className="text-[#051A24]/20" />
            </div>
            <p className="text-sm text-[#051A24]/30">No assets loaded yet</p>
            <p className="text-xs text-[#051A24]/20">The pipeline will populate assets here after compose pre completes</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[#E8EDF0] flex-shrink-0">
        <button
          onClick={onContinue}
          disabled={continueDisabled || domainLoading}
          className="w-full py-2.5 rounded-full bg-[#051A24] text-white text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {busyCount > 0 ? (
            <><Loader2 size={14} className="animate-spin" />Resolving assets…</>
          ) : domainLoading ? (
            <><Loader2 size={14} className="animate-spin" />Loading…</>
          ) : (
            'Continue to render'
          )}
        </button>
      </div>
    </div>
  );
}
