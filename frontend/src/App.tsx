import React, { useState, useEffect, useMemo } from 'react';
import { AppHeader } from './components/AppHeader';
import { MapPane } from './components/MapPane';
import { TimelineSlider } from './components/TimelineSlider';
import { EvidenceDrawer } from './components/EvidenceDrawer';
import { AskPanel } from './components/AskPanel';
import { ReviewQueueModal } from './components/ReviewQueueModal';
import { UploadModal } from './components/UploadModal';
import { SearchModal } from './components/SearchModal';
import { ComparisonControlBar } from './components/ComparisonControlBar';
import { Layers, Search, UploadCloud, CheckCircle2, MessageSquare } from 'lucide-react';
import {
  getAois,
  getScenes,
  getChangeSummary,
  getEvidenceList,
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

  // Date states for Before (Old baseline) and After (Recent observation)
  const [beforeDate, setBeforeDate] = useState<string>('2021-01-15');
  const [afterDate, setAfterDate] = useState<string>('2026-08-18');

  // UI state
  const [activeView, setActiveView] = useState<'map' | 'review' | 'upload' | 'ask' | 'search'>('map');
  const [isMock, setIsMock] = useState<boolean>(isMockMode());
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [isSwipeActive, setIsSwipeActive] = useState<boolean>(true);

  // Load initial data
  useEffect(() => {
    async function init() {
      const aoiRes = await getAois();
      if (aoiRes.kind === 'ok' && aoiRes.data.length > 0) {
        setAois(aoiRes.data);
        const defaultAoi = aoiRes.data[0];
        if (defaultAoi) {
          setSelectedAoiId(defaultAoi.id);
        }
      }
    }
    init();
  }, []);

  // When AOI changes, load scenes, summary, evidence, and detections
  useEffect(() => {
    if (!selectedAoiId) return;

    async function loadAoiData() {
      const scenesRes = await getScenes(selectedAoiId);
      if (scenesRes.kind === 'ok' && scenesRes.data.length > 0) {
        setScenes(scenesRes.data);
        const firstUsable = scenesRes.data.find((s) => s.usable) || scenesRes.data[0];
        const lastUsable =
          [...scenesRes.data].reverse().find((s) => s.usable) || scenesRes.data[scenesRes.data.length - 1];
        if (firstUsable) setBeforeDate(firstUsable.acquired_at);
        if (lastUsable) {
          setAfterDate(lastUsable.acquired_at);
          setCurrentScene(lastUsable);
        }
      }

      const sumRes = await getChangeSummary(selectedAoiId);
      if (sumRes.kind === 'ok') {
        setChangeSummary(sumRes.data);
      }

      const evListRes = await getEvidenceList(selectedAoiId);
      if (evListRes.kind === 'ok') {
        setEvidenceList(evListRes.data);
        if (evListRes.data.length > 0 && evListRes.data[0]) {
          setSelectedEvidence(evListRes.data[0]);
        }
      }
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

  // Dynamic filtering of evidence based on selected afterDate
  const visibleEvidenceList = useMemo(() => {
    return evidenceList.filter((ev) => {
      const date = ev.temporal.first_supported || ev.sources.after.acquired_at;
      return date <= afterDate;
    });
  }, [evidenceList, afterDate]);

  // Compute total area dynamically based on visible evidence
  const totalAreaM2 = useMemo(() => {
    return visibleEvidenceList.reduce((acc, ev) => acc + (ev.measurement.area_m2 || 0), 0);
  }, [visibleEvidenceList]);

  const totalAreaLabel = useMemo(() => {
    if (totalAreaM2 >= 10000) {
      return `${(totalAreaM2 / 10000).toFixed(2)} ha`;
    }
    return `${Math.round(totalAreaM2)} m²`;
  }, [totalAreaM2]);

  // Ensure selected evidence is in visible set
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
  const aoiCoords: [number, number] =
    currentAoi?.name.includes('Bhadla') ? [27.53, 71.91] : [28.1305, 77.7612];

  const availableDates = Array.from(new Set(scenes.map((s) => s.acquired_at))).sort();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#080B10] text-slate-100 font-sans">
      {/* Top Application Bar with Telemetry */}
      <AppHeader
        aois={aois}
        selectedAoiId={selectedAoiId}
        onSelectAoi={setSelectedAoiId}
        activeView={activeView}
        onSelectView={setActiveView}
        isMock={isMock}
        onToggleMock={handleToggleMock}
        areaLabel={totalAreaLabel}
        sceneCount={scenes.length || 56}
        usableScenes={scenes.filter((s) => s.usable).length || 56}
      />

      {/* Interactive Date & Comparison Controls Bar */}
      <ComparisonControlBar
        beforeDate={beforeDate}
        afterDate={afterDate}
        scenes={scenes}
        onSelectBeforeDate={setBeforeDate}
        onSelectAfterDate={setAfterDate}
        onSwapDates={handleSwapDates}
        onDetectChanges={() => {
          if (scenes.length > 0) {
            const cur = scenes.find((s) => s.acquired_at === afterDate) || scenes[scenes.length - 1];
            if (cur) setCurrentScene(cur);
          }
        }}
      />

      {/* Main Workspace: Left Sidebar + Satellite Map + Right Evidence Drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Tactical Navigation Sidebar */}
        <nav className="w-14 bg-[#080B10] border-r border-[#1C2333] flex flex-col items-center py-2 gap-3 z-20 select-none shrink-0">
          <button
            onClick={() => setActiveView('map')}
            className={`w-11 h-11 rounded flex flex-col items-center justify-center transition-all ${
              activeView === 'map'
                ? 'bg-[#111622] text-[#F2B84B] border-l-2 border-[#F2B84B] shadow-[0_0_10px_rgba(242,184,75,0.2)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
            title="Satellite Map Workspace"
          >
            <Layers className="w-4 h-4" />
            <span className="text-[8px] font-mono font-bold mt-0.5">MAP</span>
          </button>

          <button
            onClick={() => setActiveView('search')}
            className={`w-11 h-11 rounded flex flex-col items-center justify-center transition-all ${
              activeView === 'search'
                ? 'bg-[#111622] text-[#F2B84B] border-l-2 border-[#F2B84B]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
            title="Search Location / Features"
          >
            <Search className="w-4 h-4" />
            <span className="text-[8px] font-mono font-bold mt-0.5">SEARCH</span>
          </button>

          <button
            onClick={() => setActiveView('upload')}
            className={`w-11 h-11 rounded flex flex-col items-center justify-center transition-all ${
              activeView === 'upload'
                ? 'bg-[#111622] text-[#F2B84B] border-l-2 border-[#F2B84B]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
            title="Upload Aerial / Satellite Photo"
          >
            <UploadCloud className="w-4 h-4" />
            <span className="text-[8px] font-mono font-bold mt-0.5">UPLOAD</span>
          </button>

          <button
            onClick={() => setActiveView('review')}
            className={`w-11 h-11 rounded flex flex-col items-center justify-center transition-all ${
              activeView === 'review'
                ? 'bg-[#111622] text-[#F2B84B] border-l-2 border-[#F2B84B]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
            title="Review Detected Changes"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-[8px] font-mono font-bold mt-0.5">REVIEW</span>
          </button>

          <button
            onClick={() => setActiveView('ask')}
            className={`w-11 h-11 rounded flex flex-col items-center justify-center transition-all ${
              activeView === 'ask'
                ? 'bg-[#111622] text-[#F2B84B] border-l-2 border-[#F2B84B]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
            title="Ask AI Intelligence"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-[8px] font-mono font-bold mt-0.5">ASK</span>
          </button>
        </nav>

        {/* Map & Timeline Main Stage */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-[#05070A]">
          <div className="flex-1 relative overflow-hidden">
            <MapPane
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
          </div>

          {/* Bottom Timeline Scrubber */}
          <TimelineSlider
            scenes={scenes}
            beforeDate={beforeDate}
            afterDate={afterDate}
            onSelectBeforeDate={setBeforeDate}
            onSelectAfterDate={setAfterDate}
          />
        </main>

        {/* Right Evidence Inspection Drawer */}
        {selectedEvidence && (
          <EvidenceDrawer
            evidence={selectedEvidence}
            onClose={() => setSelectedEvidence(null)}
            onConfirm={(id) => {
              setEvidenceList((prev) =>
                prev.map((e) => (e.change_object_id === id ? { ...e, status: 'confirmed' } : e))
              );
            }}
            onReject={(id) => {
              setEvidenceList((prev) =>
                prev.map((e) => (e.change_object_id === id ? { ...e, status: 'rejected' } : e))
              );
            }}
          />
        )}
      </div>

      {/* Review Queue Modal */}
      {activeView === 'review' && (
        <ReviewQueueModal
          evidenceList={visibleEvidenceList}
          onSelectEvidence={(ev) => {
            setSelectedEvidence(ev);
            setActiveView('map');
          }}
          onConfirm={(id) => {
            setEvidenceList((prev) =>
              prev.map((e) => (e.change_object_id === id ? { ...e, status: 'confirmed' } : e))
            );
          }}
          onReject={(id) => {
            setEvidenceList((prev) =>
              prev.map((e) => (e.change_object_id === id ? { ...e, status: 'rejected' } : e))
            );
          }}
          onClose={() => setActiveView('map')}
        />
      )}

      {/* Ask AI Centered Modal */}
      {activeView === 'ask' && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
          <AskPanel aoiId={selectedAoiId} onClose={() => setActiveView('map')} />
        </div>
      )}

      {/* Single-Image Upload Modal */}
      {activeView === 'upload' && (
        <UploadModal
          detectionSet={detectionSet}
          onClose={() => setActiveView('map')}
          onDetectionSetUpdate={(newSet) => {
            setDetectionSet(newSet);
          }}
        />
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
