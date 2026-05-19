import { useState, useRef, useCallback } from 'react';
import {
  Image, Film, FileText, Music, Package,
  Plus, X, Upload, Tag, Link2, Search,
  ExternalLink, ChevronDown,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Asset, AssetType, AssetCategory, AssetLink } from '../types';
import { PROPERTY_LISTINGS } from '../data/assets';

// ── helpers ───────────────────────────────────────────────────────────────────

function typeIcon(type: AssetType, size = 14) {
  const cls = 'flex-shrink-0';
  switch (type) {
    case 'photo':    return <Image    size={size} className={cls} />;
    case 'video':    return <Film     size={size} className={cls} />;
    case 'logo':     return <Package  size={size} className={cls} />;
    case 'document': return <FileText size={size} className={cls} />;
    case 'audio':    return <Music    size={size} className={cls} />;
  }
}

function typeLabel(type: AssetType) {
  return { photo: 'Photo', video: 'Video', logo: 'Logo', document: 'Doc', audio: 'Audio' }[type];
}

function typeBadgeColor(type: AssetType) {
  return {
    photo:    'bg-blue-50 text-blue-600',
    video:    'bg-purple-50 text-purple-600',
    logo:     'bg-amber-50 text-amber-600',
    document: 'bg-slate-100 text-slate-500',
    audio:    'bg-green-50 text-green-600',
  }[type];
}

// ── Asset card ────────────────────────────────────────────────────────────────

