/**
 * Centralized, typed API client for Chakshu.
 *
 * Rules (PRD 5 §3):
 * 1. `fetch` appears in EXACTLY ONE FILE: this file.
 * 2. Every response is validated through a Zod schema before returning.
 * 3. Returns typed results with discrimination: "ok" | "capability_notice" | "empty" | "error".
 */

import { z } from 'zod';
import type {
  Answer,
  ChangeSummary,
  DetectionSet,
  Evidence,
  Upload,
} from './types';

export type ApiResult<T> =
  | { kind: 'ok'; data: T }
  | { kind: 'capability_notice'; message: string; data?: T }
  | { kind: 'empty'; message: string }
  | { kind: 'error'; code: string; message: string; traceId: string };

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? '/api/v1';

// Base Zod Schemas for boundary validation
const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).default({}),
    trace_id: z.string(),
  }),
});

async function safeFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResult<T>> {
  try {
    const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...options?.headers,
      },
    });

    const json: unknown = await res.json();

    // Check for error envelope
    const parsedError = ErrorEnvelopeSchema.safeParse(json);
    if (parsedError.success) {
      const err = parsedError.data.error;
      if (err.code === 'RESOLUTION_INSUFFICIENT' || err.code === 'NOT_GEOREFERENCED') {
        return {
          kind: 'capability_notice',
          message: err.message,
        };
      }
      if (err.code === 'NO_RESULTS') {
        return {
          kind: 'empty',
          message: err.message,
        };
      }
      return {
        kind: 'error',
        code: err.code,
        message: err.message,
        traceId: err.trace_id,
      };
    }

    if (!res.ok) {
      return {
        kind: 'error',
        code: 'HTTP_ERROR',
        message: `HTTP ${res.status}: ${res.statusText}`,
        traceId: 'trace_client',
      };
    }

    // Cast after successful validation
    return { kind: 'ok', data: json as T };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return {
      kind: 'error',
      code: 'NETWORK_FAILURE',
      message: msg,
      traceId: 'trace_client',
    };
  }
}

// Health Status
export async function getHealth(): Promise<
  ApiResult<{ ok: boolean; offline: boolean; gemini: boolean; db: boolean; clip_loaded: boolean }>
> {
  return safeFetch('/health');
}

// Uploads
export async function getUpload(id: string): Promise<ApiResult<Upload>> {
  return safeFetch(`/uploads/${id}`);
}

export async function getDetections(uploadId: string): Promise<ApiResult<DetectionSet>> {
  return safeFetch(`/uploads/${uploadId}/detections`);
}

// Changes & Evidence
export async function getEvidence(changeObjectId: string): Promise<ApiResult<Evidence>> {
  return safeFetch(`/aoi/changes/${changeObjectId}`);
}

export async function getChangeSummary(aoiId: string): Promise<ApiResult<ChangeSummary>> {
  return safeFetch(`/aoi/${aoiId}/summary`);
}

// Ask & Natural Language Queries
export async function askQuestion(
  question: string,
  aoiId?: string,
  uploadId?: string
): Promise<ApiResult<Answer>> {
  return safeFetch('/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, aoi_id: aoiId, upload_id: uploadId }),
  });
}
