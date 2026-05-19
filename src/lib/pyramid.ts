// Pyramid API client — all calls go through Vite proxy at /pyramid
const BASE = '/pyramid';
const HEADERS: Record<string, string> = { 'Content-Type': 'application/json' };
const API_KEY = import.meta.env.VITE_PYRAMID_API_KEY as string | undefined;
if (API_KEY) HEADERS['X-API-Key'] = API_KEY;

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const resp = await fetch(`${BASE}${path}`, {
    method,
    headers: HEADERS,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Pyramid ${resp.status} ${path}: ${text.slice(0, 200)}`);
  }
  return resp.json() as Promise<T>;
}

export interface CreateJobResp {
  job_id: string;
  input_s3_key?: string;
  upload_url?: string;
  upload_fields?: Record<string, string>;
}

export interface JobStatus {
  job_id: string;
  status: string;
  status_label: string;
  stage?: string;
  progress?: number | null;
  step_detail?: string;
  error?: { code: string; detail: string } | null;
  next_action?: {
    kind: string;
    storyboard_key?: string;
    proposal_key?: string;
    proposal_url?: string;
    review_token?: string;
  } | null;
}

export interface StoryboardResp {
  session_id: string;
  job_id: string;
  storyboard_key: string;
  version: number;
  exists?: boolean;
}

export interface RenderVersion {
  version: string;
  renders: Array<{ s3_key: string; url: string; batch_index: number; format: string }>;
}

export interface RenderVersionsResp {
  job_id: string;
  versions: RenderVersion[];
}

// ─── Job lifecycle ──────────────────────────────────────────────────────────

export const createJob = (title: string) =>
  req<CreateJobResp>('POST', '/jobs', { want_upload_url: true, title, content_type: 'audio/mpeg' });

export const startJob = (jobId: string, inputS3Key?: string) => {
  const qs = inputS3Key ? `?input_s3_key=${encodeURIComponent(inputS3Key)}` : '';
  return req<{ job_id: string; queued: string }>('POST', `/jobs/${jobId}/start${qs}`);
};

export const getJobStatus = (jobId: string) =>
  req<JobStatus>('GET', `/jobs/${jobId}/status`);

// ─── Audio upload (direct to S3 via presigned POST) ────────────────────────

export async function uploadAudio(uploadUrl: string, fields: Record<string, string>, blob: Blob): Promise<void> {
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  form.append('file', blob, 'audio.mp3');
  const resp = await fetch(uploadUrl, { method: 'POST', body: form });
  if (!resp.ok) throw new Error(`S3 upload failed: ${resp.status}`);
}

// ─── Storyboard ────────────────────────────────────────────────────────────

export const initStoryboard = (jobId: string) =>
  req<StoryboardResp>('POST', '/storyboard/init', { job_id: jobId });

export const getJobStoryboard = (jobId: string) =>
  req<StoryboardResp & { exists: boolean }>('GET', `/jobs/${jobId}/storyboard`);

export const finalizeStoryboard = (sessionId: string) =>
  req<{ storyboard_key: string }>('POST', `/storyboard/${sessionId}/finalize`);

// ─── Compose post (blueprint) ───────────────────────────────────────────────

export const submitDomainReview = (jobId: string, domainMapping: DomainMapping) => {
  const { ...domainOnly } = domainMapping as Record<string, unknown>;
  return req<{ ok: boolean }>('POST', `/jobs/${jobId}/review`, { decisions_json: domainOnly });
};

export const submitReviewWithStoryboard = (jobId: string, storyboardKey: string) =>
  req<{ ok: boolean; blueprint_key: string }>('POST', `/jobs/${jobId}/review`, {
    decisions_json: { storyboard_key: storyboardKey, submitted_at: new Date().toISOString() },
  });

// ─── Domain mapping ────────────────────────────────────────────────────────

export interface DomainAsset {
  id: string;
  description: string;
  path: string;
  source?: string;
  query?: string;
}

export interface DomainCategory {
  prefix?: string;
  description?: string;
  available_footage?: DomainAsset[];
  available_icons?: DomainAsset[];
  available_persons?: DomainAsset[];
  available_logos?: DomainAsset[];
  available_main_assets?: DomainAsset[];
}

export interface DomainMapping {
  footage?: DomainCategory;
  icon?: DomainCategory;
  person?: DomainCategory;
  logo?: DomainCategory;
  main_asset?: DomainCategory;
  color?: { palette?: Record<string, unknown> };
  sound?: DomainCategory;
  text?: DomainCategory;
}

export interface DomainMappingResp {
  domain_mapping: DomainMapping;
  source: 'submitted' | 'proposal';
}

export function s3ToHttps(s3Key: string): string {
  if (!s3Key) return '';
  if (s3Key.startsWith('http')) return s3Key;
  const m = s3Key.match(/^s3:\/\/([^/]+)\/(.+)$/);
  if (m) return `https://${m[1]}.s3.amazonaws.com/${m[2]}`;
  return s3Key;
}

export const getDomainMapping = (jobId: string) =>
  req<{ domain_mapping: DomainMapping; source: 'submitted' | 'proposal' }>('GET', `/jobs/${jobId}/review/domain_mapping`);

export async function fetchProposalMapping(proposalUrl: string): Promise<DomainMapping> {
  const resp = await fetch(proposalUrl);
  if (!resp.ok) throw new Error(`Proposal fetch failed: ${resp.status}`);
  const json = await resp.json() as { proposal?: DomainMapping } | DomainMapping;
  if (json && typeof json === 'object' && 'proposal' in json) {
    return (json as { proposal: DomainMapping }).proposal;
  }
  return json as DomainMapping;
}

// ─── Render ────────────────────────────────────────────────────────────────

export const queueRender = (jobId: string) =>
  req<{ job_id: string; status: string }>('POST', `/jobs/${jobId}/render`);

export const getRenderVersions = (jobId: string) =>
  req<RenderVersionsResp>('GET', `/jobs/${jobId}/renders/versions`);
