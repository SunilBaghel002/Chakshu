import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppHeader } from './components/AppHeader';
import { DataStreamMarquee } from './components/DataStreamMarquee';
import { TacticalTelemetryBar } from './components/TacticalTelemetryBar';
import { IconRail, type NavView } from './components/IconRail';
import { StatusLine } from './components/StatusLine';
import { AmbientScanline } from './components/AmbientScanline';
import { MapPane } from './components/MapPane';
import { TimelineSlider } from './components/TimelineSlider';
import { EvidenceDrawer } from './components/EvidenceDrawer';
import { AskPanel } from './components/AskPanel';
import { ReviewQueueModal } from './components/ReviewQueueModal';
import { UploadModal } from './components/UploadModal';
import { SearchModal } from './components/SearchModal';
import { TemporalBar } from './components/TemporalBar';
import {
  getAois,
  getScenes,
  getChangeSummary,
  getEvidenceList,
  getDetections,
  triggerAoiAnalyse,
  submitDecision,
  isMockMode,
  setMockMode,
  type AoiItem,
  type SceneItem,
} from './lib/api';
import type { Evidence, ChangeSummary, DetectionSet } from './lib/types';
import {
  enforceMinGapForBefore,
  enforceMinGapForAfter,
} from './lib/satelliteProviders';

