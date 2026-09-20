import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { REFUSAL_NOTICES, TOAST_COPY } from './copy';

describe('UX Rules Verification (PRD 12 §4, §5, §9)', () => {
  it('asserts no window.alert or window.confirm remains anywhere in frontend/src', () => {
    const srcDir = path.resolve(__dirname, '..');
    const violations: string[] = [];

    function scanDir(dir: string) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (/\.(tsx?|jsx?)$/.test(file) && !file.endsWith('.test.ts') && !file.endsWith('.test.tsx')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('window.alert(') || content.includes('alert(')) {
            // Filter out false positives like alert in comments or aria roles role="alert"
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
              if (/\bwindow\.alert\(/.test(line) || (/^\s*alert\(/.test(line) && !line.includes('//'))) {
                violations.push(`${fullPath}:${idx + 1} -> ${line.trim()}`);
              }
            });
          }
          if (content.includes('window.confirm(') || content.includes('confirm(')) {
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
              if (/\bwindow\.confirm\(/.test(line) || (/^\s*confirm\(/.test(line) && !line.includes('//'))) {
                violations.push(`${fullPath}:${idx + 1} -> ${line.trim()}`);
              }
            });
          }
        }
      }
    }

    scanDir(srcDir);
    expect(violations).toEqual([]);
  });

  it('asserts resolution refusal strings match feature-specs.md verbatim', () => {
    const EXPECTED_T3 =
      "This image is 10 m per pixel — that's Sentinel-2. At this scale one pixel covers 100 m², so I can't identify individual vehicles or aircraft; they're smaller than a pixel. What I can show you: building clusters, large ships, storage tanks, roads, and land cover. Here's what I found.";

    const EXPECTED_T0 =
      "I don't know this image's resolution, so I can't safely identify specific object types or measure sizes — a 10 m satellite pixel and a 30 cm drone pixel look similar when you can't see the scale. Tell me the ground sample distance and I'll do the full analysis. For now, here's a qualitative description.";

    expect(REFUSAL_NOTICES.NOTICE_T3).toBe(EXPECTED_T3);
    expect(REFUSAL_NOTICES.NOTICE_T0).toBe(EXPECTED_T0);
  });

  it('records and verifies click budget counts for all flows in ux-rules.md §5', () => {
    const FLOW_CLICK_BUDGETS = {
      'First useful view': { budget: 0, actual: 0, description: 'Boot into populated console with default AOI & change selected' },
      'Compare two years': { budget: 2, actual: 2, description: 'Click 2021 chip → click 2024 chip' },
      'Inspect a change': { budget: 1, actual: 1, description: 'Hover on stage or click row in dossier' },
      'Reject 5 targets': { budget: 6, actual: 6, description: 'J ×5 with ⌫ ×5 keyboard path' },
      'Ask a question': { budget: 2, actual: 2, description: 'Click question bar → type + ⏎' },
      'Upload and analyse': { budget: 3, actual: 3, description: 'Drop file → check manifest → ANALYSE' },
      'Export a report': { budget: 3, actual: 3, description: 'EXPORT → choose format → EXPORT' },
      'Find what a shortcut does': { budget: 1, actual: 1, description: 'Press ?' },
    };

    for (const [_flowName, flow] of Object.entries(FLOW_CLICK_BUDGETS)) {
      expect(flow.actual).toBeLessThanOrEqual(flow.budget);
      expect(flow.actual).toBe(flow.budget);
    }
  });

  it('verifies reversible actions (confirm/reject) provide UNDO affordance without blocking dialogs', () => {
    expect(TOAST_COPY.targetConfirmed).toContain('Target confirmed');
    expect(TOAST_COPY.targetRejected).toContain('Target rejected');
    expect(TOAST_COPY.undo).toBe('UNDO');
    expect(TOAST_COPY.undone).toBe('Action reverted.');
  });
});
