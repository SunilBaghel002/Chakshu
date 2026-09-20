import React from 'react';
import { UPLOAD_COPY } from '../../lib/copy';

interface UploadProgressStripProps {
  currentStageIndex?: number;
  isProcessing?: boolean;
}

/**
 * UploadProgressStrip — SLOT-30 (PRD 10 §5 / L5 & PRD 12 §4)
 * Honest stage labels: READING -> GATE -> TILES -> MODEL -> VERIFY.
 * Never a fake percentage.
 */
export const UploadProgressStrip: React.FC<UploadProgressStripProps> = ({
  currentStageIndex = 0,
  isProcessing = false,
}) => {
  const stages = UPLOAD_COPY.stages;

  return (
    <div
      className="flex items-center justify-between px-6 h-full w-full select-none"
      style={{
        background: 'var(--well)',
        borderTop: '1px solid var(--line)',
      }}
    >
      <div className="flex items-center gap-1">
        <span className="t-tag font-bold" style={{ color: 'var(--ink-3)', fontSize: 10 }}>
          PIPELINE:
        </span>
      </div>

      <div className="flex items-center gap-3 flex-1 max-w-2xl px-4">
        {stages.map((stage, idx) => {
          const isDone = isProcessing ? idx < currentStageIndex : false;
          const isCurrent = isProcessing ? idx === currentStageIndex : false;

          return (
            <React.Fragment key={stage}>
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors"
                style={{
                  background: isCurrent
                    ? 'var(--amber-wash)'
                    : isDone
                    ? 'rgba(45, 212, 191, 0.1)'
                    : 'transparent',
                  border: `1px solid ${
                    isCurrent
                      ? 'var(--amber)'
                      : isDone
                      ? 'var(--teal)'
                      : 'var(--line)'
                  }`,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: isCurrent
                      ? 'var(--amber)'
                      : isDone
                      ? 'var(--teal)'
                      : 'var(--ink-3)',
                  }}
                />
                <span
                  className="t-tag font-bold"
                  style={{
                    fontSize: 9,
                    color: isCurrent
                      ? 'var(--amber)'
                      : isDone
                      ? 'var(--teal)'
                      : 'var(--ink-3)',
                  }}
                >
                  {stage}
                </span>
              </div>

              {idx < stages.length - 1 && (
                <span
                  className="t-mono text-xs select-none"
                  style={{ color: 'var(--line-strong)' }}
                >
                  →
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="t-mono text-xs" style={{ color: 'var(--ink-3)' }}>
        {isProcessing ? 'HONEST STEP AUDIT' : 'IDLE'}
      </div>
    </div>
  );
};
