import React, { useState, useEffect, useCallback } from 'react';

interface TacticalTelemetryBarProps {
  aoiName: string;
  onPreset?: (preset: string) => void;
}

/**
 * ISRO / RAW Agency Mission-Control Telemetry Bar.
 * Displays live UTC/IST clock, orbital pass metadata, carrier uplink stats,
 * and quick camera presets for key airport sections.
 */
export const TacticalTelemetryBar: React.FC<TacticalTelemetryBarProps> = ({
  aoiName,
  onPreset,
}) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const utc = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000)
    .toISOString()
    .replace('T', ' ')
    .substring(11, 19) + ' IST';

  const presets = [
    { key: 'runway', label: 'RUNWAY 10/28' },
    { key: 'terminal', label: 'TERMINAL T1' },
    { key: 'atc', label: 'ATC TOWER' },
    { key: 'full', label: 'FULL AOI' },
  ];

  const handlePreset = useCallback((key: string) => {
    onPreset?.(key);
  }, [onPreset]);

  return (
    <div
      className="w-full flex items-center gap-3 px-4 select-none overflow-hidden"
      style={{
        height: 32,
        background: 'var(--bg)',
        borderBottom: '1px solid var(--line)',
        zIndex: 20,
      }}
    >
      {/* Agency Lockup */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="t-tag" style={{ color: 'var(--amber)', fontSize: 9 }}>
          ISRO / SAC · MOD RECON
        </span>
        <span style={{ color: 'var(--line-strong)', fontSize: 9 }}>│</span>
        <span className="t-tag" style={{ color: 'var(--ink-3)', fontSize: 9 }}>
          SATELLITE TELEMETRY ENGINE
        </span>
      </div>

      {/* Live Mission Clock */}
      <div className="flex items-center gap-2 shrink-0">
        <span style={{ color: 'var(--line-strong)', fontSize: 9 }}>│</span>
        <span
          className="animate-dot-pulse"
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: 'var(--teal)',
            display: 'inline-block',
          }}
        />
        <span className="t-mono tabular-nums" style={{ color: 'var(--teal)', fontSize: 10 }}>
          {utc}
        </span>
        <span className="t-mono tabular-nums" style={{ color: 'var(--ink-3)', fontSize: 10 }}>
          {ist}
        </span>
      </div>

      {/* Orbital Pass */}
      <div className="hidden lg:flex items-center gap-2 shrink-0">
        <span style={{ color: 'var(--line-strong)', fontSize: 9 }}>│</span>
        <span className="t-tag" style={{ color: 'var(--ink-3)', fontSize: 8 }}>
          ORBIT: LEO-SSO 786 KM
        </span>
        <span className="t-mono tabular-nums" style={{ color: 'var(--ink-3)', fontSize: 9 }}>
          AZ: 164.2° · EL: 58.4°
        </span>
      </div>

      {/* Data Link */}
      <div className="hidden xl:flex items-center gap-2 shrink-0">
        <span style={{ color: 'var(--line-strong)', fontSize: 9 }}>│</span>
        <span className="t-tag" style={{ color: 'var(--measured-text)', fontSize: 8 }}>
          DATA LINK: 420 Mbps
        </span>
        <span className="t-mono tabular-nums" style={{ color: 'var(--ink-3)', fontSize: 9 }}>
          BER: 10⁻⁹
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Quick Camera Presets */}
      <div className="flex items-center gap-1 shrink-0">
        {presets.map((p) => (
          <button
            key={p.key}
            onClick={() => handlePreset(p.key)}
            className="t-tag px-2 py-0.5 cursor-pointer transition-all"
            style={{
              background: 'var(--panel-2)',
              border: '1px solid var(--line)',
              color: 'var(--ink-3)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 8,
              letterSpacing: '0.08em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--amber)';
              e.currentTarget.style.color = 'var(--amber)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--line)';
              e.currentTarget.style.color = 'var(--ink-3)';
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* AOI Tag */}
      <div className="hidden md:flex items-center gap-1 shrink-0">
        <span style={{ color: 'var(--line-strong)', fontSize: 9 }}>│</span>
        <span className="t-tag" style={{ color: 'var(--amber)', fontSize: 8 }}>
          AOI: {aoiName?.toUpperCase().substring(0, 30) || 'UNSET'}
        </span>
      </div>
    </div>
  );
};
