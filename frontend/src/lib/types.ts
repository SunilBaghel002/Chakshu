/**
 * Central TypeScript Data Contracts export for Chakshu.
 * Source: PRD 4 §1-§8.
 *
 * Modularized by domain responsibility per PRD 5 §5 (< 400 lines per file).
 */

export * from './types/common';
export * from './types/evidence';
export * from './types/detection';
export * from './types/summary';
export * from './types/ask';

// Type aliases for prompt and frontend convenience
import type { Evidence } from './types/evidence';
import type { Answer } from './types/ask';

export type EvidenceCard = Evidence;
export type AskResponse = Answer;
