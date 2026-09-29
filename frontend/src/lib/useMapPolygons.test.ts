import { describe, it, expect, vi } from 'vitest';
import L from 'leaflet';
import { renderHook, act } from '@testing-library/react';
import { useMapPolygons } from './useMapPolygons';
import evidenceListFixture from '../fixtures/evidence_list.json';
import type { Evidence } from './types';

describe('useMapPolygons Leaflet interaction test', () => {
  it('creates layers and fires mouseover and click events', () => {
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    const map = L.map(container, {
      center: [28.1748, 77.6075],
      zoom: 14,
    });
    map.createPane('polygonsPane');

    const onSelectEvidence = vi.fn();
    const setHoveredEvidence = vi.fn();
    const onHoverWithBbox = vi.fn();

    const evidenceList = evidenceListFixture as unknown as Evidence[];

    const { rerender } = renderHook(
      (props) => useMapPolygons(props),
      {
        initialProps: {
          map,
          evidenceList,
          selectedEvidenceId: null as string | null,
          onSelectEvidence,
          showAllPolygons: true,
          setHoveredEvidence,
          onHoverWithBbox,
          beforeDate: '2021-01-15',
          afterDate: '2026-08-03',
        },
      }
    );

    const pane = map.getPane('polygonsPane')!;
    expect(pane).toBeDefined();

    // Check SVG paths in pane
    const paths = pane.querySelectorAll('path');
    console.log('Total paths in polygonsPane:', paths.length);
    expect(paths.length).toBeGreaterThan(0);

    // Find interactive path
    const interactivePaths = pane.querySelectorAll('path.leaflet-interactive');
    console.log('Interactive paths:', interactivePaths.length);

    // Let's fire mouseover on the first interactive path or via layer
    // Let's see how Leaflet dispatches
    const firstPath = interactivePaths[0] as SVGPathElement;
    expect(firstPath).toBeDefined();

    // Simulate mouseover on firstPath
    firstPath.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

    console.log('onHoverWithBbox calls:', onHoverWithBbox.mock.calls.length);
    console.log('setHoveredEvidence calls:', setHoveredEvidence.mock.calls.length);

    // Simulate click on firstPath
    firstPath.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    console.log('onSelectEvidence calls:', onSelectEvidence.mock.calls.length);
  });
});
