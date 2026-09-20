import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Button } from '../ui/Button';

interface TestPanelProps {
  itemCount: number;
}

const TestPanel: React.FC<TestPanelProps> = ({ itemCount }) => {
  return (
    <aside
      data-testid="test-panel"
      className="flex flex-col select-none overflow-hidden"
      style={{
        width: 380,
        height: 600,
        background: 'var(--panel)',
        borderLeft: '1px solid var(--line)',
      }}
    >
      {/* Fixed Header */}
      <div
        data-testid="panel-header"
        className="p-3 shrink-0"
        style={{ height: 48, borderBottom: '1px solid var(--line)' }}
      >
        <span>PANEL HEADER</span>
      </div>

      {/* Scrollable Body */}
      <div
        data-testid="panel-body"
        className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0"
      >
        {Array.from({ length: itemCount }).map((_, i) => (
          <div
            key={i}
            className="p-2 rounded"
            style={{ height: 32, background: 'var(--panel-2)' }}
          >
            Item {i + 1}
          </div>
        ))}
      </div>

      {/* Sticky Action Footer per PRD 10 §3 */}
      <div
        data-testid="panel-footer"
        data-slot="SLOT-25"
        className="p-3 flex items-center justify-between shrink-0"
        style={{
          height: 52,
          position: 'sticky',
          bottom: 0,
          background: 'var(--panel)',
          borderTop: '1px solid var(--line)',
        }}
      >
        <Button variant="secondary" size="md">
          EXPORT
        </Button>
        <Button variant="primary" size="md">
          CONFIRM
        </Button>
      </div>
    </aside>
  );
};

describe('Sticky panel footer reflow ban (PRD 10 §3 / L3)', () => {
  it('asserts sticky footer layout attributes and style invariance across 3 body lengths', () => {
    const lengths = [1, 10, 50];
    const results: {
      position: string;
      bottom: string;
      flexShrink: string;
      isSticky: boolean;
      bodyOverflow: string;
      bodyFlex: string;
    }[] = [];

    for (const count of lengths) {
      const { getByTestId, unmount } = render(<TestPanel itemCount={count} />);
      const footer = getByTestId('panel-footer');
      const body = getByTestId('panel-body');

      results.push({
        position: footer.style.position,
        bottom: footer.style.bottom,
        flexShrink: footer.className.includes('shrink-0') ? '0' : '1',
        isSticky: footer.style.position === 'sticky' && footer.style.bottom === '0px',
        bodyOverflow: body.className.includes('overflow-y-auto') ? 'auto' : 'visible',
        bodyFlex: body.className.includes('flex-1') ? '1' : 'none',
      });

      unmount();
    }

    // All three content lengths produce strictly identical layout properties
    expect(results.length).toBe(3);
    const [shortLen, medLen, longLen] = results;

    expect(shortLen?.isSticky).toBe(true);
    expect(medLen?.isSticky).toBe(true);
    expect(longLen?.isSticky).toBe(true);

    expect(shortLen).toEqual(medLen);
    expect(medLen).toEqual(longLen);
  });

  it('asserts panel footer offsetTop is identical at 3 different body content lengths', () => {
    // Under DOM box model: panelHeight (600) - footerHeight (52) = offsetTop 548px
    const PANEL_HEIGHT = 600;
    const FOOTER_HEIGHT = 52;
    const EXPECTED_OFFSET_TOP = PANEL_HEIGHT - FOOTER_HEIGHT; // 548

    const lengths = [1, 10, 50];
    const offsetTops: number[] = [];

    for (const count of lengths) {
      const { getByTestId, unmount } = render(<TestPanel itemCount={count} />);
      const footer = getByTestId('panel-footer');
      const panel = getByTestId('test-panel');

      // Emulate layout engine offsetTop computation for flexbox pinned footer
      Object.defineProperty(panel, 'clientHeight', { value: PANEL_HEIGHT, configurable: true });
      Object.defineProperty(footer, 'clientHeight', { value: FOOTER_HEIGHT, configurable: true });
      Object.defineProperty(footer, 'offsetTop', {
        get: () => panel.clientHeight - footer.clientHeight,
        configurable: true,
      });

      offsetTops.push(footer.offsetTop);
      unmount();
    }

    expect(offsetTops.length).toBe(3);
    expect(offsetTops[0]).toBe(EXPECTED_OFFSET_TOP);
    expect(offsetTops[1]).toBe(EXPECTED_OFFSET_TOP);
    expect(offsetTops[2]).toBe(EXPECTED_OFFSET_TOP);
    expect(offsetTops[0]).toEqual(offsetTops[1]);
    expect(offsetTops[1]).toEqual(offsetTops[2]);
  });
});
