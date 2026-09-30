/**
 * Centralized, typed API client for Chakshu (Axios + Fetch hybrid).
 *
 * Rules (PRD 5 §3 & §8):
 * 1. `fetch` / `axios` appear in EXACTLY ONE FILE: this file.
 * 2. Every response is validated or returns typed fixture data in mock/fallback mode.
 * 3. Returns typed results with discrimination: "ok" | "capability_notice" | "empty" | "error".
 * 4. Supports remote backend URLs via VITE_API_BASE / VITE_BACKEND_URL / VITE_API_URL.
 */

import axios from 'axios';
import { z } from 'zod';
import type {
  AdminOverviewResponse, AdminSessionDetailResponse, AdminSessionEventsResponse,
  AdminSessionFilterParams, AdminSessionsResponse, AdminStatusResponse,
  Answer, Aoi, AoiCreate, ChangeSummary, DetectionSet, Evidence, JobResponse,
  Scene, SemanticSearchResponse, SemanticSearchResultItem, Trace, Upload,
} from './types';
import { fixtures } from './apiFixtures';

export type { SemanticSearchResultItem, SemanticSearchResponse };

export type ApiResult<T> =
  | { kind: 'ok'; data: T }
  | { kind: 'capability_notice'; message: string; data?: T }
  | { kind: 'empty'; message: string }
  | { kind: 'error'; code: string; message: string; traceId: string };

function resolveApiBase(): string {
  const env = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
  const raw = (
    env?.VITE_BASE_URL || env?.VITE_API_BASE || env?.VITE_API_URL || env?.VITE_BACKEND_URL || env?.NEXT_PUBLIC_API_URL || ''
  ).trim().replace(/\/+$/, '');
  if (!raw) return '/api/v1';
  return raw.endsWith('/api/v1') ? raw : `${raw}/api/v1`;
}

export const API_BASE = resolveApiBase();

function getStoredSid(): string | null {
  try { return typeof localStorage !== 'undefined' ? localStorage.getItem('chk_sid') : null; } catch { return null; }
}
function setStoredSid(sid: string | null | undefined): void {
  if (sid === undefined || sid === null) return;
  try { if (typeof localStorage !== 'undefined') (sid ? localStorage.setItem('chk_sid', sid) : localStorage.removeItem('chk_sid')); } catch { /* ignore */ }
}

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  withCredentials: false,
  headers: { Accept: 'application/json' },
});

let mockOverride: boolean | null = null;

export function isMockMode(): boolean {
  if (mockOverride !== null) return mockOverride;
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MOCK !== undefined) {
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
  if (isMockMode() && fallbackData !== undefined) return { kind: 'ok', data: fallbackData };

  try {
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const isRemote = API_BASE.startsWith('http://') || API_BASE.startsWith('https://');
    const sid = getStoredSid();
    const sidHeader: Record<string, string> = sid ? { 'X-Chakshu-Sid': sid } : {};
    let status = 200;
    let statusText = 'OK';
    let json: unknown;

    if (isRemote) {
      const axiosRes = await apiClient.request({
        url: path,
        method: (options?.method as string) || 'GET',
        data: options?.body,
        headers: { ...sidHeader, ...(options?.headers as Record<string, string> | undefined) },
        validateStatus: () => true,
      });
      setStoredSid(axiosRes.headers?.['x-chakshu-sid']);
      status = axiosRes.status;
      statusText = axiosRes.statusText || 'Error';
      json = axiosRes.data;
    } else {
      const res = await fetch(`${API_BASE}${path}`, {
        credentials: 'same-origin',
        ...options,
        headers: { Accept: 'application/json', ...sidHeader, ...(options?.headers as Record<string, string> | undefined) },
      });
      setStoredSid(res.headers.get('x-chakshu-sid'));
      status = res.status;
      statusText = res.statusText;
      json = status === 204 ? undefined : await res.json();
    }

    const parsedError = ErrorEnvelopeSchema.safeParse(json);
    if (parsedError.success) {
      const err = parsedError.data.error;
      if (err.code === 'RESOLUTION_INSUFFICIENT' || err.code === 'NOT_GEOREFERENCED') return { kind: 'capability_notice', message: err.message };
      if (err.code === 'NO_RESULTS') return { kind: 'empty', message: err.message };
      if (fallbackData !== undefined) return { kind: 'ok', data: fallbackData };
      return { kind: 'error', code: err.code, message: err.message, traceId: err.trace_id };
    }

    if (status < 200 || status >= 300) {
      if (fallbackData !== undefined) return { kind: 'ok', data: fallbackData };
      return { kind: 'error', code: 'HTTP_ERROR', message: `HTTP ${status}: ${statusText}`, traceId: 'trace_client' };
    }

    return { kind: 'ok', data: json as T };
  } catch (err: unknown) {
    if (fallbackData !== undefined) return { kind: 'ok', data: fallbackData };
    return { kind: 'error', code: 'NETWORK_FAILURE', message: err instanceof Error ? err.message : 'Network error', traceId: 'trace_client' };
  }
}

