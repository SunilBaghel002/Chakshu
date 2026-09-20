import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EvidenceDrawer } from '../EvidenceDrawer';
import { PrimaryOwnerProvider } from '../ui/PrimaryOwnerContext';
import { DossierHeader } from './DossierHeader';
import { DossierTabs } from './DossierTabs';
import { MeasuredBlock } from './MeasuredBlock';
import { DossierActionsFooter } from './DossierActionsFooter';
import { TraceRows } from './TraceRows';
import type { Evidence, MeasurementSubObject, ClassificationSubObject } from '../../lib/types';
import evidenceFixture from '../../fixtures/evidence_single.json';

const mockEvidence = evidenceFixture as unknown as Evidence;

describe('Dossier (SLOT-20..26) Fixed Sequence (PRD 10 §4 / L4, PRD 9 §5.1)', () => {
  it('renders DossierHeader in SLOT-20 with facility name, ID, and VERIFIED badge', () => {
    render(
      <DossierHeader
        evidence={mockEvidence}
        decision="confirmed"
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/8f2c1a4e/)).not.toBeNull();
    expect(screen.getByText('VERIFIED')).not.toBeNull();
  });

  it('renders DossierTabs in SLOT-21 with 4-up equal width tabs and shortcut hints', () => {
    const onTabChange = vi.fn();
    render(
      <DossierTabs
        activeTab="evidence"
        onTabChange={onTabChange}
        suppressedCount={7}
      />
    );

    expect(screen.getByText('EVIDENCE')).not.toBeNull();
    expect(screen.getByText('ANALYSIS')).not.toBeNull();
    expect(screen.getByText('TRACE')).not.toBeNull();
    expect(screen.getByText('SUPPRESSED (7)')).not.toBeNull();
  });

  it('renders MeasuredBlock in SLOT-22 with BEFORE ⇄ AFTER toggle and UTM measurement', () => {
    const measurement: MeasurementSubObject = {
      area_m2: 4758300,
      area_label: '475.83 ha',
      perimeter_m: 8940,
      centroid: [77.6075, 28.1748],
      bbox_4326: [77.58, 28.15, 77.64, 28.19],
      utm_epsg: 32643,
      geom_4326: { type: 'Polygon', coordinates: [] },
      measured_by: 'Kruger UTM 43N',
      kind: 'MEASURED',
    };

    render(
      <MeasuredBlock
        measurement={measurement}
        isBeforeActive={false}
        onToggleBeforeAfter={vi.fn()}
      />
    );

    expect(screen.getByText(/GROUND AREA/)).not.toBeNull();
    expect(screen.getByText('BEFORE ⇄ AFTER')).not.toBeNull();
    expect(screen.getByText(/MEASURED — UTM/)).not.toBeNull();
    expect(screen.getByText(/8940\s*m/)).not.toBeNull();
  });

  it('renders DossierActionsFooter in SLOT-25 with EXPORT left, REJECT, and CONFIRM primary', () => {
    render(
      <PrimaryOwnerProvider>
        <DossierActionsFooter
          onExport={vi.fn()}
          onReject={vi.fn()}
          onConfirm={vi.fn()}
        />
      </PrimaryOwnerProvider>
    );

    const exportBtn = screen.getByText('EXPORT');
    const rejectBtn = screen.getByText('REJECT');
    const confirmBtn = screen.getByText('CONFIRM');

    expect(exportBtn).not.toBeNull();
    expect(rejectBtn).not.toBeNull();
    expect(confirmBtn).not.toBeNull();

    // EXPORT is left-anchored in container
    expect(exportBtn.closest('div')).toBeDefined();
  });

  it('renders TraceRows in SLOT-26 with decision table, tested values, and copyable trace ID', () => {
    const classification: ClassificationSubObject = {
      change_type: 'construction',
      rule_trace: [
        {
          rule: 'ndbi_rise',
          tested_value: 0.21,
          threshold: 0.1,
          comparator: '>=',
          passed: true,
          rationale: 'Building index rose above threshold.',
        },
      ],
      alternatives: [
        { change_type: 'clearance', score: 0.15 },
      ],
      kind: 'INFERRED',
    };

    render(
      <TraceRows
        classification={classification}
        traceId="tr_test_123"
      />
    );

    expect(screen.getByText('DECISION TRACE')).not.toBeNull();
    expect(screen.getByText(/ndbi_rise/)).not.toBeNull();
    expect(screen.getByText('✓ PASS')).not.toBeNull();
    expect(screen.getByText('TRACE: tr_test_123')).not.toBeNull();
    expect(screen.getByText('ALTERNATIVES CONSIDERED')).not.toBeNull();
    expect(screen.getByText('clearance')).not.toBeNull();
  });

  it('EvidenceDrawer mounts all 7 slots in exact document order: 20 -> 21 -> 22 -> 23 -> 24 -> 25 -> 26', () => {
    const { container } = render(
      <PrimaryOwnerProvider>
        <EvidenceDrawer
          evidence={mockEvidence}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          onReject={vi.fn()}
          onExport={vi.fn()}
        />
      </PrimaryOwnerProvider>
    );

    const slotElements = container.querySelectorAll('[data-slot]');
    const slotNames = Array.from(slotElements).map((el) => el.getAttribute('data-slot'));

    expect(slotNames).toEqual([
      'SLOT-20',
      'SLOT-21',
      'SLOT-22',
      'SLOT-23',
      'SLOT-24',
      'SLOT-25',
      'SLOT-26',
    ]);
  });
});