function AssetCard({ asset }: { asset: Asset }) {
  const hasThumbnail = !!asset.thumbnail;

  return (
    <div className="group bg-white border border-[#E8EDF0] rounded-2xl overflow-hidden hover:border-[#051A24]/20 hover:shadow-sm transition-all duration-150">
      {/* thumbnail / placeholder */}
      <div className="relative aspect-[4/3] bg-[#F7F9FA] overflow-hidden">
        {hasThumbnail ? (
          <img
            src={asset.thumbnail}
            alt={asset.name}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#051A24]/20">
            {typeIcon(asset.type, 28)}
            <span className="text-[11px] uppercase tracking-widest">{typeLabel(asset.type)}</span>
          </div>
        )}
        {/* type badge */}
        <div className={`absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${typeBadgeColor(asset.type)}`}>
          {typeIcon(asset.type, 10)}
          {typeLabel(asset.type)}
        </div>
        {/* link overlay */}
        <a
          href={asset.url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-[#051A24]/40"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[#051A24] text-xs font-medium shadow">
            <ExternalLink size={11} />
            Open
          </div>
        </a>
      </div>

      {/* body */}
      <div className="px-3 py-2.5 space-y-1.5">
        <p className="text-sm font-medium text-[#051A24] leading-snug line-clamp-2">{asset.name}</p>

        {asset.linkedTo && (
          <div className="flex items-center gap-1 text-[11px] text-[#051A24]/40">
            <Link2 size={10} />
            <span className="truncate">{asset.linkedTo.label}</span>
          </div>
        )}

        {asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {asset.tags.slice(0, 3).map((t) => (
              <span key={t} className="px-1.5 py-0.5 bg-[#051A24]/5 rounded text-[10px] text-[#051A24]/50">{t}</span>
            ))}
            {asset.tags.length > 3 && (
              <span className="px-1.5 py-0.5 text-[10px] text-[#051A24]/30">+{asset.tags.length - 3}</span>
            )}
          </div>
        )}

        {asset.notes && (
          <p className="text-[11px] text-[#051A24]/40 italic leading-snug line-clamp-2">{asset.notes}</p>
        )}
      </div>
    </div>
  );
}

// ── Upload modal ──────────────────────────────────────────────────────────────

const LINK_OPTIONS: { kind: AssetLink['kind']; label: string }[] = [
  { kind: 'brand',    label: 'Brand' },
  { kind: 'property', label: 'Property listing' },
  { kind: 'event',    label: 'Event' },
  { kind: 'client',   label: 'Client' },
];

interface UploadModalProps {
  defaultCategory: AssetCategory;
  onClose: () => void;
  onSave: (asset: Asset) => void;
}

function UploadModal({ defaultCategory, onClose, onSave }: UploadModalProps) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<AssetType>('photo');
  const [url, setUrl] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');
  const [notes, setNotes] = useState('');
  const [linkKind, setLinkKind] = useState<AssetLink['kind'] | ''>('');
  const [propertyId, setPropertyId] = useState('');
  const [customLinkLabel, setCustomLinkLabel] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); if (!name) setName(f.name.replace(/\.[^.]+$/, '')); }
  }, [name]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f) { setFile(f); if (!name) setName(f.name.replace(/\.[^.]+$/, '')); }
  };

  const resolveLink = (): AssetLink | undefined => {
    if (!linkKind) return undefined;
    if (linkKind === 'property' && propertyId) {
      const prop = PROPERTY_LISTINGS.find((p) => p.id === propertyId);
      return prop ? { kind: 'property', id: prop.id, label: prop.label } : undefined;
    }
    if (customLinkLabel) return { kind: linkKind, id: `${linkKind}_custom_${Date.now()}`, label: customLinkLabel };
    return undefined;
  };

  const canSave = name.trim() && (file || url.trim());

  const handleSave = () => {
    if (!canSave) return;
    const tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);
    const asset: Asset = {
      id: `ast_${Date.now()}`,
      name: name.trim(),
      type,
      category: defaultCategory,
      url: url.trim() || (file ? `local://${file.name}` : ''),
      tags,
      linkedTo: resolveLink(),
      addedAt: new Date().toISOString().slice(0, 10),
      notes: notes.trim() || undefined,
    };
    onSave(asset);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8EDF0]">
          <p className="text-sm font-semibold text-[#051A24]">Add asset</p>
          <button onClick={onClose} className="text-[#051A24]/30 hover:text-[#051A24] transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl px-4 py-6 text-center cursor-pointer transition-colors ${
              dragging ? 'border-[#051A24]/40 bg-[#051A24]/5' : 'border-[#E8EDF0] hover:border-[#051A24]/20 hover:bg-[#F7F9FA]'
            }`}
          >
            <input ref={inputRef} type="file" className="hidden" accept="image/*,video/*,.pdf,.doc,.docx" onChange={handleFileInput} />
            {file ? (
              <div className="flex items-center justify-center gap-2 text-sm text-[#051A24]/70">
                <Upload size={16} />
                <span className="font-medium">{file.name}</span>
                <span className="text-[#051A24]/30">({(file.size / 1024).toFixed(0)} KB)</span>
              </div>
            ) : (
              <>
                <Upload size={20} className="mx-auto mb-2 text-[#051A24]/25" />
                <p className="text-sm text-[#051A24]/50">Drop file here or <span className="text-[#051A24] font-medium">browse</span></p>
                <p className="text-[11px] text-[#051A24]/30 mt-1">JPG, PNG, MP4, PDF · up to 50 MB</p>
              </>
            )}
          </div>

          {/* URL field */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-[#051A24]/50 uppercase tracking-wide">Or paste a link</label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E8EDF0] focus-within:border-[#051A24]/40">
              <Link2 size={13} className="text-[#051A24]/30 flex-shrink-0" />
              <input
                type="url"
                placeholder="Google Drive, Dropbox, direct URL…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 text-sm text-[#051A24] placeholder-[#051A24]/25 outline-none bg-transparent"
              />
            </div>
          </div>

          {/* name + type */}
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[#051A24]/50 uppercase tracking-wide">Name</label>
              <input
                type="text"
                placeholder="Asset name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E8EDF0] focus:border-[#051A24]/40 text-sm text-[#051A24] placeholder-[#051A24]/25 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[#051A24]/50 uppercase tracking-wide">Type</label>
              <div className="relative">
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as AssetType)}
                  className="appearance-none px-3 pr-7 py-2 rounded-xl border border-[#E8EDF0] focus:border-[#051A24]/40 text-sm text-[#051A24] outline-none bg-white cursor-pointer"
                >
                  <option value="photo">Photo</option>
                  <option value="video">Video</option>
                  <option value="logo">Logo</option>
                  <option value="document">Document</option>
                  <option value="audio">Audio</option>
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#051A24]/30 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* tags */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-[#051A24]/50 uppercase tracking-wide flex items-center gap-1">
              <Tag size={10} /> Tags <span className="normal-case font-normal">(comma-separated)</span>
            </label>
            <input
              type="text"
              placeholder="terrace, exterior, key-feature"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E8EDF0] focus:border-[#051A24]/40 text-sm text-[#051A24] placeholder-[#051A24]/25 outline-none"
            />
          </div>

          {/* link to */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-[#051A24]/50 uppercase tracking-wide flex items-center gap-1">
              <Link2 size={10} /> Link to
            </label>
            <div className="flex flex-wrap gap-1.5">
              {LINK_OPTIONS.map((opt) => (
                <button
                  key={opt.kind}
                  onClick={() => setLinkKind(linkKind === opt.kind ? '' : opt.kind)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    linkKind === opt.kind
                      ? 'bg-[#051A24] text-white'
                      : 'bg-[#051A24]/5 text-[#051A24]/60 hover:bg-[#051A24]/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {linkKind === 'property' && (
              <div className="relative mt-1.5">
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="appearance-none w-full px-3 pr-7 py-2 rounded-xl border border-[#E8EDF0] focus:border-[#051A24]/40 text-sm text-[#051A24] outline-none bg-white cursor-pointer"
                >
                  <option value="">Select a listing…</option>
                  {PROPERTY_LISTINGS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#051A24]/30 pointer-events-none" />
              </div>
            )}

            {linkKind && linkKind !== 'property' && (
              <input
                type="text"
                placeholder={`${LINK_OPTIONS.find((o) => o.kind === linkKind)?.label ?? ''} name…`}
                value={customLinkLabel}
                onChange={(e) => setCustomLinkLabel(e.target.value)}
                className="mt-1.5 w-full px-3 py-2 rounded-xl border border-[#E8EDF0] focus:border-[#051A24]/40 text-sm text-[#051A24] placeholder-[#051A24]/25 outline-none"
              />
            )}
          </div>

          {/* notes */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-[#051A24]/50 uppercase tracking-wide">Notes <span className="normal-case font-normal">(optional)</span></label>
            <textarea
              rows={2}
              placeholder="Usage tips, context, which format this works for…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E8EDF0] focus:border-[#051A24]/40 text-sm text-[#051A24] placeholder-[#051A24]/25 outline-none resize-none"
            />
          </div>
        </div>

        {/* footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#E8EDF0] bg-[#F7F9FA]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-[#051A24]/50 hover:text-[#051A24] hover:bg-[#E8EDF0] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-[#051A24] text-white disabled:opacity-30 hover:opacity-80 transition-opacity"
          >
            Add asset
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tab + filter bar ──────────────────────────────────────────────────────────

const TABS: { id: AssetCategory; label: string; sublabel: string }[] = [
  { id: 'brand',    label: 'Brand',      sublabel: 'Logo, headshots, intros' },
  { id: 'property', label: 'Properties', sublabel: 'Per-listing photos & videos' },
  { id: 'media',    label: 'My Media',   sublabel: 'Events, B-roll, testimonials' },
];

// ── AssetsPage ────────────────────────────────────────────────────────────────

export function AssetsPage() {
  const { assets, addAsset } = useApp();
  const [activeTab, setActiveTab] = useState<AssetCategory>('brand');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const filtered = assets.filter((a) => {
    if (a.category !== activeTab) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.tags.some((t) => t.includes(q)) ||
      a.linkedTo?.label.toLowerCase().includes(q) ||
      a.notes?.toLowerCase().includes(q)
    );
  });

  // group property assets by listing
  const propertyGroups: Record<string, { label: string; items: Asset[] }> = {};
  if (activeTab === 'property') {
    filtered.forEach((a) => {
      const key = a.linkedTo?.id ?? '__unlinked';
      const label = a.linkedTo?.label ?? 'Unlinked';
      if (!propertyGroups[key]) propertyGroups[key] = { label, items: [] };
      propertyGroups[key].items.push(a);
    });
  }

  const counts = { brand: 0, property: 0, media: 0 };
  assets.forEach((a) => counts[a.category]++);

  return (
    <div className="h-full flex flex-col bg-[#F7F9FA]" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* header */}
      <div className="bg-white border-b border-[#E8EDF0] px-6 pt-5 pb-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-base font-semibold text-[#051A24]">Asset Library</h1>
            <p className="text-xs text-[#051A24]/40 mt-0.5">{assets.length} assets — logo, property media, B-roll &amp; more</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#051A24] text-white text-xs font-medium hover:opacity-80 transition-opacity"
          >
            <Plus size={13} />
            Add asset
          </button>
        </div>

        {/* tabs */}
        <div className="flex items-center gap-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-150 ${
                activeTab === tab.id
                  ? 'border-[#051A24] text-[#051A24]'
                  : 'border-transparent text-[#051A24]/40 hover:text-[#051A24]/70'
              }`}
            >
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                activeTab === tab.id ? 'bg-[#051A24] text-white' : 'bg-[#051A24]/8 text-[#051A24]/40'
              }`}>
                {counts[tab.id]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* search + sublabel */}
      <div className="px-6 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-xs px-3 py-1.5 rounded-xl border border-[#E8EDF0] bg-white focus-within:border-[#051A24]/30">
          <Search size={13} className="text-[#051A24]/30 flex-shrink-0" />
          <input
            type="text"
            placeholder={`Search ${TABS.find((t) => t.id === activeTab)?.label.toLowerCase()}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm text-[#051A24] placeholder-[#051A24]/25 outline-none bg-transparent"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-[#051A24]/30 hover:text-[#051A24]">
              <X size={12} />
            </button>
          )}
        </div>
        <p className="text-[11px] text-[#051A24]/30">{TABS.find((t) => t.id === activeTab)?.sublabel}</p>
      </div>

      {/* grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-8">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Upload size={24} className="text-[#051A24]/15 mb-3" />
            <p className="text-sm text-[#051A24]/40">No assets yet</p>
            <p className="text-xs text-[#051A24]/25 mt-1">Click "Add asset" to upload or link your first file</p>
          </div>
        )}

        {activeTab === 'property' && Object.keys(propertyGroups).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(propertyGroups).map(([key, group]) => (
              <div key={key}>
                <div className="flex items-center gap-2 mb-3">
                  <Link2 size={12} className="text-[#051A24]/30" />
                  <p className="text-xs font-semibold text-[#051A24]/50 uppercase tracking-wide">{group.label}</p>
                  <span className="text-[10px] text-[#051A24]/25">{group.items.length} file{group.items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {group.items.map((a) => <AssetCard key={a.id} asset={a} />)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map((a) => <AssetCard key={a.id} asset={a} />)}
          </div>
        )}
      </div>

      {showModal && (
        <UploadModal
          defaultCategory={activeTab}
          onClose={() => setShowModal(false)}
          onSave={addAsset}
        />
      )}
    </div>
  );
}
