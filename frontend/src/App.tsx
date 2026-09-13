import React, { useState, useEffect, useMemo } from 'react';
import { AppHeader } from './components/AppHeader';
import { MapPane } from './components/MapPane';
import { TimelineSlider } from './components/TimelineSlider';
import { EvidenceDrawer } from './components/EvidenceDrawer';
import { AskPanel } from './components/AskPanel';
import { ReviewQueueModal } from './components/ReviewQueueModal';
import { UploadModal } from './components/UploadModal';
import { Calendar, ArrowLeftRight, Sparkles } from 'lucide-react';
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
  const [activeView, setActiveView] = useState<'map' | 'review' | 'upload' | 'ask'>('map');
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

  const handleSwapDates = () => {
    const temp = beforeDate;
    setBeforeDate(afterDate);
    setAfterDate(temp);
  };

  const handleConfirmEvidence = async (id: string) => {
    setEvidenceList((prev) =>
      prev.map((e) => (e.change_object_id === id ? { ...e, status: 'confirmed' } : e))
    );
    if (selectedEvidence?.change_object_id === id) {
      setSelectedEvidence((prev) => (prev ? { ...prev, status: 'confirmed' } : null));
    }
    await submitDecision('change_object', id, 'confirm');
  };

  const handleRejectEvidence = async (id: string) => {
    setEvidenceList((prev) =>
      prev.map((e) => (e.change_object_id === id ? { ...e, status: 'rejected' } : e))
    );
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
    const maxObservationDate = beforeDate < afterDate ? afterDate : beforeDate;
    return evidenceList.filter((ev) => {
      const date = ev.temporal.first_supported || ev.sources.after.acquired_at;
      return date <= maxObservationDate;
    });
  }, [evidenceList, beforeDate, afterDate]);

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
  const aoiCoords = useMemo<[number, number]>(() => {
    return currentAoi?.name.includes('Bhadla') ? [27.53, 71.91] : [28.1305, 77.7612];
  }, [currentAoi?.name]);

  const availableDates = Array.from(new Set(scenes.map((s) => s.acquired_at))).sort();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0B0F19] text-slate-100 font-sans">
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

      {/* Date & Trigger Controls */}
      <div className="bg-[#0D121F] border-b border-[#1F2937] px-4 py-2 flex items-center justify-between gap-3 text-xs flex-wrap z-20 shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-bold font-mono text-[11px] uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            1. Older Photo (Before):
          </span>
          <input
            type="date"
            value={beforeDate}
            min="2021-01-01"
            max="2026-12-31"
            onChange={(e) => setBeforeDate(e.target.value)}
            className="bg-[#111827] border border-slate-700 text-amber-300 font-mono font-semibold px-2 py-1 rounded text-xs focus:outline-none focus:border-amber-500 cursor-pointer shadow-inner"
          />
          <div className="hidden sm:flex items-center gap-1 text-[11px]">
            {['2021-01-15', '2022-05-20', '2023-08-10'].map((d) => (
              <button
                key={d}
                onClick={() => setBeforeDate(d)}
                className={`px-1.5 py-0.5 rounded font-mono transition-colors ${
                  beforeDate === d
                    ? 'bg-amber-500/30 text-amber-200 border border-amber-500/50 font-bold'
                    : 'text-slate-400 hover:text-white bg-slate-800/40'
                }`}
              >
                {d.split('-')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Action Buttons & Presets */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition-all"
            title="Execute bi-temporal classical CVA detection pipeline"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Detecting Changes...' : 'Detect Changes'}</span>
          </button>

          <button
            onClick={handleSwapDates}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#1E293B] hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all shadow"
            title="Swap Before and After dates"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Swap</span>
          </button>

          <div className="hidden lg:flex items-center gap-1.5 border-l border-slate-800 pl-2">
            <span className="text-slate-500 text-[11px] font-mono">Presets:</span>
            <button
              onClick={() => { setBeforeDate('2021-01-15'); setAfterDate('2026-08-18'); }}
              className="px-2 py-0.5 rounded bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/50 text-[11px] font-medium"
            >
              Full 5-Year Build
            </button>
            <button
              onClick={() => { setBeforeDate('2021-01-15'); setAfterDate('2023-08-10'); }}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px]"
            >
              Earthworks
            </button>
            <button
              onClick={() => { setBeforeDate('2023-08-10'); setAfterDate('2026-08-18'); }}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px]"
            >
              Runway & Terminal
            </button>
          </div>
        </div>

        {/* Right: Newest Observation After Date */}
        <div className="flex items-center gap-2">
          <span className="text-indigo-400 font-bold font-mono text-[11px] uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            2. Newer Photo (After):
          </span>
          <input
            type="date"
            value={afterDate}
            min="2021-01-01"
            max="2026-12-31"
            onChange={(e) => setAfterDate(e.target.value)}
            className="bg-[#111827] border border-slate-700 text-indigo-300 font-mono font-semibold px-2 py-1 rounded text-xs focus:outline-none focus:border-indigo-500 cursor-pointer shadow-inner"
          />
          <div className="hidden sm:flex items-center gap-1 text-[11px]">
            {['2024-04-12', '2025-03-18', '2026-08-18'].map((d) => (
              <button
                key={d}
                onClick={() => setAfterDate(d)}
                className={`px-1.5 py-0.5 rounded font-mono transition-colors ${
                  afterDate === d ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white bg-slate-800/40'
                }`}
              >
                {d.split('-')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Map & Drawer Stage */}
      <div className="flex-1 flex overflow-hidden relative">
        <main className="flex-1 flex flex-col relative overflow-hidden bg-[#070A10]">
          <div className="flex-1 relative overflow-hidden">
            <MapPane
              selectedAoiId={selectedAoiId}
              aoiCoords={aoiCoords}
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
              onSelectBeforeDate={setBeforeDate}
              onSelectAfterDate={setAfterDate}
              onSwapDates={handleSwapDates}
            />

            {activeView === 'ask' && (
              <div className="absolute left-6 top-6 z-[500] drop-shadow-2xl">
                <AskPanel aoiId={selectedAoiId} onClose={() => setActiveView('map')} />
              </div>
            )}
          </div>

          <TimelineSlider
            scenes={scenes}
            beforeDate={beforeDate}
            afterDate={afterDate}
            onSelectBeforeDate={setBeforeDate}
            onSelectAfterDate={setAfterDate}
          />
        </main>

        {selectedEvidence && (
          <EvidenceDrawer
            evidence={selectedEvidence}
            onClose={() => setSelectedEvidence(null)}
            onConfirm={handleConfirmEvidence}
            onReject={handleRejectEvidence}
          />
        )}
      </div>

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

      {activeView === 'upload' && detectionSet && (
        <UploadModal
          detectionSet={detectionSet}
          onClose={() => setActiveView('map')}
          onLoadSample={async (type) => {
            const res = await getDetections(type);
            if (res.kind === 'ok') setDetectionSet(res.data);
          }}
        />
      )}
    </div>
  );
};
