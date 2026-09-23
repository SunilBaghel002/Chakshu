import { useState, useEffect, useMemo, useCallback } from 'react';
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
} from './api';
import type { Evidence, ChangeSummary, DetectionSet } from './types';
import { enforceMinGapForBefore, enforceMinGapForAfter } from './satelliteProviders';
import { useConsoleActions, getPresetMap } from './useConsoleActions';
import { TOAST_COPY } from './copy';
import { track } from './track';

interface UseConsoleStateParams {
  showToast: (toast: { message: string; onUndo?: () => void }) => void;
}

export function useConsoleState({ showToast }: UseConsoleStateParams) {
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

  // UI view state
  const initialView = useMemo(() => {
    if (typeof window === 'undefined') return 'map';
    const params = new URLSearchParams(window.location.search);
    const v = params.get('screen') || params.get('view');
    if (
      v === 'upload' ||
      v === 'review' ||
      v === 'ask' ||
      v === 'search' ||
      v === 'audit'
    ) {
      return v;
    }
    return 'map';
  }, []);

  const [activeView, setActiveView] = useState<
    'map' | 'review' | 'upload' | 'ask' | 'search' | 'audit'
  >(initialView);
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
        const sorted = [...scenesRes.data].sort((a, b) =>
          a.acquired_at.localeCompare(b.acquired_at)
        );
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

  const handleSelectBeforeDate = useCallback(
    (newBefore: string) => {
      const { before, after } = enforceMinGapForBefore(newBefore, afterDate);
      setBeforeDate(before);
      if (after !== afterDate) setAfterDate(after);
    },
    [afterDate]
  );

  const handleSelectAfterDate = useCallback(
    (newAfter: string) => {
      const { before, after } = enforceMinGapForAfter(newAfter, beforeDate);
      setAfterDate(after);
      if (before !== beforeDate) setBeforeDate(before);
    },
    [beforeDate]
  );

  const handleSwapDates = () => {
    const temp = beforeDate;
    setBeforeDate(afterDate);
    setAfterDate(temp);
  };

  const handleDetectChanges = async () => {
    if (!selectedAoiId || isAnalyzing) return;
    const t0 = performance.now();
    track('op.start', { op: 'change_detect', aoi_id: selectedAoiId });
    setIsAnalyzing(true);
    const res = await triggerAoiAnalyse(selectedAoiId);
    const duration = Math.round(performance.now() - t0);
    if (res.kind === 'ok') {
      const updated = await getEvidenceList(selectedAoiId);
      if (updated.kind === 'ok') {
        setEvidenceList(updated.data);
        if (updated.data.length > 0 && updated.data[0]) {
          setSelectedEvidence(updated.data[0]);
        }
      }
      track('op.result', { op: 'change_detect', aoi_id: selectedAoiId }, { duration_ms: duration, ok: true });
    } else {
      track('op.error', { op: 'change_detect', aoi_id: selectedAoiId, error: res.kind }, { duration_ms: duration, ok: false });
    }
    setIsAnalyzing(false);
  };

  const handleConfirmEvidence = async (id: string) => {
    const prevEvidence = evidenceList.find((e) => e.change_object_id === id);
    const prevStatus = prevEvidence?.status ?? 'pending';

    await submitDecision('evidence', id, 'confirm');
    setEvidenceList((prev) =>
      prev.map((e) => (e.change_object_id === id ? { ...e, status: 'confirmed' } : e))
    );
    showToast({
      message: TOAST_COPY.targetConfirmed,
      onUndo: async () => {
        await submitDecision('evidence', id, prevStatus === 'confirmed' ? 'confirm' : 'reject');
        setEvidenceList((prev) =>
          prev.map((e) => (e.change_object_id === id ? { ...e, status: prevStatus } : e))
        );
        showToast({ message: TOAST_COPY.undone });
      },
    });
  };

  const handleRejectEvidence = async (id: string) => {
    const prevEvidence = evidenceList.find((e) => e.change_object_id === id);
    const prevStatus = prevEvidence?.status ?? 'pending';

    await submitDecision('evidence', id, 'reject');
    setEvidenceList((prev) =>
      prev.map((e) => (e.change_object_id === id ? { ...e, status: 'rejected' } : e))
    );
    showToast({
      message: TOAST_COPY.targetRejected,
      onUndo: async () => {
        await submitDecision('evidence', id, prevStatus === 'confirmed' ? 'confirm' : 'reject');
        setEvidenceList((prev) =>
          prev.map((e) => (e.change_object_id === id ? { ...e, status: prevStatus } : e))
        );
        showToast({ message: TOAST_COPY.undone });
      },
    });
  };

  const currentAoi = aois.find((a) => a.id === selectedAoiId);
  const { aoiCoords, aoiBounds } = useMemo(() => {
    const geom = currentAoi?.geom as { coordinates?: [number, number][][] } | undefined;
    if (geom?.coordinates?.[0]) {
      const ring = geom.coordinates[0];
      let minLon = Infinity;
      let maxLon = -Infinity;
      let minLat = Infinity;
      let maxLat = -Infinity;
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
    return {
      aoiCoords: [28.1725, 77.6125] as [number, number],
      aoiBounds: [[28.155, 77.580], [28.190, 77.645]] as [[number, number], [number, number]],
    };
  }, [currentAoi]);

  const availableDates = useMemo(() => scenes.map((s) => s.acquired_at), [scenes]);
  const visibleEvidenceList = useMemo(() => evidenceList, [evidenceList]);

  const totalAreaM2 = useMemo(() => {
    return visibleEvidenceList.reduce((acc, ev) => acc + (ev.measurement.area_m2 || 0), 0);
  }, [visibleEvidenceList]);

  const totalAreaLabel = useMemo(() => {
    if (totalAreaM2 >= 10000) return `${(totalAreaM2 / 10000).toFixed(2)} ha`;
    return `${Math.round(totalAreaM2)} m²`;
  }, [totalAreaM2]);

  const presetMap = useMemo(
    () => getPresetMap(aoiCoords, aoiBounds),
    [aoiCoords, aoiBounds]
  );

  const [presetTarget, setPresetTarget] = useState<{
    center: [number, number];
    zoom?: number;
    bounds?: [[number, number], [number, number]];
  } | null>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('preset');
      if (p === 'change' || p === 'runway') {
        return {
          center: [28.1782, 77.6045],
          zoom: 16,
          bounds: [[28.1740, 77.5830], [28.1825, 77.6260]],
        };
      }
    }
    return null;
  });

  const handleShortcutAction = useConsoleActions({
    activeView,
    setActiveView,
    selectedEvidence,
    setSelectedEvidence,
    visibleEvidenceList,
    handleSwapDates,
    handleRunAnalysis: handleDetectChanges,
    setIsSwipeActive,
    handleConfirmEvidence,
    handleRejectEvidence,
  });

  return {
    aois,
    selectedAoiId,
    setSelectedAoiId,
    scenes,
    evidenceList: visibleEvidenceList,
    selectedEvidence,
    setSelectedEvidence,
    detectionSet,
    beforeDate,
    afterDate,
    activeView,
    setActiveView,
    isMock,
    handleToggleMock,
    sliderPos,
    setSliderPos,
    isSwipeActive,
    setIsSwipeActive,
    isAnalyzing,
    handleSelectBeforeDate,
    handleSelectAfterDate,
    handleSwapDates,
    handleDetectChanges,
    handleConfirmEvidence,
    handleRejectEvidence,
    currentAoi,
    aoiCoords,
    aoiBounds,
    availableDates,
    totalAreaLabel,
    presetMap,
    presetTarget,
    setPresetTarget,
    handleShortcutAction,
  };
}
