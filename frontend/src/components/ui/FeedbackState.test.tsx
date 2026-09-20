import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeedbackState } from './FeedbackState';
import { FEEDBACK_COPY, REFUSAL_NOTICES } from '../../lib/copy';

describe('FeedbackState (5 Canonical States + Stale Modifier) (PRD 9 §4, PRD 10 §8)', () => {
  it('renders "ok" state with children normally', () => {
    render(
      <FeedbackState state="ok">
        <div data-testid="live-data">SATELLITE DATA ACTIVE</div>
      </FeedbackState>
    );

    expect(screen.getByTestId('live-data')).not.toBeNull();
    expect(screen.getByText('SATELLITE DATA ACTIVE')).not.toBeNull();
  });

  it('renders "ok" with stale modifier: dimmed content + 2px amber top edge + REFRESH affordance', () => {
    const onRefresh = vi.fn();
    render(
      <FeedbackState state="ok" stale={true} onRefresh={onRefresh}>
        <div data-testid="live-data">SATELLITE DATA ACTIVE</div>
      </FeedbackState>
    );

    expect(screen.getByText(FEEDBACK_COPY.staleNotice)).not.toBeNull();
    const refreshBtn = screen.getByText(FEEDBACK_COPY.refresh);
    expect(refreshBtn).not.toBeNull();
    refreshBtn.click();
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it('renders "loading" state: skeleton sheen without any animate-spin spinner', () => {
    const { container } = render(
      <FeedbackState state="loading" loadingStage="READING SCENE S2B …" />
    );

    expect(screen.getByText('READING SCENE S2B …')).not.toBeNull();
    // Verify anti-pattern ban: no spinner over the view
    expect(container.querySelector('.animate-spin')).toBeNull();
  });

  it('renders "empty" state: out-of-focus iris and widen range affordance', () => {
    const onAction = vi.fn();
    render(
      <FeedbackState
        state="empty"
        emptyAction={{ label: FEEDBACK_COPY.widenRange, onClick: onAction }}
      />
    );

    expect(screen.getByText(FEEDBACK_COPY.emptyDefault)).not.toBeNull();
    const actionBtn = screen.getByText(FEEDBACK_COPY.widenRange);
    expect(actionBtn).not.toBeNull();
    actionBtn.click();
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('renders "error" state: red frame, copyable trace ID, and retry affordance', () => {
    const onRetry = vi.fn();
    render(
      <FeedbackState
        state="error"
        errorMessage="Corrupted scene raster"
        traceId="tr_err_456"
        onRetry={onRetry}
      />
    );

    expect(screen.getByText(/Corrupted scene raster/)).not.toBeNull();
    expect(screen.getByText(/TRACE: tr_err_456/)).not.toBeNull();
    const retryBtn = screen.getByText(FEEDBACK_COPY.retry);
    expect(retryBtn).not.toBeNull();
    retryBtn.click();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('renders "capability_notice" state in amber-wash, STRICTLY NEVER red', () => {
    const { container } = render(
      <FeedbackState
        state="capability_notice"
        refusalNotice={REFUSAL_NOTICES.NOTICE_T3}
      />
    );

    expect(screen.getByText(REFUSAL_NOTICES.NOTICE_T3)).not.toBeNull();

    // Verify epistemic styling rules: refusals use amber-wash, never red!
    const noticeBox = container.querySelector('[data-state="capability_notice"]');
    expect(noticeBox).not.toBeNull();

    const inlineStyle = noticeBox?.getAttribute('style') || '';
    expect(inlineStyle).toContain('var(--amber-wash)');
    expect(inlineStyle).toContain('var(--amber)');

    // Ensure red/danger is strictly absent
    expect(inlineStyle).not.toContain('var(--danger)');
    expect(inlineStyle).not.toContain('var(--rejected)');
    expect(noticeBox?.className).not.toContain('bg-red');
    expect(noticeBox?.className).not.toContain('text-red');
  });
});
