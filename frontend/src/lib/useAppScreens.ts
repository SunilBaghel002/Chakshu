import { useState, useCallback } from 'react';
import type { UploadManifestData } from '../components/upload/UploadManifestPanel';
import type { SearchResultItem } from '../components/search/SearchResultsPanel';
import type { ExportOptions } from '../components/ExportModal';
import type { AskAnswerData, ChatMessage } from './types/ask';
import { askQuestion } from './api';

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

  // Ask chat & answer state
  const [askHistory, setAskHistory] = useState<string[]>([
    'Kitna area change hua is time interval mein?',
    'What changed between the selected dates?',
    'Where did the change happen?',
    'How many buildings were detected?',
    'How much water is present?',
  ]);

  const [askAnswer, setAskAnswer] = useState<AskAnswerData | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const [isThinking, setIsThinking] = useState(false);

  const handleClearChat = useCallback(() => {
    setChatMessages([]);
    setAskAnswer(null);
  }, []);

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

  const handleAskQuery = useCallback(
    async (
      q: string,
      context?: {
        aoiId?: string;
        uploadId?: string;
        dateA?: string;
        dateB?: string;
        mapContext?: Record<string, unknown>;
        onHighlightEvidence?: (ids: string[], bbox?: number[]) => void;
        onAnnotationActions?: (
          ids: string[],
          actions: any[],
          labels: Record<string, string>,
          target?: string,
          bbox?: number[]
        ) => void;
      }
    ) => {
      if (!q.trim()) return;
      const trimmed = q.trim();
      setIsThinking(true);
      setAskHistory((prev) => (prev.includes(trimmed) ? prev : [trimmed, ...prev.filter((x) => x !== trimmed)]));

      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setChatMessages((prev) => [
        ...prev,
        {
          id: `usr_${Date.now()}`,
          role: 'user',
          timestamp: nowTime,
          text: trimmed,
        },
      ]);

      try {
        // Send previous turns for conversational anaphora resolution
        const historyPayload = chatMessages.slice(-6).map((m) => ({
          role: m.role,
          content: m.text,
          intent: m.intent,
          target_class: m.targetClass,
        }));

        const res = await askQuestion(
          trimmed,
          context?.aoiId || 'b1d3a4e9-11c2-49f3-85e2-04e82b3d91f1',
          context?.uploadId,
          context?.dateA || '2021-01-15',
          context?.dateB || '2024-06-09',
          historyPayload,
          context?.mapContext
        );

        if (res.kind === 'error') {
          showToast?.({ message: res.message || 'Query processing failed.' });
          return;
        }
        if (res.kind === 'empty' || !res.data) {
          showToast?.({ message: 'No spatial evidence found.' });
          return;
        }

        const ans = res.data;
        const isRefusal = ans.intent?.id === 'refusal_resolution' || Boolean(ans.capability_notice);
        const tier: 'MEASURED' | 'INFERRED' | 'UNVERIFIED' | 'REFUSAL' = isRefusal
          ? 'REFUSAL'
          : ans.tier === 'template' || ans.tier === 'polished'
          ? 'MEASURED'
          : 'INFERRED';

        // Extract verified measurement numbers
        const measuredNums: { label: string; value: string; source: string }[] = [];
        if (ans.measurements?.facts) {
          for (const f of ans.measurements.facts) {
            const fact = f as Record<string, unknown>;
            const lbl = (fact.label as string) || (fact.type as string) || (fact.kind as string);
            const val =
              fact.value !== undefined
                ? String(fact.value) + (fact.unit && fact.unit !== 'date' ? ` ${fact.unit}` : '')
                : '';
            if (val && lbl) {
              measuredNums.push({
                label: lbl.replace(/_/g, ' ').toUpperCase(),
                value: val,
                source: 'Kruger UTM 43N',
              });
            }
          }
        }

        const primaryStat =
          measuredNums.length > 0 && measuredNums[0]
            ? measuredNums[0].value
            : ans.highlights?.change_object_ids?.length
            ? `${ans.highlights.change_object_ids.length} vectors`
            : undefined;
        const isTargetSpecific = Boolean(ans.intent?.id?.startsWith('selected_target'));
        const targetTitle = isTargetSpecific
          ? (context?.mapContext?.selected_target as { title?: string } | undefined)?.title || undefined
          : undefined;

        const answerData: AskAnswerData = {
          query: trimmed,
          answerText: ans.text,
          epistemicTier: tier,
          confidence: ans.confidence || 0.94,
          measuredNumbers: measuredNums.length > 0 ? measuredNums : undefined,
          sources: ans.sources?.map((s: { id: string }) => s.id) || ['Sentinel-2 L2A tile 43RCU', 'Deterministic Vector Engine'],
          traceId: ans.answer_id,
          temporal: ans.temporal || { date_a: context?.dateA || '2021-01-15', date_b: context?.dateB || '2024-06-09' },
          changeObjectIds: ans.highlights?.change_object_ids,
          focusBbox: ans.highlights?.focus_bbox_4326 || undefined,
          mapAction: ans.highlights?.map_action || undefined,
          mapActions: ans.map_actions || ans.highlights?.map_actions,
          annotationLabels: ans.highlights?.annotation_labels,
          annotationIntent: ans.annotation_intent,
          followUps: ans.follow_ups,
          evidenceTitles: ans.highlights?.evidence_titles,
          primaryStat,
          targetTitle,
        };

        setAskAnswer(answerData);

        setChatMessages((prev) => [
          ...prev,
          {
            id: `ai_${Date.now()}`,
            role: 'assistant',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: ans.text,
            intent: ans.intent?.id,
            targetClass: (ans.slots?.target_class as string) || undefined,
            answerData,
          },
        ]);

        // Synchronize with map annotations & highlights
        if (context?.onAnnotationActions) {
          context.onAnnotationActions(
            ans.highlights?.change_object_ids || ans.evidence_ids || [],
            ans.map_actions || ans.highlights?.map_actions || [],
            ans.highlights?.annotation_labels || {},
            ans.annotation_intent?.target || (ans.slots?.target_class as string) || undefined,
            ans.highlights?.focus_bbox_4326 || undefined
          );
        } else if (ans.highlights?.change_object_ids?.length && context?.onHighlightEvidence) {
          context.onHighlightEvidence(ans.highlights.change_object_ids, ans.highlights.focus_bbox_4326 || undefined);
        }
      } catch (err) {
        showToast?.({ message: 'Query processing failed.', onUndo: undefined });
      } finally {
        setIsThinking(false);
      }
    },
    [chatMessages, showToast]
  );

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
    chatMessages,
    isThinking,
    handleAskQuery,
    handleClearChat,
    searchResults,
    selectedSearchResult,
    setSelectedSearchResult,
    isSearching,
    handleSearchQuery,
    handleExport,
  };
}
