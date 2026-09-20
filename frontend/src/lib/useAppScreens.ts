import { useState, useCallback } from 'react';
import type { UploadManifestData } from '../components/upload/UploadManifestPanel';
import type { AskAnswerData } from '../components/ask/AskAnswerPanel';
import type { SearchResultItem } from '../components/search/SearchResultsPanel';
import type { ExportOptions } from '../components/ExportModal';

export function useAppScreens(
  showToast?: (toast: { message: string; onUndo?: () => void }) => void
) {
  // Export Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Upload state
  const [uploadManifest, setUploadManifest] = useState<UploadManifestData | null>({
    filename: 'jewar_sentinel2_l2a_20240609.tif',
    sizeBytes: 18452100,
    crs: 'WGS 84 / UTM 43N',
    resolutionMPerPx: 10.0,
    bands: 4,
    checksum: 'sha256:7b91d248f02ec3a1e948b812f45c9284d72018a1',
    gateVerdict: 'REFUSED_T3',
  });
  const [uploadStageIndex, setUploadStageIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);

  // Ask state
  const [askHistory, setAskHistory] = useState<string[]>([
    'How much land was cleared between 2021 and 2024?',
    'What is the runway area in hectares?',
    'How many buildings were detected at Jewar?',
  ]);
  const [askAnswer, setAskAnswer] = useState<AskAnswerData | null>({
    query: 'How much land was cleared between 2021 and 2024?',
    answerText:
      'Between 2021-01-15 and 2024-06-09, exactly 475.83 ha of agricultural land was converted to airport infrastructure and cleared earthworks. Geometry verified via Kruger UTM 43N planar ellipsoid projection.',
    epistemicTier: 'MEASURED',
    confidence: 0.94,
    measuredNumbers: [
      { label: 'Cleared Area', value: '475.83 ha', source: 'Kruger UTM 43N' },
      { label: 'Confidence Margin', value: '0.94', source: 'Geometric Mean' },
    ],
    sources: [
      'Sentinel-2 L2A tile 43RCU (2021-01-15)',
      'Sentinel-2 L2A tile 43RCU (2024-06-09)',
      'Deterministic Vector Engine (CVA + Otsu)',
    ],
    traceId: 'tr_ask_7c19a2',
  });
  const [isThinking, setIsThinking] = useState(false);

  // Search state
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([
    {
      id: 'sc_jewar_20240609',
      title: 'Jewar Airport Construction Phase 2',
      date: '2024-06-09',
      similarity: 0.96,
      sensor: 'Sentinel-2 L2A',
    },
    {
      id: 'sc_jewar_20230820',
      title: 'Runway Earthworks Baseline',
      date: '2023-08-20',
      similarity: 0.88,
      sensor: 'Sentinel-2 L2A',
    },
    {
      id: 'sc_jewar_20211125',
      title: 'Pre-Construction Farmland Baseline',
      date: '2021-11-25',
      similarity: 0.74,
      sensor: 'Sentinel-2 L2A',
    },
  ]);
  const [selectedSearchResult, setSelectedSearchResult] = useState<SearchResultItem | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Handlers
  const handleFileSelected = useCallback((file: File) => {
    const isSentinel = file.name.toLowerCase().includes('sentinel');
    setUploadManifest({
      filename: file.name,
      sizeBytes: file.size,
      crs: 'WGS 84 / UTM 43N',
      resolutionMPerPx: isSentinel ? 10.0 : 0.5,
      bands: 4,
      checksum: 'sha256:4a2f8c901e...',
      gateVerdict: isSentinel ? 'REFUSED_T3' : 'PERMITTED',
    });
    setUploadPreviewUrl(URL.createObjectURL(file));
  }, []);

  const handleUploadAnalyse = useCallback(() => {
    setIsUploading(true);
    setUploadStageIndex(0);
    const stages = [1, 2, 3, 4];
    stages.forEach((s, idx) => {
      setTimeout(() => {
        setUploadStageIndex(s);
        if (idx === stages.length - 1) {
          setIsUploading(false);
          showToast?.({ message: 'Pipeline analysis complete.' });
        }
      }, (idx + 1) * 600);
    });
  }, [showToast]);

  const handleAskQuery = useCallback((q: string) => {
    setIsThinking(true);
    setAskHistory((prev) => (prev.includes(q) ? prev : [...prev, q]));

    setTimeout(() => {
      setIsThinking(false);
      const isCar = q.toLowerCase().includes('car');
      if (isCar) {
        setAskAnswer({
          query: q,
          answerText: 'Resolution Gate refusal',
          epistemicTier: 'REFUSAL',
          confidence: 1.0,
        });
      } else {
        setAskAnswer({
          query: q,
          answerText: `Query "${q}" grounded against deterministic geometry. Primary area: 475.83 ha across 73 change polygons.`,
          epistemicTier: 'MEASURED',
          confidence: 0.92,
          measuredNumbers: [{ label: 'Area', value: '475.83 ha', source: 'Kruger UTM' }],
          sources: ['Chakshu Audit Registry', 'Sentinel-2 L2A'],
          traceId: `tr_${Math.random().toString(36).slice(2, 8)}`,
        });
      }
    }, 400);
  }, []);

  const handleSearchQuery = useCallback((q: string) => {
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      setSearchResults([
        {
          id: `sc_${Date.now()}_1`,
          title: `Result for "${q}" — Pass Alpha`,
          date: '2024-06-09',
          similarity: 0.94,
          sensor: 'Sentinel-2 L2A',
        },
        {
          id: `sc_${Date.now()}_2`,
          title: `Result for "${q}" — Baseline Beta`,
          date: '2023-08-20',
          similarity: 0.85,
          sensor: 'Sentinel-2 L2A',
        },
      ]);
    }, 350);
  }, []);

  const handleExport = useCallback(
    (options: ExportOptions) => {
      showToast?.({
        message: `Exported report in ${options.format.toUpperCase()} format.`,
      });
    },
    [showToast]
  );

  return {
    isExportModalOpen,
    setIsExportModalOpen,
    uploadManifest,
    uploadStageIndex,
    isUploading,
    uploadPreviewUrl,
    handleFileSelected,
    handleUploadAnalyse,
    askHistory,
    askAnswer,
    isThinking,
    handleAskQuery,
    searchResults,
    selectedSearchResult,
    setSelectedSearchResult,
    isSearching,
    handleSearchQuery,
    handleExport,
  };
}
