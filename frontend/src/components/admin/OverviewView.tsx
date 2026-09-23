/**
 * Overview View component (SLOT-10 per PRD 16 D3.1).
 * 1. KPI row (VISITORS, VISITS, MEDIAN DWELL, OPERATIONS RUN, ERROR RATE).
 * 2. Operations Breakdown (BarRow list with p50/p95 and success rate + Table toggle).
 * 3. Device & Location distributions.
 * 4. Entry & Exit paths + Dropped after landing rate.
 */

import React, { useState } from 'react';
import { BarRow, TableToggle, Split } from './charts';
import { ADMIN_PANEL_COPY } from '../../lib/landingCopy';
import type { AdminOverviewResponse } from '../../lib/types/admin';

interface OverviewViewProps {
  data: AdminOverviewResponse;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ data }) => {
  const [showOpsTable, setShowOpsTable] = useState(false);
  const [showDeviceTable, setShowDeviceTable] = useState(false);

  const maxOpCount = Math.max(...(data.ops.map((o) => o.count) || [1]), 1);

  return (
    <div className="space-y-6 select-text">
      {/* 1. KPI Row (5 equal cards, 88px tall) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: ADMIN_PANEL_COPY.visitors, kpi: data.kpis.visitors },
          { label: ADMIN_PANEL_COPY.visits, kpi: data.kpis.visits },
          {
            label: ADMIN_PANEL_COPY.medianDwell,
            kpi: {
              value: `${Math.floor(Number(data.kpis.median_dwell_s.value) / 60)}m ${Number(data.kpis.median_dwell_s.value) % 60}s`,
              delta: data.kpis.median_dwell_s.delta,
            },
          },
          { label: ADMIN_PANEL_COPY.opsRun, kpi: data.kpis.operations_run },
          { label: ADMIN_PANEL_COPY.errorRate, kpi: data.kpis.error_rate },
        ].map((item) => {
          const delta = item.kpi.delta;
          const isUp = delta.direction === 'up';
          const isDown = delta.direction === 'down';
          const isErrorRate = item.label === ADMIN_PANEL_COPY.errorRate;
          const deltaColor = isErrorRate
            ? isUp
              ? 'text-[var(--danger)]'
              : isDown
              ? 'text-[var(--ok)]'
              : 'text-[var(--ink-3)]'
            : isUp
            ? 'text-[var(--ok)]'
            : isDown
            ? 'text-[var(--danger)]'
            : 'text-[var(--ink-3)]';

          return (
            <div
              key={item.label}
              style={{ height: '88px' }}
              className="p-3 bg-[var(--panel)] border border-[var(--line)] rounded-[var(--r-panel)] flex flex-col justify-between"
            >
              <div className="text-xs font-mono uppercase tracking-wider text-[var(--ink-3)] font-bold">
                {item.label}
              </div>
              <div className="flex items-baseline justify-between font-mono">
                <span className="text-xl font-bold tracking-tight text-[var(--ink)] tabular-nums">
                  {item.kpi.value}
                </span>
                <div className="text-right">
                  <div className={`text-xs font-bold tabular-nums ${deltaColor}`}>
                    {delta.text}
                  </div>
                  <div className="text-xs text-[var(--ink-3)] tabular-nums">
                    n={delta.n}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Middle Row: Operations Breakdown (60%) & Device/Location (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Operations Breakdown (60%) */}
        <div className="lg:col-span-7 p-4 bg-[var(--panel)] border border-[var(--line)] rounded-[var(--r-panel)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
              <div>
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--ink)]">
                  {ADMIN_PANEL_COPY.operationsBreakdown}
                </h2>
                <p className="text-xs text-[var(--ink-3)] font-mono">
                  {ADMIN_PANEL_COPY.operationsSub}
                </p>
              </div>
              <TableToggle isTable={showOpsTable} onToggle={() => setShowOpsTable(!showOpsTable)} />
            </div>

            <div className="pt-3">
              {data.ops.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-[var(--ink-3)]">
                  {ADMIN_PANEL_COPY.noOps}
                </div>
              ) : showOpsTable ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-[var(--line)] text-xs text-[var(--ink-3)]">
                        <th className="py-1">{ADMIN_PANEL_COPY.operationHeader}</th>
                        <th className="py-1 text-right">{ADMIN_PANEL_COPY.countHeader}</th>
                        <th className="py-1 text-right">{ADMIN_PANEL_COPY.p50Header}</th>
                        <th className="py-1 text-right">{ADMIN_PANEL_COPY.p95Header}</th>
                        <th className="py-1 text-right">{ADMIN_PANEL_COPY.successHeader}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--line)]">
                      {data.ops.map((op) => (
                        <tr key={op.op} className="hover:bg-[var(--well)]">
                          <td className="py-1.5 font-bold text-[var(--ink)]">{op.op}</td>
                          <td className="py-1.5 text-right tabular-nums">{op.count}</td>
                          <td className="py-1.5 text-right tabular-nums">{op.p50_ms}ms</td>
                          <td className="py-1.5 text-right tabular-nums">{op.p95_ms}ms</td>
                          <td className="py-1.5 text-right tabular-nums text-[var(--ok)]">
                            {op.success_pct}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-1">
                  {data.ops.map((op) => (
                    <BarRow
                      key={op.op}
                      label={op.op}
                      value={op.count}
                      max={maxOpCount}
                      meta={`p50 ${op.p50_ms}ms · ${op.success_pct}% ok`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Device & Location (40%) */}
        <div className="lg:col-span-5 p-4 bg-[var(--panel)] border border-[var(--line)] rounded-[var(--r-panel)] space-y-4">
          {/* Device section */}
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--ink)]">
                {ADMIN_PANEL_COPY.deviceSpread}
              </h2>
              <TableToggle
                isTable={showDeviceTable}
                onToggle={() => setShowDeviceTable(!showDeviceTable)}
              />
            </div>

            <div className="pt-2">
              {showDeviceTable ? (
                <div className="space-y-1 font-mono text-xs">
                  {data.devices.map((d) => (
                    <div key={d.label} className="flex justify-between py-1">
                      <span className="text-[var(--ink-2)]">{d.label}</span>
                      <span className="font-bold tabular-nums">{d.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <Split
                  parts={data.devices.map((d) => ({
                    label: d.label,
                    value: d.count,
                  }))}
                />
              )}
            </div>
            {data.filtered_bots > 0 && (
              <div className="mt-2 text-xs text-[var(--ink-3)]">
                * {data.filtered_bots} crawler/bot visits filtered out by default
              </div>
            )}
          </div>

          {/* Location section */}
          <div className="pt-2 border-t border-[var(--line)]">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--ink)] mb-2">
              {ADMIN_PANEL_COPY.topLocations}
            </h2>
            <div className="space-y-1 font-mono text-xs max-h-36 overflow-y-auto">
              {data.locations.length === 0 ? (
                <span className="text-[var(--ink-3)]">{ADMIN_PANEL_COPY.noGeo}</span>
              ) : (
                data.locations.map((loc) => (
                  <div key={loc.label} className="flex justify-between py-0.5">
                    <span className="text-[var(--ink-2)]">{loc.label}</span>
                    <span className="font-bold tabular-nums text-[var(--ink)]">{loc.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: Entry / Exit Paths and Drop-off */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Entry paths */}
        <div className="p-4 bg-[var(--panel)] border border-[var(--line)] rounded-[var(--r-panel)] font-mono text-xs">
          <div className="font-bold uppercase tracking-wider text-[var(--ink)] mb-2">
            {ADMIN_PANEL_COPY.entryPaths}
          </div>
          <div className="space-y-1">
            {data.entry.slice(0, 5).map((e) => (
              <div key={e.path} className="flex justify-between py-1">
                <span style={{ maxWidth: '180px' }} className="text-[var(--ink-2)] truncate">{e.path}</span>
                <span className="font-bold tabular-nums">{e.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Exit paths */}
        <div className="p-4 bg-[var(--panel)] border border-[var(--line)] rounded-[var(--r-panel)] font-mono text-xs">
          <div className="font-bold uppercase tracking-wider text-[var(--ink)] mb-2">
            {ADMIN_PANEL_COPY.exitPaths}
          </div>
          <div className="space-y-1">
            {data.exit.slice(0, 5).map((e) => (
              <div key={e.path} className="flex justify-between py-1">
                <span style={{ maxWidth: '180px' }} className="text-[var(--ink-2)] truncate">{e.path}</span>
                <span className="font-bold tabular-nums">{e.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bounce / Drop rate */}
        <div className="p-4 bg-[var(--panel)] border border-[var(--line)] rounded-[var(--r-panel)] font-mono text-xs flex flex-col justify-between">
          <div className="font-bold uppercase tracking-wider text-[var(--ink)] mb-2">
            {ADMIN_PANEL_COPY.droppedLanding}
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold tabular-nums text-[var(--warn)]">
              {data.dropped_after_landing.pct}%
            </div>
            <div className="text-xs text-[var(--ink-3)]">
              {data.dropped_after_landing.count} visitors exited without running any operations.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