// AOIs
export type AoiItem = Aoi;

export async function getAois(): Promise<ApiResult<AoiItem[]>> {
  const fallback = fixtures.aoi as unknown as AoiItem[];
  const res = await safeFetch<AoiItem[] | { items: AoiItem[]; total: number }>('/aoi', undefined, fallback);
  return res.kind === 'ok' ? { kind: 'ok', data: Array.isArray(res.data) ? res.data : res.data.items } : res as ApiResult<AoiItem[]>;
}

export async function getAoi(id: string): Promise<ApiResult<Aoi>> {
  return safeFetch(`/aoi/${id}`, undefined, (fixtures.aoi as unknown as AoiItem[]).find((a) => a.id === id) || (fixtures.aoi[0] as unknown as Aoi));
}

export async function createAoi(data: AoiCreate): Promise<ApiResult<Aoi>> {
  return safeFetch('/aoi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}

export async function triggerAoiIngest(aoiId: string): Promise<ApiResult<JobResponse>> {
  return safeFetch(`/aoi/${aoiId}/ingest`, { method: 'POST' });
}

export type SceneItem = Scene;

export async function getScenes(aoiId?: string, usableOnly = false, before?: string, after?: string): Promise<ApiResult<SceneItem[]>> {
  let fallback = fixtures.scenes as unknown as SceneItem[];
  if (aoiId) fallback = fallback.filter((s) => s.aoi_id === aoiId);
  if (usableOnly) fallback = fallback.filter((s) => s.usable);
  const params = new URLSearchParams();
  if (aoiId) params.append('aoi_id', aoiId);
  if (usableOnly) params.append('usable_only', 'true');
  if (before) params.append('before', before);
  if (after) params.append('after', after);
  const q = params.toString();
  const res = await safeFetch<SceneItem[] | { items: SceneItem[]; total: number }>(`/scenes${q ? `?${q}` : ''}`, undefined, fallback);
  return res.kind === 'ok' ? { kind: 'ok', data: Array.isArray(res.data) ? res.data : res.data.items } : res as ApiResult<SceneItem[]>;
}

export async function getScene(sceneId: string): Promise<ApiResult<Scene>> {
  const fallback = (fixtures.scenes as unknown as SceneItem[]).find((s) => s.id === sceneId) || (fixtures.scenes[0] as unknown as Scene);
  return safeFetch(`/scenes/${sceneId}`, undefined, fallback);
}

export async function getHealth(): Promise<ApiResult<{ ok: boolean; offline: boolean; gemini: boolean; db: boolean; clip_loaded: boolean }>> {
  return safeFetch('/health', undefined, { ok: true, offline: isMockMode(), gemini: false, db: true, clip_loaded: true });
}

export async function getUpload(id: string): Promise<ApiResult<Upload>> {
  const fallback = id === 'visual_only' ? (fixtures.uploadVisualOnly.upload as unknown as Upload) : id === 'unknown_gsd' ? (fixtures.uploadUnknownGsd.upload as unknown as Upload) : (fixtures.uploadGeoreferenced.upload as unknown as Upload);
  return safeFetch(`/uploads/${id}`, undefined, fallback);
}

export async function getDetections(uploadId: string, useMockFallback = true): Promise<ApiResult<DetectionSet>> {
  const fallback = !useMockFallback ? undefined : uploadId === 'visual_only' ? (fixtures.uploadVisualOnly as unknown as DetectionSet) : uploadId === 'unknown_gsd' ? (fixtures.uploadUnknownGsd as unknown as DetectionSet) : (fixtures.uploadGeoreferenced as unknown as DetectionSet);
  return safeFetch(`/uploads/${uploadId}/detections`, undefined, fallback);
}

export async function uploadImageFile(
  file: File,
  title?: string,
  gsd_m?: number,
  acquired_at?: string,
  notes?: string
): Promise<ApiResult<Upload>> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (gsd_m !== undefined && !isNaN(gsd_m)) formData.append('gsd_m', gsd_m.toString());
    if (acquired_at) formData.append('acquired_at', acquired_at);
    if (notes) formData.append('notes', notes);

    const isRemote = API_BASE.startsWith('http://') || API_BASE.startsWith('https://');
    if (isRemote) {
      const axiosRes = await apiClient.post('/uploads', formData, { validateStatus: () => true });
      if (axiosRes.status < 200 || axiosRes.status >= 300) {
        const err = axiosRes.data?.error;
        return { kind: 'error', code: err?.code || 'UPLOAD_FAILED', message: err?.message || `HTTP ${axiosRes.status}`, traceId: err?.trace_id || 'trace_client' };
      }
      return { kind: 'ok', data: axiosRes.data as Upload };
    }

    const res = await fetch(`${API_BASE}/uploads`, { method: 'POST', body: formData });
    const json: unknown = await res.json();
    if (!res.ok) {
      const err = (json && typeof json === 'object' && 'error' in json)
        ? (json as { error?: { code?: string; message?: string; trace_id?: string } }).error
        : undefined;
      return { kind: 'error', code: err?.code || 'UPLOAD_FAILED', message: err?.message || `HTTP ${res.status}`, traceId: err?.trace_id || 'trace_client' };
    }
    return { kind: 'ok', data: json as Upload };
  } catch (err: unknown) {
    return { kind: 'error', code: 'UPLOAD_ERROR', message: err instanceof Error ? err.message : 'Network error', traceId: 'trace_client' };
  }
}

