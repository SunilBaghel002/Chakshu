/**
 * Centralized, typed API client for Chakshu.
 * Rule: `fetch` appears in EXACTLY ONE FILE: this file.
 */

import { z } from 'zod';
import type {
  Answer,
  Aoi,
  AoiCreate,
  ChangeSummary,
  DetectionSet,
  Evidence,
  JobResponse,
  Scene,
  Trace,
  Upload,
} from './types';

import aoiFixture from '../fixtures/aoi.json';
import scenesFixture from '../fixtures/scenes.json';
import changeSummaryFixture from '../fixtures/change_summary.json';
import evidenceSingleFixture from '../fixtures/evidence_single.json';
import evidenceListFixture from '../fixtures/evidence_list.json';
import suppressionFixture from '../fixtures/suppression.json';
import traceFixture from '../fixtures/trace.json';
import calibrationFixture from '../fixtures/calibration.json';
import answerPolishedFixture from '../fixtures/answer_polished.json';
import answerUnsupportedFixture from '../fixtures/answer_unsupported.json';

export type ApiResult<T> =
  | { kind: 'ok'; data: T }
  | { kind: 'capability_notice'; message: string; data?: T }
  | { kind: 'empty'; message: string }
  | { kind: 'error'; code: string; message: string; traceId: string };

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) || '/api/v1';

let mockOverride: boolean | null = null;

export function isMockMode(): boolean {
  if (mockOverride !== null) return mockOverride;
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_MOCK !== undefined) {
    return import.meta.env.VITE_MOCK === '1' || import.meta.env.VITE_MOCK === 'true';
  }
  return false;
}

export function setMockMode(enabled: boolean): void {
  mockOverride = enabled;
}

const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).default({}),
    trace_id: z.string(),
  }),
});

async function safeFetch<T>(endpoint: string, options?: RequestInit, fallbackData?: T): Promise<ApiResult<T>> {
  if (isMockMode() && fallbackData !== undefined) {
    return { kind: 'ok', data: fallbackData };
  }
  try {
    const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const res = await fetch(url, { ...options, headers: { Accept: 'application/json', ...options?.headers } });
    const json: unknown = await res.json();
    const parsedError = ErrorEnvelopeSchema.safeParse(json);
    if (parsedError.success) {
      const err = parsedError.data.error;
      if (err.code === 'RESOLUTION_INSUFFICIENT' || err.code === 'NOT_GEOREFERENCED') {
        return { kind: 'capability_notice', message: err.message };
      }
      if (err.code === 'NO_RESULTS') {
        return { kind: 'empty', message: err.message };
      }
      return { kind: 'error', code: err.code, message: err.message, traceId: err.trace_id };
    }
    if (!res.ok) {
      return { kind: 'error', code: `HTTP_${res.status}`, message: `Server returned ${res.status}`, traceId: 'trace_http' };
    }
    return { kind: 'ok', data: json as T };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return { kind: 'error', code: 'NETWORK_FAILURE', message: msg, traceId: 'trace_client' };
  }
}

export type AoiItem = Aoi;

export async function getAois(): Promise<ApiResult<AoiItem[]>> {
  const res = await safeFetch<AoiItem[] | { items: AoiItem[]; total: number }>('/aoi', undefined, aoiFixture as unknown as AoiItem[]);
  if (res.kind === 'ok') {
    return { kind: 'ok', data: Array.isArray(res.data) ? res.data : res.data.items };
  }
  return res as ApiResult<AoiItem[]>;
}

export async function getAoi(id: string): Promise<ApiResult<Aoi>> {
  const fallback = (aoiFixture as unknown as AoiItem[]).find((a) => a.id === id) || (aoiFixture[0] as unknown as Aoi);
  return safeFetch(`/aoi/${id}`, undefined, fallback);
}

export async function createAoi(data: AoiCreate): Promise<ApiResult<Aoi>> {
  return safeFetch('/aoi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}

export async function triggerAoiIngest(aoiId: string): Promise<ApiResult<JobResponse>> {
  return safeFetch(`/aoi/${aoiId}/ingest`, { method: 'POST' });
}

export type SceneItem = Scene;

export async function getScenes(aoiId?: string, usableOnly = false, before?: string, after?: string): Promise<ApiResult<SceneItem[]>> {
  let fallback = scenesFixture as unknown as SceneItem[];
  if (aoiId) fallback = fallback.filter((s) => s.aoi_id === aoiId);
  if (usableOnly) fallback = fallback.filter((s) => s.usable);

  const params = new URLSearchParams();
  if (aoiId) params.append('aoi_id', aoiId);
  if (usableOnly) params.append('usable_only', 'true');
  if (before) params.append('before', before);
  if (after) params.append('after', after);
  const q = params.toString();

  const res = await safeFetch<SceneItem[] | { items: SceneItem[]; total: number }>(`/scenes${q ? `?${q}` : ''}`, undefined, fallback);
  if (res.kind === 'ok') {
    return { kind: 'ok', data: Array.isArray(res.data) ? res.data : res.data.items };
  }
  return res as ApiResult<SceneItem[]>;
}

export async function getScene(sceneId: string): Promise<ApiResult<Scene>> {
  const fallback = (scenesFixture as unknown as SceneItem[]).find((s) => s.id === sceneId) || (scenesFixture[0] as unknown as Scene);
  return safeFetch(`/scenes/${sceneId}`, undefined, fallback);
}

export async function getHealth(): Promise<ApiResult<{ ok: boolean; offline: boolean; gemini: boolean; db: boolean; clip_loaded: boolean }>> {
  return safeFetch('/health', undefined, { ok: true, offline: false, gemini: true, db: true, clip_loaded: true });
}

export async function getUpload(id: string): Promise<ApiResult<Upload>> {
  return safeFetch(`/uploads/${id}`);
}

export async function getDetections(uploadId: string, refresh = false): Promise<ApiResult<DetectionSet>> {
  return safeFetch(`/uploads/${uploadId}/detections${refresh ? '?refresh=true' : ''}`);
}

export async function uploadImageFile(file: File, title?: string, gsd_m?: number, acquired_at?: string, notes?: string): Promise<ApiResult<Upload>> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (gsd_m !== undefined && !isNaN(gsd_m)) formData.append('gsd_m', gsd_m.toString());
    if (acquired_at) formData.append('acquired_at', acquired_at);
    if (notes) formData.append('notes', notes);

    const res = await fetch(`${API_BASE}/uploads`, { method: 'POST', body: formData });
    const json: unknown = await res.json();
    if (!res.ok) {
      const err = (json as any)?.error;
      return { kind: 'error', code: err?.code || 'UPLOAD_FAILED', message: err?.message || `HTTP ${res.status}`, traceId: err?.trace_id || 'trace_client' };
    }
    return { kind: 'ok', data: json as Upload };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return { kind: 'error', code: 'UPLOAD_ERROR', message: msg, traceId: 'trace_client' };
  }
}

