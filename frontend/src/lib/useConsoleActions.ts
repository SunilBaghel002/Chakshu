import { useCallback } from 'react';
import type { Evidence } from './types';

export interface UseConsoleActionsParams {
  activeView: string;
  setActiveView: (view: any) => void;
  selectedEvidence: Evidence | null;
  setSelectedEvidence: (ev: Evidence | null) => void;
  visibleEvidenceList: Evidence[];
  handleSwapDates: () => void;
  handleRunAnalysis: () => void;
  setIsSwipeActive: React.Dispatch<React.SetStateAction<boolean>>;
  handleConfirmEvidence: (id: string) => void;
  handleRejectEvidence: (id: string) => void;
}

export function useConsoleActions({
  activeView,
  setActiveView,
  selectedEvidence,
  setSelectedEvidence,
  visibleEvidenceList,
  handleSwapDates,
  handleRunAnalysis,
  setIsSwipeActive,
  handleConfirmEvidence,
  handleRejectEvidence,
}: UseConsoleActionsParams) {
  return useCallback(
    (actionId: string) => {
      switch (actionId) {
        case 'nav-map':
          setActiveView('map');
          break;
        case 'nav-search':
          setActiveView('search');
          break;
        case 'nav-upload':
          setActiveView('upload');
          break;
        case 'nav-review':
          setActiveView('review');
          break;
        case 'dates-swap':
          handleSwapDates();
          break;
        case 'detect-changes':
          handleRunAnalysis();
          break;
        case 'peek-stage':
          setIsSwipeActive((prev) => !prev);
          break;
        case 'close-overlay':
          if (activeView !== 'map') {
            setActiveView('map');
          } else if (selectedEvidence) {
            setSelectedEvidence(null);
          }
          break;
        case 'confirm-target':
          if (selectedEvidence) {
            handleConfirmEvidence(selectedEvidence.change_object_id);
          }
          break;
        case 'reject-target':
          if (selectedEvidence) {
            handleRejectEvidence(selectedEvidence.change_object_id);
          }
          break;
        case 'copy-id':
          if (selectedEvidence) {
            navigator.clipboard?.writeText(selectedEvidence.change_object_id);
          }
          break;
        case 'row-next': {
          if (visibleEvidenceList.length > 0) {
            const curIdx = visibleEvidenceList.findIndex(
              (e) => e.change_object_id === selectedEvidence?.change_object_id
            );
            const nextIdx = (curIdx + 1) % visibleEvidenceList.length;
            const nextEv = visibleEvidenceList[nextIdx];
            if (nextEv) setSelectedEvidence(nextEv);
          }
          break;
        }
        case 'row-prev': {
          if (visibleEvidenceList.length > 0) {
            const curIdx = visibleEvidenceList.findIndex(
              (e) => e.change_object_id === selectedEvidence?.change_object_id
            );
            const prevIdx =
              curIdx <= 0 ? visibleEvidenceList.length - 1 : curIdx - 1;
            const prevEv = visibleEvidenceList[prevIdx];
            if (prevEv) setSelectedEvidence(prevEv);
          }
          break;
        }
      }
    },
    [
      activeView,
      setActiveView,
      selectedEvidence,
      setSelectedEvidence,
      visibleEvidenceList,
      handleSwapDates,
      handleRunAnalysis,
      setIsSwipeActive,
      handleConfirmEvidence,
      handleRejectEvidence,
    ]
  );
}

export function getPresetMap(
  aoiCoords: [number, number],
  aoiBounds?: [[number, number], [number, number]]
): Record<string, { center: [number, number]; zoom?: number; bounds?: [[number, number], [number, number]]; match?: string }> {
  return {
    runway: { center: [28.1782, 77.6045], zoom: 16, bounds: [[28.1740, 77.5830], [28.1825, 77.6260]], match: 'Runway 10/28' },
    terminal: { center: [28.1748, 77.6075], zoom: 17, bounds: [[28.1725, 77.6010], [28.1772, 77.6140]], match: 'Passenger Terminal 1' },
    atc: { center: [28.1756, 77.6155], zoom: 18, bounds: [[28.1742, 77.6138], [28.1770, 77.6172]], match: 'ATC Tower' },
    full: { center: aoiCoords, zoom: 14, bounds: aoiBounds },
  };
}