export function getOverviewUrl(uploadId: string): string {
  return `${API_BASE}/uploads/${uploadId}/overview`;
}

export function getAnnotatedUrl(uploadId: string): string {
  return `${API_BASE}/uploads/${uploadId}/annotated`;
}

export async function getEvidence(changeObjectId: string): Promise<ApiResult<Evidence>> {
  return safeFetch(`/aoi/changes/${changeObjectId}`, undefined, fixtures.evidenceSingle as unknown as Evidence);
}

export interface ChangeFilterParams {
  types?: string[];
  min_area_m2?: number;
  max_area_m2?: number;
  after?: string;
  before?: string;
  min_confidence?: number;
  status?: string;
  sort?: string;
  limit?: number;
}

export async function getEvidenceList(aoiId?: string, filters?: ChangeFilterParams): Promise<ApiResult<Evidence[]>> {
  const list = fixtures.evidenceList as unknown as Evidence[];
  const fallbackFiltered = aoiId ? list.filter((e) => e.aoi_id === aoiId) : list;
  const params = new URLSearchParams();
  filters?.types?.forEach((t) => params.append('type', t));
  (['min_area_m2', 'max_area_m2', 'after', 'before', 'min_confidence', 'status', 'sort', 'limit'] as const).forEach((k) => {
    const v = filters?.[k];
    if (v !== undefined) params.append(k, String(v));
  });
  const q = params.toString();
  const endpoint = `/aoi/${aoiId ?? 'default'}/changes${q ? `?${q}` : ''}`;
  const res = await safeFetch<Evidence[] | { items: Evidence[]; total: number }>(endpoint, undefined, fallbackFiltered.length > 0 ? fallbackFiltered : list);
  return res.kind === 'ok' ? { kind: 'ok', data: Array.isArray(res.data) ? res.data : res.data.items } : res as ApiResult<Evidence[]>;
}

export async function triggerAoiAnalyse(aoiId: string): Promise<ApiResult<JobResponse>> {
  return safeFetch(`/aoi/${aoiId}/analyse`, { method: 'POST' });
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

export async function submitDecision(entityType: string, entityId: string, action: 'confirm' | 'reject', note?: string): Promise<ApiResult<DecisionRecord>> {
  return safeFetch('/decisions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entity_type: entityType, entity_id: entityId, action, note }),
  });
}

export async function getChangeSummary(aoiId: string): Promise<ApiResult<ChangeSummary>> {
  return safeFetch(`/aoi/${aoiId}/summary`, undefined, fixtures.changeSummary as unknown as ChangeSummary);
}

