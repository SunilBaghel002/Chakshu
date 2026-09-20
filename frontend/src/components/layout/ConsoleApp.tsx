import React from 'react';
import { ConsoleShell } from './ConsoleShell';
import { DataStreamMarquee } from '../DataStreamMarquee';
import { AppHeader } from '../AppHeader';
import { TemporalBar } from '../TemporalBar';
import { IconRail } from '../IconRail';
import { MapPane } from '../MapPane';
import { TimelineSlider } from '../TimelineSlider';
import { EvidenceDrawer } from '../EvidenceDrawer';
import { StatusLine } from '../StatusLine';
import { AmbientScanline } from '../AmbientScanline';
import { ExportModal } from '../ExportModal';

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

import { useToast } from '../ui/Toast';
import { useAppScreens } from '../../lib/useAppScreens';
import { useConsoleState } from '../../lib/useConsoleState';

export const ConsoleApp: React.FC = () => {
  const { showToast } = useToast();
  const screens = useAppScreens(showToast);
  const state = useConsoleState({ showToast });

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
      selectedEvidence
  );

  return (
    <ConsoleShell
      marqueeNode={<DataStreamMarquee />}
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
          sceneCount={scenes.length || 36}
          usableScenes={scenes.filter((s) => s.usable).length || 29}
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
            onAsk={screens.handleAskQuery}
            isThinking={screens.isThinking}
          />
        ) : activeView === 'search' ? (
          <SearchBar
            onSearch={screens.handleSearchQuery}
            isSearching={screens.isSearching}
          />
        ) : (
          <TemporalBar
            beforeDate={beforeDate}
            afterDate={afterDate}
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
            onSelectQuestion={screens.handleAskQuery}
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
            answer={screens.askAnswer}
            isLoading={screens.isThinking}
            onExportReport={() => screens.setIsExportModalOpen(true)}
          />
        ) : activeView === 'search' ? (
          <SearchResultsPanel
            results={screens.searchResults}
            selectedId={screens.selectedSearchResult?.id ?? null}
            onSelectResult={screens.setSelectedSearchResult}
            isLoading={screens.isSearching}
          />
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