export const App: React.FC = () => {
  const [aois, setAois] = useState<AoiItem[]>([]);
  const [selectedAoiId, setSelectedAoiId] = useState<string>('');
  const [scenes, setScenes] = useState<SceneItem[]>([]);
  const [, setCurrentScene] = useState<SceneItem | null>(null);
  const [, setChangeSummary] = useState<ChangeSummary | null>(null);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [detectionSet, setDetectionSet] = useState<DetectionSet | null>(null);

  // Date states for Before and After
  const [beforeDate, setBeforeDate] = useState<string>('2021-01-15');
  const [afterDate, setAfterDate] = useState<string>('2026-08-18');

  // UI state
  const [activeView, setActiveView] = useState<NavView>('map');
  const [isMock, setIsMock] = useState<boolean>(isMockMode());
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [isSwipeActive, setIsSwipeActive] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Load initial AOIs
  useEffect(() => {
    async function init() {
      const aoiRes = await getAois();
      if (aoiRes.kind === 'ok' && aoiRes.data.length > 0) {
        setAois(aoiRes.data);
        const defaultAoi = aoiRes.data[0];
        if (defaultAoi) setSelectedAoiId(defaultAoi.id);
      }
    }
    init();
  }, []);

  // When AOI changes, load scenes, summary, evidence, and detections
  useEffect(() => {
    if (!selectedAoiId) return;

    async function loadAoiData() {
      const [scenesRes, sumRes, evListRes, detRes] = await Promise.all([
        getScenes(selectedAoiId),
        getChangeSummary(selectedAoiId),
        getEvidenceList(selectedAoiId),
        getDetections('jewar_crop'),
      ]);

      if (scenesRes.kind === 'ok' && scenesRes.data.length > 0) {
        // Sort chronologically (oldest baseline first, newest observation last)
        const sorted = [...scenesRes.data].sort((a, b) => a.acquired_at.localeCompare(b.acquired_at));
        setScenes(sorted);
        const firstUsable = sorted.find((s) => s.usable) || sorted[0];
        const lastUsable = [...sorted].reverse().find((s) => s.usable) || sorted[sorted.length - 1];
        if (firstUsable) setBeforeDate(firstUsable.acquired_at);
        if (lastUsable) {
          setAfterDate(lastUsable.acquired_at);
          setCurrentScene(lastUsable);
        }
      }

      if (sumRes.kind === 'ok') setChangeSummary(sumRes.data);

      if (evListRes.kind === 'ok') {
        setEvidenceList(evListRes.data);
        if (evListRes.data.length > 0 && evListRes.data[0]) {
          setSelectedEvidence(evListRes.data[0]);
        }
      }

      if (detRes.kind === 'ok') setDetectionSet(detRes.data);
    }

    loadAoiData();
  }, [selectedAoiId]);

  const handleToggleMock = () => {
    const next = !isMock;
    setMockMode(next);
    setIsMock(next);
  };

  const handleSelectBeforeDate = useCallback((newBefore: string) => {
    const { before, after } = enforceMinGapForBefore(newBefore, afterDate);
    setBeforeDate(before);
    if (after !== afterDate) setAfterDate(after);
  }, [afterDate]);

  const handleSelectAfterDate = useCallback((newAfter: string) => {
    const { before, after } = enforceMinGapForAfter(newAfter, beforeDate);
    setAfterDate(after);
    if (before !== beforeDate) setBeforeDate(before);
  }, [beforeDate]);

  const handleSwapDates = () => {
    const temp = beforeDate;
    setBeforeDate(afterDate);
    setAfterDate(temp);
  };

  const handleConfirmEvidence = async (id: string) => {
    setEvidenceList((prev) => prev.map((e) => (e.change_object_id === id ? { ...e, status: 'confirmed' } : e)));
    if (selectedEvidence?.change_object_id === id) {
      setSelectedEvidence((prev) => (prev ? { ...prev, status: 'confirmed' } : null));
    }
    await submitDecision('change_object', id, 'confirm');
  };

  const handleRejectEvidence = async (id: string) => {
    setEvidenceList((prev) => prev.map((e) => (e.change_object_id === id ? { ...e, status: 'rejected' } : e)));
    if (selectedEvidence?.change_object_id === id) {
      setSelectedEvidence((prev) => (prev ? { ...prev, status: 'rejected' } : null));
    }
    await submitDecision('change_object', id, 'reject');
  };

  const handleRunAnalysis = async () => {
    if (!selectedAoiId || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const res = await triggerAoiAnalyse(selectedAoiId);
      if (res.kind === 'ok') {
        setTimeout(async () => {
          const [evListRes, sumRes] = await Promise.all([
            getEvidenceList(selectedAoiId),
            getChangeSummary(selectedAoiId),
          ]);
          if (evListRes.kind === 'ok') {
            setEvidenceList(evListRes.data);
            if (evListRes.data.length > 0 && !selectedEvidence) {
              const first = evListRes.data[0];
              if (first) setSelectedEvidence(first);
            }
          }
          if (sumRes.kind === 'ok') setChangeSummary(sumRes.data);
          setIsAnalyzing(false);
        }, 1800);
      } else {
        setIsAnalyzing(false);
      }
    } catch {
      setIsAnalyzing(false);
    }
  };

  const visibleEvidenceList = useMemo(() => {
    // Always show all evidence — temporal pre-existing styling in useMapPolygons
    // handles visual differentiation (dimmed for pre-existing, bright for new).
    // Filtering here was causing polygons to vanish on date changes.
    return evidenceList;
  }, [evidenceList]);

  const totalAreaM2 = useMemo(() => {
    return visibleEvidenceList.reduce((acc, ev) => acc + (ev.measurement.area_m2 || 0), 0);
  }, [visibleEvidenceList]);

  const totalAreaLabel = useMemo(() => {
    if (totalAreaM2 >= 10000) return `${(totalAreaM2 / 10000).toFixed(2)} ha`;
    return `${Math.round(totalAreaM2)} m²`;
  }, [totalAreaM2]);

  useEffect(() => {
    if (visibleEvidenceList.length > 0) {
      const exists = visibleEvidenceList.some((e) => e.change_object_id === selectedEvidence?.change_object_id);
      if (!exists) {
        const last = visibleEvidenceList[visibleEvidenceList.length - 1];
        if (last) setSelectedEvidence(last);
      }
    }
  }, [visibleEvidenceList, selectedEvidence]);

  const currentAoi = aois.find((a) => a.id === selectedAoiId);

  // Compute center and bounds dynamically from AOI polygon geometry
  const { aoiCoords, aoiBounds } = useMemo(() => {
    const geom = currentAoi?.geom as { coordinates?: [number, number][][] } | undefined;
    if (geom?.coordinates?.[0]) {
      const ring = geom.coordinates[0];
      let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
      for (const [lon, lat] of ring) {
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
      return {
        aoiCoords: [(minLat + maxLat) / 2, (minLon + maxLon) / 2] as [number, number],
        aoiBounds: [[minLat, minLon], [maxLat, maxLon]] as [[number, number], [number, number]],
      };
    }
    return { aoiCoords: [28.1725, 77.6125] as [number, number], aoiBounds: [[28.155, 77.580], [28.190, 77.645]] as [[number, number], [number, number]] };
  }, [currentAoi]);

  const availableDates = Array.from(new Set(scenes.map((s) => s.acquired_at))).sort();

  // Camera preset handler for TacticalTelemetryBar
  const handlePreset = useCallback((preset: string) => {
    const presetMap: Record<string, { center: [number, number]; zoom?: number; bounds?: [[number, number], [number, number]]; match?: string }> = {
      runway: { center: [28.1782, 77.6045], zoom: 16, bounds: [[28.1740, 77.5830], [28.1825, 77.6260]], match: 'Runway 10/28' },
      terminal: { center: [28.1748, 77.6075], zoom: 17, bounds: [[28.1725, 77.6010], [28.1772, 77.6140]], match: 'Passenger Terminal 1' },
      atc: { center: [28.1756, 77.6155], zoom: 18, bounds: [[28.1742, 77.6138], [28.1770, 77.6172]], match: 'ATC Tower' },
      full: { center: aoiCoords, zoom: 14, bounds: aoiBounds },
    };
    const p = presetMap[preset];
    if (p) {
      setPresetTarget(p);
      if (p.match) {
        const ev = evidenceList.find((e) => e.measurement.measured_by?.includes(p.match!));
        if (ev) setSelectedEvidence(ev);
      } else if (preset === 'full') {
        setSelectedEvidence(null);
      }
    }
  }, [aoiCoords, aoiBounds, evidenceList]);

  const [presetTarget, setPresetTarget] = useState<{ center: [number, number]; zoom?: number; bounds?: [[number, number], [number, number]] } | null>(null);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      {/* SLOT-00: Data Stream Marquee */}
      <DataStreamMarquee />

      {/* ISRO/RAW Tactical Telemetry Bar */}
      <TacticalTelemetryBar
        aoiName={currentAoi?.name ?? 'Jewar Airport'}
        onPreset={handlePreset}
      />

      {/* SLOT-01: Command Bar */}
      <AppHeader
        aois={aois}
        selectedAoiId={selectedAoiId}
        onSelectAoi={setSelectedAoiId}
        activeView={activeView}
        onSelectView={setActiveView}
        isMock={isMock}
        onToggleMock={handleToggleMock}
        areaLabel={totalAreaLabel}
        sceneCount={scenes.length || 36}
        usableScenes={scenes.filter((s) => s.usable).length || 29}
      />

      {/* SLOT-02: Temporal Bar */}
      <TemporalBar
        beforeDate={beforeDate}
        afterDate={afterDate}
        onBeforeDateChange={handleSelectBeforeDate}
        onAfterDateChange={handleSelectAfterDate}
        onSwapDates={handleSwapDates}
        onRunAnalysis={handleRunAnalysis}
        isAnalyzing={isAnalyzing}
      />

      {/* Main Stage: SLOT-05 Rail + SLOT-10 Map + SLOT-20 Dossier */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* SLOT-05: Icon Rail */}
        <IconRail activeView={activeView} onSelectView={setActiveView} />

        {/* SLOT-10: Map Stage + SLOT-30: Timeline */}
        <main className="flex-1 flex flex-col relative overflow-hidden" style={{ background: 'var(--well)' }}>
          <div className="flex-1 relative overflow-hidden">
            <MapPane
              selectedAoiId={selectedAoiId}
              aoiCoords={aoiCoords}
              aoiBounds={aoiBounds}
              aoiName={currentAoi?.name ?? 'Jewar Airport'}
              evidenceList={visibleEvidenceList}
              selectedEvidenceId={selectedEvidence?.change_object_id ?? null}
              onSelectEvidence={setSelectedEvidence}
              detectionSet={detectionSet}
              sliderPos={sliderPos}
              onSliderChange={setSliderPos}
              isSwipeActive={isSwipeActive}
              onToggleSwipe={() => setIsSwipeActive(!isSwipeActive)}
              beforeDate={beforeDate}
              afterDate={afterDate}
              availableDates={availableDates}
              onSelectBeforeDate={handleSelectBeforeDate}
              onSelectAfterDate={handleSelectAfterDate}
              onSwapDates={handleSwapDates}
              presetTarget={presetTarget}
              onPresetConsumed={() => setPresetTarget(null)}
            />
          </div>

          {/* SLOT-30: Timeline Strip */}
          <TimelineSlider
            scenes={scenes}
            beforeDate={beforeDate}
            afterDate={afterDate}
            onSelectBeforeDate={handleSelectBeforeDate}
            onSelectAfterDate={handleSelectAfterDate}
          />
        </main>

        {/* SLOT-20: Dossier */}
        {selectedEvidence && (
          <EvidenceDrawer
            evidence={selectedEvidence}
            onClose={() => setSelectedEvidence(null)}
            onConfirm={handleConfirmEvidence}
            onReject={handleRejectEvidence}
          />
        )}
      </div>

      {/* SLOT-40: Status Line */}
      <StatusLine
        jobState={isAnalyzing ? 'ANALYSING' : 'READY'}
        lastAction={selectedEvidence ? `Inspecting ${selectedEvidence.change_type}` : 'AOI loaded'}
      />

      {/* M9: Ambient Scanline */}
      <AmbientScanline />

      {/* Modals */}
      {activeView === 'review' && (
        <ReviewQueueModal
          evidenceList={visibleEvidenceList}
          onSelectEvidence={(ev) => {
            setSelectedEvidence(ev);
            setActiveView('map');
          }}
          onConfirm={handleConfirmEvidence}
          onReject={handleRejectEvidence}
          onClose={() => setActiveView('map')}
        />
      )}

      {/* Upload Aerial / Satellite Image Modal */}
      {activeView === 'upload' && (
        <UploadModal
          detectionSet={detectionSet}
          onClose={() => setActiveView('map')}
          onDetectionSetUpdate={(newSet) => {
            setDetectionSet(newSet);
          }}
        />
      )}

      {/* Ask AI Intelligence Panel */}
      {activeView === 'ask' && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
          <AskPanel aoiId={selectedAoiId} onClose={() => setActiveView('map')} />
        </div>
      )}

      {/* OpenCLIP Semantic Vector Search Modal */}
      {activeView === 'search' && (
        <SearchModal
          aoiId={selectedAoiId}
          onClose={() => setActiveView('map')}
        />
      )}
    </div>
  );
};