export function getOverviewUrl(uploadId: string): string {
  return `${API_BASE}/uploads/${uploadId}/overview`;
}

export function getAnnotatedUrl(uploadId: string): string {
  return `${API_BASE}/uploads/${uploadId}/annotated`;
}

export interface SemanticSearchResultItem {
  scene_id: string;
  tile_id?: string;
  x?: number;
  y?: number;
  similarity: number;
  cloud_pct?: number;
  ndvi_mean?: number;
  ndbi_mean?: number;
  url?: string;
  [key: string]: any;
}

export async function searchSemantic(query: string, aoiId?: string, limit = 12): Promise<ApiResult<{ query: string; count: number; results: SemanticSearchResultItem[] }>> {
  return safeFetch(
    '/search/semantic',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, aoi_id: aoiId, limit }) },
    {
      query,
      count: 2,
      results: [
        { scene_id: 'S2B_43RCU_20240609', tile_id: 'tile_0_0', similarity: 0.88, cloud_pct: 1.2, ndvi_mean: 0.72, ndbi_mean: -0.15 },
        { scene_id: 'S2B_43RCU_20240609', tile_id: 'tile_1_0', similarity: 0.81, cloud_pct: 0.5, ndvi_mean: 0.65, ndbi_mean: -0.08 },
      ],
    }
  );
}

export async function getEvidence(changeObjectId: string): Promise<ApiResult<Evidence>> {
  return safeFetch(`/aoi/changes/${changeObjectId}`, undefined, evidenceSingleFixture as unknown as Evidence);
}

export async function getEvidenceList(aoiId?: string): Promise<ApiResult<Evidence[]>> {
  const list = evidenceListFixture as unknown as Evidence[];
  const filtered = aoiId ? list.filter((e) => e.aoi_id === aoiId) : list;
  return safeFetch(`/aoi/${aoiId ?? 'default'}/changes`, undefined, filtered.length > 0 ? filtered : list);
}

export async function getChangeSummary(aoiId: string): Promise<ApiResult<ChangeSummary>> {
  return safeFetch(`/aoi/${aoiId}/summary`, undefined, changeSummaryFixture as unknown as ChangeSummary);
}

export async function getSuppression(aoiId?: string): Promise<ApiResult<typeof suppressionFixture>> {
  return safeFetch(`/aoi/${aoiId ?? 'default'}/suppression`, undefined, suppressionFixture);
}

export async function getCalibration(): Promise<ApiResult<typeof calibrationFixture>> {
  return safeFetch('/calibration', undefined, calibrationFixture);
}

export async function getTrace(traceId?: string): Promise<ApiResult<Trace>> {
  return safeFetch(`/trace/${traceId ?? 'latest'}`, undefined, traceFixture as unknown as Trace);
}

export async function getJob(jobId: string): Promise<ApiResult<JobResponse>> {
  return safeFetch(`/jobs/${jobId}`);
}

export function getTileUrl(sceneId: string, z: number, x: number, y: number): string {
  return `${API_BASE}/tiles/imagery/${z}/${x}/${y}.png?scene_id=${encodeURIComponent(sceneId)}`;
}

export async function askQuestion(question: string, aoiId?: string, uploadId?: string): Promise<ApiResult<Answer>> {
  const lower = question.toLowerCase();
  const fallback = lower.includes('vehicle') || lower.includes('car') || lower.includes('weather') ? (answerUnsupportedFixture as unknown as Answer) : (answerPolishedFixture as unknown as Answer);
  return safeFetch('/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, aoi_id: aoiId, upload_id: uploadId }) }, fallback);
}

export async function triggerAoiAnalyse(aoiId: string): Promise<ApiResult<JobResponse>> {
  return safeFetch(`/aoi/${aoiId}/analyse`, {
    method: 'POST',
  });
}

export interface DecisionRecord {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  note: string | null;
  actor: string;
  recorded_at: string;
}

export async function submitDecision(
  entityType: string,
  entityId: string,
  action: 'confirm' | 'reject',
  note?: string
): Promise<ApiResult<DecisionRecord>> {
  return safeFetch('/decisions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      entity_type: entityType,
      entity_id: entityId,
      action,
      note,
    }),
  });
}

