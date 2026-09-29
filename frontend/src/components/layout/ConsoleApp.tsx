import React from 'react';
import { ConsoleShell } from './ConsoleShell';
import { AppHeader } from '../AppHeader';
import { TemporalBar } from '../TemporalBar';
import { IconRail } from '../IconRail';
import { MapPane } from '../MapPane';
import { TimelineSlider } from '../TimelineSlider';
import { EvidenceDrawer } from '../EvidenceDrawer';
import { StatusLine } from '../StatusLine';
import { AmbientScanline } from '../AmbientScanline';
import { ExportModal } from '../ExportModal';
import type { MapAnnotationState } from '../../lib/useMapAnnotations';

// Screens mapped onto standard slots (PRD 10 §5 / L5)
import { UploadBar } from '../upload/UploadBar';
import { UploadDropzone } from '../upload/UploadDropzone';
import { UploadManifestPanel } from '../upload/UploadManifestPanel';
import { UploadProgressStrip } from '../upload/UploadProgressStrip';

import { ReviewQueuePanel } from '../review/ReviewQueuePanel';

import { AskBar } from '../ask/AskBar';
import { AskAnswerPanel } from '../ask/AskAnswerPanel';
import { AskHistoryStrip } from '../ask/AskHistoryStrip';

import { SearchBar } from '../search/SearchBar';
import { SearchResultsPanel } from '../search/SearchResultsPanel';
import { SearchDateStrip } from '../search/SearchDateStrip';
import { AuditPanel } from '../audit/AuditPanel';

import { useToast } from '../ui/Toast';
import { useAppScreens } from '../../lib/useAppScreens';
import { useConsoleState } from '../../lib/useConsoleState';