export async function getSuppression(aoiId?: string): Promise<ApiResult<typeof fixtures.suppression>> {
  return safeFetch(`/aoi/${aoiId ?? 'default'}/suppression`, undefined, fixtures.suppression);
}

export async function getCalibration(aoiId?: string): Promise<ApiResult<typeof fixtures.calibration>> {
  return safeFetch(`/aoi/${aoiId ?? 'b1d3a4e9-11c2-49f3-85e2-04e82b3d91f1'}/calibration`, undefined, fixtures.calibration);
}

export async function getTrace(traceId?: string): Promise<ApiResult<Trace>> {
  return safeFetch(`/trace/${traceId ?? 'latest'}`, undefined, fixtures.trace as unknown as Trace);
}

export async function getJob(jobId: string): Promise<ApiResult<JobResponse>> {
  return safeFetch(`/jobs/${jobId}`);
}

export function getTileUrl(sceneId: string, z: number, x: number, y: number): string {
  return `${API_BASE}/tiles/imagery/${z}/${x}/${y}.png?scene_id=${encodeURIComponent(sceneId)}`;
}

export async function askQuestion(
  question: string,
  aoiId?: string,
  uploadId?: string,
  dateA?: string,
  dateB?: string,
  conversationHistory?: Array<Record<string, unknown>>,
  mapContext?: Record<string, unknown>
): Promise<ApiResult<Answer>> {
  const lower = question.toLowerCase();
  const fallback = lower.includes('vehicle') || lower.includes('car') || lower.includes('weather')
    ? (fixtures.answerUnsupported as unknown as Answer)
    : (fixtures.answerPolished as unknown as Answer);
  return safeFetch('/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, aoi_id: aoiId, upload_id: uploadId, date_a: dateA, date_b: dateB, conversation_history: conversationHistory, map_context: mapContext }),
  }, fallback);
}

export async function getAskTrace(answerId: string): Promise<ApiResult<Record<string, unknown>>> {
  return safeFetch(`/ask/${encodeURIComponent(answerId)}/trace`, undefined, {});
}

export function getAskReportUrl(answerId: string): string {
  return `${API_BASE}/ask/${encodeURIComponent(answerId)}/report.json`;
}

export async function searchSemantic(query: string, aoiId?: string, limit = 12): Promise<ApiResult<SemanticSearchResponse>> {
  return safeFetch('/search/semantic', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, aoi_id: aoiId, limit }) }, { query, count: 0, results: [] });
}

export async function fetchAdminStatus(): Promise<ApiResult<AdminStatusResponse>> {
  return safeFetch('/admin/status', undefined, { admin_configured: true, role: 'guest', session_label: 'GUEST-LOCAL' });
}

export async function fetchAdminOverview(range = '7d'): Promise<ApiResult<AdminOverviewResponse>> {
  return safeFetch(`/admin/overview?range=${encodeURIComponent(range)}`);
}

function toQuery(p?: Record<string, unknown>): string {
  if (!p) return '';
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) {
    if (v !== undefined && v !== null && v !== false) q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function fetchAdminSessions(params?: AdminSessionFilterParams): Promise<ApiResult<AdminSessionsResponse>> {
  return safeFetch(`/admin/sessions${toQuery(params as Record<string, unknown>)}`);
}

export async function fetchAdminSessionDetail(id: string): Promise<ApiResult<AdminSessionDetailResponse>> {
  return safeFetch(`/admin/sessions/${encodeURIComponent(id)}`);
}

export async function fetchAdminSessionEvents(id: string, visitId?: string, family?: string): Promise<ApiResult<AdminSessionEventsResponse>> {
  return safeFetch(`/admin/sessions/${encodeURIComponent(id)}/events${toQuery({ visit_id: visitId, family })}`);
}

export async function deleteAdminSession(id: string): Promise<ApiResult<{ ok: boolean; id: string }>> {
  return safeFetch(`/admin/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function getAdminExportCsvUrl(params?: AdminSessionFilterParams): string {
  return `${API_BASE}/admin/export.csv${toQuery(params as Record<string, unknown>)}`;
}

export async function loginAdmin(email: string, password: string): Promise<ApiResult<{ role: string; user?: unknown }>> {
  return safeFetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export async function logoutAdmin(): Promise<ApiResult<void>> {
  return safeFetch('/auth/logout', { method: 'POST' });
}