export const ConsoleApp: React.FC = () => {
  const { showToast } = useToast();
  const screens = useAppScreens(showToast);
  const state = useConsoleState({ showToast });

  // Ensure body overflow:hidden for console mode
  React.useEffect(() => {
    document.body.classList.add('console-body');
    return () => { document.body.classList.remove('console-body'); };
  }, []);

  const {
    aois,
    selectedAoiId,
    setSelectedAoiId,
    scenes,
    evidenceList,
    selectedEvidence,
    setSelectedEvidence,
    detectionSet,
    beforeDate,
    afterDate,
    showClouds,
    handleToggleClouds,
    showPolygons,
    handleTogglePolygons,
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
    presetTarget,
    setPresetTarget,
    handleShortcutAction,
  } = state;

  const hasActiveDossier = Boolean(
    activeView === 'upload' ||
      activeView === 'ask' ||
      activeView === 'search' ||
      activeView === 'review' ||
      activeView === 'audit' ||
      selectedEvidence
  );

  const [askAnnotationState, setAskAnnotationState] = React.useState<MapAnnotationState | null>(null);

  // Handle dynamic map annotation actions (SIH26167 §8, §9)
  const handleAnnotationActions = React.useCallback(
    (
      ids: string[],
      actions: any[],
      labels: Record<string, string>,
      target?: string,
      bbox?: number[]
    ) => {
      const isClear = actions.some((a) => a.action === 'clear_annotations');
      if (isClear || !ids.length) {
        setAskAnnotationState(null);
        return;
      }

      setAskAnnotationState({
        evidenceIds: ids,
        mapActions: actions,
        annotationLabels: labels,
        target,
        focusBbox: bbox as [number, number, number, number] | undefined,
      });

      if (ids.length === 1) {
        const found = evidenceList.find((e) => e.change_object_id === ids[0]);
        if (found) setSelectedEvidence(found);
      }
    },
    [evidenceList, setSelectedEvidence]
  );

  // Synchronize ASK evidence highlighting with map focus & selection
  const handleHighlightEvidence = React.useCallback(
    (ids: string[], bbox?: number[]) => {
      if (ids && ids.length > 0) {
        const found = evidenceList.find((e) => ids.includes(e.change_object_id));
        if (found) {
          setSelectedEvidence(found);
        }
      }
      if (bbox && bbox.length === 4) {
        const [minX, minY, maxX, maxY] = bbox as [number, number, number, number];
        setPresetTarget({
          center: [(minY + maxY) / 2, (minX + maxX) / 2],
          bounds: [
            [minY, minX],
            [maxY, maxX],
          ],
          zoom: 16,
        });
      }
    },
    [evidenceList, setSelectedEvidence, setPresetTarget]
  );

  const handleAskWithContext = React.useCallback(
    (query: string) => {
      const mapContext = {
        aoi_id: selectedAoiId,
        aoi_name: currentAoi?.name,
        date_a: beforeDate,
        date_b: afterDate,
        selected_evidence_id: selectedEvidence?.change_object_id ?? null,
        active_annotations: askAnnotationState?.evidenceIds ?? [],
        selected_target: selectedEvidence
          ? {
              id: selectedEvidence.change_object_id,
              title:
                (selectedEvidence as any).title ||
                selectedEvidence.classification?.change_type ||
                selectedEvidence.change_type ||
                'Selected Target',
              type:
                selectedEvidence.classification?.change_type ||
                selectedEvidence.change_type ||
                'infrastructure',
              area_m2: selectedEvidence.measurement?.area_m2,
              area_ha: selectedEvidence.measurement?.area_m2
                ? Number((selectedEvidence.measurement.area_m2 / 10000).toFixed(2))
                : undefined,
              bbox: selectedEvidence.measurement?.bbox_4326,
            }
          : null,
        total_evidence_count: evidenceList.length,
      };

      screens.handleAskQuery(query, {
        aoiId: selectedAoiId,
        dateA: beforeDate,
        dateB: afterDate,
        onHighlightEvidence: handleHighlightEvidence,
        onAnnotationActions: handleAnnotationActions,
        mapContext,
      });
    },
    [screens, selectedAoiId, currentAoi, beforeDate, afterDate, selectedEvidence, evidenceList.length, handleHighlightEvidence, handleAnnotationActions, askAnnotationState]
  );

  return (
    <ConsoleShell
      marqueeNode={undefined}
      headerNode={
        <AppHeader
          aois={aois}
          selectedAoiId={selectedAoiId}
          onSelectAoi={setSelectedAoiId}
          activeView={activeView}
          onSelectView={setActiveView}
          isMock={isMock}
          onToggleMock={handleToggleMock}
          areaLabel={totalAreaLabel}
          sceneCount={scenes.length || 73}
          usableScenes={scenes.filter((s) => s.usable).length || 54}
          beforeDate={beforeDate}
          afterDate={afterDate}
          onSelectBeforeDate={handleSelectBeforeDate}
          onSelectAfterDate={handleSelectAfterDate}
          onSwapDates={handleSwapDates}
          onRunAnalysis={handleDetectChanges}
          isAnalyzing={isAnalyzing}
        />
      }
      temporalBarNode={
        activeView === 'upload' ? (
          <UploadBar
            onAnalyse={screens.handleUploadAnalyse}
            isAnalysing={screens.isUploading}
            canAnalyse={Boolean(screens.uploadManifest)}
          />
        ) : activeView === 'ask' ? (
          <AskBar
            onAsk={handleAskWithContext}
            isThinking={screens.isThinking}
          />
        ) : activeView === 'search' ? (
          <SearchBar
            onSearch={screens.handleSearchQuery}
            isSearching={screens.isSearching}
          />
        ) : (
          <TemporalBar
            isSwipeActive={isSwipeActive}
            onToggleSwipe={() => setIsSwipeActive(!isSwipeActive)}
            sliderPos={sliderPos}
            onExportGeoTiff={() => screens.setIsExportModalOpen(true)}
            beforeDate={beforeDate}
            afterDate={afterDate}
            showPolygons={showPolygons}
            onTogglePolygons={handleTogglePolygons}
            showClouds={showClouds}
            onToggleClouds={handleToggleClouds}
            onBeforeDateChange={handleSelectBeforeDate}
            onAfterDateChange={handleSelectAfterDate}
            onSwapDates={handleSwapDates}
            onRunAnalysis={handleDetectChanges}
            isAnalyzing={isAnalyzing}
          />
        )
      }
      railNode={
        <IconRail
          activeView={activeView}
          onSelectView={setActiveView}
          onOpenShortcuts={() => handleShortcutAction('open-shortcuts')}
        />
      }
      stageNode={
        activeView === 'upload' ? (
          <UploadDropzone
            onFileSelected={screens.handleFileSelected}
            previewUrl={screens.uploadPreviewUrl}
            onClear={() => screens.handleFileSelected(new File([], ''))}
          />
        ) : (
          <MapPane
            selectedAoiId={selectedAoiId}
            aoiCoords={aoiCoords}
            aoiBounds={aoiBounds}
            aoiName={currentAoi?.name ?? 'Jewar Airport'}
            evidenceList={evidenceList}
            selectedEvidenceId={selectedEvidence?.change_object_id ?? null}
            onSelectEvidence={(ev) => {
              setSelectedEvidence(ev);
              if (activeView !== 'map') {
                setActiveView('map');
              }
            }}
            detectionSet={detectionSet}
            sliderPos={sliderPos}
            onSliderChange={setSliderPos}
            isSwipeActive={isSwipeActive}
            onToggleSwipe={() => setIsSwipeActive(!isSwipeActive)}
            beforeDate={beforeDate}
            afterDate={afterDate}
            showClouds={showClouds}
            onToggleClouds={handleToggleClouds}
            showPolygons={showPolygons}
            onTogglePolygons={handleTogglePolygons}
            availableDates={availableDates}
            onSelectBeforeDate={handleSelectBeforeDate}
            onSelectAfterDate={handleSelectAfterDate}
            onSwapDates={handleSwapDates}
            presetTarget={presetTarget}
            onPresetConsumed={() => setPresetTarget(null)}
            askAnnotationState={askAnnotationState}
          />
        )
      }
      timelineNode={
        activeView === 'upload' ? (
          <UploadProgressStrip
            isProcessing={screens.isUploading}
            currentStageIndex={screens.uploadStageIndex}
          />
        ) : activeView === 'ask' ? (
          <AskHistoryStrip
            history={screens.askHistory}
            onSelectQuestion={handleAskWithContext}
          />
        ) : activeView === 'search' ? (
          <SearchDateStrip dates={availableDates} />
        ) : (
          <TimelineSlider
            scenes={scenes}
            beforeDate={beforeDate}
            afterDate={afterDate}
            onSelectBeforeDate={handleSelectBeforeDate}
            onSelectAfterDate={handleSelectAfterDate}
          />
        )
      }
      dossierNode={
        activeView === 'upload' ? (
          <UploadManifestPanel
            manifest={screens.uploadManifest}
            isLoading={screens.isUploading}
          />
        ) : activeView === 'ask' ? (
          <AskAnswerPanel
            chatMessages={screens.chatMessages}
            answer={screens.askAnswer}
            isLoading={screens.isThinking}
            onAsk={handleAskWithContext}
            onClearChat={screens.handleClearChat}
            onExportReport={() => screens.setIsExportModalOpen(true)}
            onHighlightEvidence={handleHighlightEvidence}
            selectedEvidenceId={selectedEvidence?.change_object_id ?? null}
            selectedEvidence={selectedEvidence}
            currentAoiName={currentAoi?.name}
            currentDates={{ beforeDate, afterDate }}
          />
        ) : activeView === 'search' ? (
          <SearchResultsPanel
            results={screens.searchResults}
            selectedId={screens.selectedSearchResult?.id ?? null}
            onSelectResult={screens.setSelectedSearchResult}
            isLoading={screens.isSearching}
          />
        ) : activeView === 'audit' ? (
          <AuditPanel onExportReport={() => screens.setIsExportModalOpen(true)} />
        ) : activeView === 'review' ? (
          <ReviewQueuePanel
            evidenceList={evidenceList}
            selectedEvidenceId={selectedEvidence?.change_object_id ?? null}
            onSelectEvidence={setSelectedEvidence}
            onConfirm={handleConfirmEvidence}
            onReject={handleRejectEvidence}
          />
        ) : selectedEvidence ? (
          <EvidenceDrawer
            evidence={selectedEvidence}
            onClose={() => setSelectedEvidence(null)}
            onConfirm={handleConfirmEvidence}
            onReject={handleRejectEvidence}
            onExport={() => screens.setIsExportModalOpen(true)}
            onOpenAsk={() => setActiveView('ask')}
          />
        ) : undefined
      }
      statusLineNode={
        <StatusLine
          jobState={isAnalyzing ? 'ANALYSING' : 'READY'}
          lastAction={
            selectedEvidence ? `Inspecting ${selectedEvidence.change_type}` : 'AOI loaded'
          }
        />
      }
      hasActiveDossier={hasActiveDossier}
      onShortcutAction={handleShortcutAction}
      overlayNode={
        <>
          <AmbientScanline />
          <ExportModal
            isOpen={screens.isExportModalOpen}
            onClose={() => screens.setIsExportModalOpen(false)}
            onExport={screens.handleExport}
            targetId={selectedEvidence?.change_object_id}
          />
        </>
      }
    />
  );
};
