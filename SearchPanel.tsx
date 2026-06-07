import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  PanResponder,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '@/constants/config';
import { authFetch } from '@/api/auth';

const MINT = '#22C9A0';
const MINT_LIGHT = '#E6F7F3';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_MIN_HEIGHT = SCREEN_HEIGHT * 0.35;
const PANEL_MAX_HEIGHT = SCREEN_HEIGHT * 0.75;

// ────────────────────────────────────────────────────────
// 타입
// ────────────────────────────────────────────────────────
export type SearchScope = 'internal' | 'web' | 'both';
type RagScope = 'document' | 'web' | 'hybrid';

export type SourceLocation =
  | { type: 'timestamp'; value: string }
  | { type: 'page'; value: number };

export type SearchResult = {
  id: string;
  title: string;
  snippet: string;
  source_name: string;
  source_type: 'audio' | 'pdf' | 'ppt' | 'web';
  locations: SourceLocation[];
};

export type FileItem = {
  id: string;
  name: string;
  type: 'folder' | 'audio' | 'pdf' | 'ppt';
  meta: string;
  color: string;
  iconColor: string;
  transcriptId?: string;
  transcriptIds?: string[];
};

// ────────────────────────────────────────────────────────
// 목업 데이터 (실제 연동 시 API로 교체)
// ────────────────────────────────────────────────────────
const MOCK_FILES: FileItem[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    name: '3월 회의',
    type: 'folder',
    meta: '파일 4개',
    color: MINT_LIGHT,
    iconColor: MINT,
    transcriptIds: ['00000000-0000-4000-8000-000000000004'],
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    name: '알고리즘 강의',
    type: 'folder',
    meta: '파일 7개',
    color: '#EEEDFE',
    iconColor: '#7F77DD',
    transcriptIds: ['00000000-0000-4000-8000-000000000005'],
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    name: '마케팅 기획',
    type: 'folder',
    meta: '파일 2개',
    color: '#FAECE7',
    iconColor: '#D85A30',
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    name: '마케팅 회의록',
    type: 'audio',
    meta: '42분',
    color: MINT_LIGHT,
    iconColor: MINT,
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    name: '알고리즘 요약본',
    type: 'pdf',
    meta: 'PDF · 41MB',
    color: '#EEEDFE',
    iconColor: '#7F77DD',
  },
];

const MOCK_RESULTS: SearchResult[] = [
  {
    id: '1',
    title: '미토콘드리아의 기능',
    snippet: '미토콘드리아는 ATP를 생산하는 세포 소기관으로, 산화적 인산화를 통해 에너지를 생성합니다.',
    source_name: '알고리즘 강의 3강',
    source_type: 'audio',
    locations: [{ type: 'timestamp', value: '00:12:34' }, { type: 'timestamp', value: '00:28:10' }],
  },
  {
    id: '2',
    title: 'ATP 생합성 과정',
    snippet: 'ATP는 미토콘드리아 내막에서 ATP 합성효소에 의해 생성되며, 세포의 주요 에너지 화폐입니다.',
    source_name: '알고리즘 요약본.pdf',
    source_type: 'pdf',
    locations: [{ type: 'page', value: 12 }, { type: 'page', value: 18 }],
  },
];

// ────────────────────────────────────────────────────────
// 컨텍스트 팝업 컴포넌트
// ────────────────────────────────────────────────────────
type ContextPopupProps = {
  selectedText: string;
  onSelect: (scope: SearchScope) => void;
  onClose: () => void;
};

export function ContextPopup({ selectedText, onSelect, onClose }: ContextPopupProps) {
  const [active, setActive] = useState<SearchScope | null>(null);

  const handlePress = (scope: SearchScope) => {
    setActive(scope);
    onSelect(scope);
  };

  return (
    <TouchableOpacity style={styles.popupOverlay} onPress={onClose} activeOpacity={1}>
      <View style={styles.popup}>
        <TouchableOpacity
          style={[styles.popupBtn, active === 'internal' && styles.popupBtnActive]}
          onPress={() => handlePress('internal')}
        >
          <Text style={[styles.popupBtnText, active === 'internal' && styles.popupBtnTextActive]}>
            문서
          </Text>
        </TouchableOpacity>
        <View style={styles.popupDivider} />
        <TouchableOpacity
          style={[styles.popupBtn, active === 'web' && styles.popupBtnActive]}
          onPress={() => handlePress('web')}
        >
          <Text style={[styles.popupBtnText, active === 'web' && styles.popupBtnTextActive]}>
            웹
          </Text>
        </TouchableOpacity>
        <View style={styles.popupDivider} />
        <TouchableOpacity
          style={[styles.popupBtn, active === 'both' && styles.popupBtnActive]}
          onPress={() => handlePress('both')}
        >
          <Text style={[styles.popupBtnText, active === 'both' && styles.popupBtnTextActive]}>
            문서+웹
          </Text>
        </TouchableOpacity>
        <View style={styles.popupArrow} />
      </View>
    </TouchableOpacity>
  );
}

// ────────────────────────────────────────────────────────
// 문서 선택 그리드
// ────────────────────────────────────────────────────────
type DocSelectorProps = {
  documents?: FileItem[];
  onSelect: (file: FileItem) => void;
  onClose: () => void;
};

export function DocSelector({ documents = [], onSelect, onClose }: DocSelectorProps) {
  const getIcon = (type: FileItem['type']) => {
    switch (type) {
      case 'folder': return 'folder';
      case 'audio': return 'mic-outline';
      case 'pdf': return 'document-text-outline';
      case 'ppt': return 'easel-outline';
    }
  };

  return (
    <View style={styles.docSelectorWrap}>
      <View style={styles.panelHandle} />
      <View style={styles.docSelectorHeader}>
        <Text style={styles.docSelectorTitle}>어떤 문서에서 검색할까요?</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={18} color="#aaa" />
        </TouchableOpacity>
      </View>
      <View style={styles.docGrid}>
        {documents.map(file => (
          <TouchableOpacity
            key={file.id}
            style={styles.docItem}
            onPress={() => onSelect(file)}
          >
            <View style={[styles.docIcon, { backgroundColor: file.color }]}>
              <Ionicons name={getIcon(file.type) as any} size={22} color={file.iconColor} />
            </View>
            <Text style={styles.docName} numberOfLines={2}>{file.name}</Text>
            <Text style={styles.docMeta}>{file.meta}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.docItem, styles.docItemAll]}
          onPress={() =>
            onSelect({
              id: '__all__',
              name: '전체',
              type: 'folder',
              meta: `문서 ${documents.length}개`,
              color: MINT_LIGHT,
              iconColor: MINT,
              transcriptIds: documents.flatMap(getTranscriptIds),
            })
          }
        >
          <Ionicons name="apps-outline" size={22} color={MINT} />
          <Text style={[styles.docName, { color: MINT }]}>전체</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ────────────────────────────────────────────────────────
// 검색 결과 패널
// ────────────────────────────────────────────────────────
type ResultPanelProps = {
  results: SearchResult[];
  loading: boolean;
  query: string;
  scope: SearchScope;
  sourceName?: string;
  onClose: () => void;
  onLocationPress: (result: SearchResult, location: SourceLocation) => void;
};

export function ResultPanel({
  results,
  loading,
  query,
  scope,
  sourceName,
  onClose,
  onLocationPress,
}: ResultPanelProps) {
  const panelHeight = useRef(new Animated.Value(PANEL_MIN_HEIGHT)).current;
  const lastHeight = useRef(PANEL_MIN_HEIGHT);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gs) => {
        const newH = Math.min(
          Math.max(lastHeight.current - gs.dy, PANEL_MIN_HEIGHT),
          PANEL_MAX_HEIGHT
        );
        panelHeight.setValue(newH);
      },
      onPanResponderRelease: (_, gs) => {
        const newH = Math.min(
          Math.max(lastHeight.current - gs.dy, PANEL_MIN_HEIGHT),
          PANEL_MAX_HEIGHT
        );
        lastHeight.current = newH;
        Animated.spring(panelHeight, {
          toValue: newH,
          useNativeDriver: false,
          bounciness: 4,
        }).start();
      },
    })
  ).current;

  const scopeLabel = {
    internal: sourceName ?? '문서',
    web: '웹',
    both: '문서 + 웹',
  }[scope];

  const getScopeIcon = () => {
    if (scope === 'web') return 'globe-outline';
    if (scope === 'both') return 'search-outline';
    return 'document-text-outline';
  };

  const renderLocation = (result: SearchResult, loc: SourceLocation) => {
    if (loc.type === 'timestamp') {
      return (
        <TouchableOpacity
          key={loc.value}
          style={styles.locChip}
          onPress={() => onLocationPress(result, loc)}
        >
          <Ionicons name="play-circle-outline" size={12} color={MINT} />
          <Text style={styles.locChipText}>{loc.value}</Text>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        key={loc.value}
        style={styles.locChip}
        onPress={() => onLocationPress(result, loc)}
      >
        <Ionicons name="document-outline" size={12} color={MINT} />
        <Text style={styles.locChipText}>p.{loc.value}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Animated.View style={[styles.resultPanel, { height: panelHeight }]}>
      <View {...panResponder.panHandlers}>
        <View style={styles.panelHandle} />
        <View style={styles.resultHeader}>
          <View style={styles.resultTitleRow}>
            <Ionicons name={getScopeIcon()} size={14} color={MINT} />
            <Text style={styles.resultTitle}>
              <Text style={{ color: MINT }}>{scopeLabel}</Text> 검색 결과
            </Text>
            <View style={styles.queryChip}>
              <Text style={styles.queryChipText} numberOfLines={1}>{query}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={18} color="#aaa" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={MINT} />
          <Text style={styles.loadingText}>검색 중...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.resultScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {results.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="search-outline" size={32} color="#ddd" />
              <Text style={styles.emptyText}>검색 결과가 없어요</Text>
            </View>
          ) : (
            results.map(result => (
              <View key={result.id} style={styles.resultItem}>
                <Text style={styles.resultItemTitle}>{result.title}</Text>
                <Text style={styles.resultSnippet}>{result.snippet}</Text>
                <View style={styles.resultFooter}>
                  <View style={styles.sourceChip}>
                    <Ionicons
                      name={getSourceIcon(result.source_type)}
                      size={11}
                      color={MINT}
                    />
                    <Text style={styles.sourceChipText}>{result.source_name}</Text>
                  </View>
                  <View style={styles.locRow}>
                    {result.locations.map(loc => renderLocation(result, loc))}
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </Animated.View>
  );
}

// ────────────────────────────────────────────────────────
// 메인 훅 — RecordingScreen에서 사용
// ────────────────────────────────────────────────────────
type UseScriptSearchOptions = {
  documents?: FileItem[];
  defaultTranscriptIds?: string[];
  topK?: number;
  onAudioLocationPress?: (timestamp: string, result: SearchResult) => void;
  onDocumentLocationPress?: (page: number, result: SearchResult) => void;
  onError?: (message: string) => void;
};

type SearchCacheEntry = {
  query: string;
  scope: SearchScope;
  source: FileItem | null;
  results: SearchResult[];
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getTranscriptIds(file: FileItem): string[] {
  if (file.transcriptIds?.length) return file.transcriptIds;
  if (file.transcriptId) return [file.transcriptId];
  return [file.id];
}

function uniqueUuidList(ids: string[]): string[] {
  return Array.from(new Set(ids.filter((id) => UUID_PATTERN.test(id))));
}

export function normalizeSearchCacheKey(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function toRagScope(scope: SearchScope): RagScope {
  if (scope === 'web') return 'web';
  if (scope === 'both') return 'hybrid';
  return 'document';
}

function secondsToTimestamp(totalSeconds: number): string {
  const normalized = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(normalized / 3600)
    .toString()
    .padStart(2, '0');
  const m = Math.floor((normalized % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const s = (normalized % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function normalizeLocations(item: Record<string, unknown>): SourceLocation[] {
  if (Array.isArray(item.locations)) {
    return item.locations
      .map((loc) => {
        if (!loc || typeof loc !== 'object') return null;
        const value = loc as Record<string, unknown>;
        if (value.type === 'timestamp' && typeof value.value === 'string') {
          return { type: 'timestamp', value: value.value } satisfies SourceLocation;
        }
        if (value.type === 'page' && typeof value.value === 'number') {
          return { type: 'page', value: value.value } satisfies SourceLocation;
        }
        return null;
      })
      .filter((loc): loc is SourceLocation => loc !== null);
  }

  if (typeof item.start_seconds === 'number') {
    return [{ type: 'timestamp', value: secondsToTimestamp(item.start_seconds) }];
  }
  if (typeof item.start_time === 'string') {
    return [{ type: 'timestamp', value: item.start_time }];
  }
  if (typeof item.timestamp === 'string') {
    return [{ type: 'timestamp', value: item.timestamp }];
  }
  if (typeof item.page === 'number') {
    return [{ type: 'page', value: item.page }];
  }
  if (typeof item.page_number === 'number') {
    return [{ type: 'page', value: item.page_number }];
  }

  return [];
}

function normalizeSourceType(value: unknown): SearchResult['source_type'] {
  if (value === 'pdf' || value === 'ppt' || value === 'web') return value;
  return 'audio';
}

function getSourceIcon(sourceType: SearchResult['source_type']) {
  if (sourceType === 'web') return 'globe-outline';
  if (sourceType === 'audio') return 'mic-outline';
  return 'document-text-outline';
}

function normalizeRagResponse(data: unknown): SearchResult[] {
  if (!data || typeof data !== 'object') return [];

  const payload = data as Record<string, unknown>;
  const list =
    (Array.isArray(payload.results) && payload.results) ||
    (Array.isArray(payload.sources) && payload.sources) ||
    (Array.isArray(payload.chunks) && payload.chunks) ||
    (Array.isArray(payload.contexts) && payload.contexts) ||
    [];

  const results = list
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item, index) => ({
      id: String(item.id ?? item.chunk_id ?? item.segment_id ?? `result-${index}`),
      title: String(item.title ?? item.topic ?? item.source_name ?? `검색 결과 ${index + 1}`),
      snippet: String(item.snippet ?? item.text ?? item.content ?? item.summary ?? ''),
      source_name: String(
        item.source_name ?? item.transcript_title ?? item.file_name ?? item.url ?? item.domain ?? '문서'
      ),
      source_type: normalizeSourceType(item.source_type ?? item.type ?? (item.url ? 'web' : undefined)),
      locations: normalizeLocations(item),
    }));

  if (typeof payload.answer === 'string' && payload.answer.trim()) {
    return [
      {
        id: 'rag-answer',
        title: 'AI 답변',
        snippet: payload.answer.trim(),
        source_name: 'RAG',
        source_type: 'audio',
        locations: [],
      },
      ...results,
    ];
  }

  return results;
}

export function useScriptSearch(options: UseScriptSearchOptions = {}) {
  const [selectedText, setSelectedText] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [showDocSelector, setShowDocSelector] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [scope, setScope] = useState<SearchScope>('internal');
  const [selectedSource, setSelectedSource] = useState<FileItem | null>(null);
  const [searchCache, setSearchCache] = useState<Record<string, SearchCacheEntry>>({});
  const docScopeRef = useRef<SearchScope>('internal');
  const documents = options.documents ?? [];

  const onTextLongPress = (text: string) => {
    const query = text.trim();
    if (!query) return;

    const cached = searchCache[normalizeSearchCacheKey(query)];
    if (cached) {
      setSelectedText(cached.query);
      setScope(cached.scope);
      setSelectedSource(cached.source);
      setResults(cached.results);
      setLoading(false);
      setShowPopup(false);
      setShowDocSelector(false);
      setShowResults(true);
      return;
    }

    setSelectedText(query);
    setShowPopup(true);
  };

  const onScopeSelect = (s: SearchScope) => {
    setScope(s);
    setShowPopup(false);
    if (s === 'internal' || s === 'both') {
      docScopeRef.current = s;
      setShowDocSelector(true);
    } else {
      setSelectedSource(null);
      runSearch(s, null);
    }
  };

  const onDocSelect = (file: FileItem) => {
    const searchScope = docScopeRef.current;
    setSelectedSource(file);
    setScope(searchScope);
    setShowDocSelector(false);
    runSearch(searchScope, file);
  };

  const runSearch = async (s: SearchScope, file: FileItem | null) => {
    setLoading(true);
    setShowResults(true);
    try {
      const query = selectedText.trim();
      const ragScope = toRagScope(s);
      const candidateIds =
        file !== null
          ? getTranscriptIds(file)
          : options.defaultTranscriptIds ?? documents.flatMap(getTranscriptIds);
      const transcriptIds = uniqueUuidList(candidateIds);

      if (ragScope !== 'web' && transcriptIds.length === 0) {
        throw new Error('검색할 문서를 먼저 선택해주세요.');
      }

      const res = await authFetch(`${API_BASE_URL}/rag/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          scope: ragScope,
          transcript_ids: transcriptIds,
          top_k: options.topK ?? 5,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail ?? '검색에 실패했습니다.');
      }

      const data = await res.json();
      const normalized = normalizeRagResponse(data);
      setResults(normalized);
      setSearchCache((current) => ({
        ...current,
        [normalizeSearchCacheKey(query)]: {
          query,
          scope: s,
          source: file,
          results: normalized,
        },
      }));
    } catch (e) {
      console.error(e);
      setResults([]);
      const message = e instanceof Error ? e.message : '검색 중 오류가 발생했습니다.';
      options.onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  const closeAll = () => {
    setShowPopup(false);
    setShowDocSelector(false);
    setShowResults(false);
    setSelectedText('');
    setSelectedSource(null);
  };

  const onLocationPress = (result: SearchResult, loc: SourceLocation) => {
    if (loc.type === 'timestamp') {
      options.onAudioLocationPress?.(loc.value, result);
      return;
    }
    options.onDocumentLocationPress?.(loc.value, result);
  };

  return {
    selectedText,
    documents,
    searchedQueryKeys: Object.keys(searchCache),
    showPopup,
    showDocSelector,
    showResults,
    loading,
    results,
    scope,
    selectedSource,
    onTextLongPress,
    onScopeSelect,
    onDocSelect,
    closeAll,
    onLocationPress,
  };
}

// ────────────────────────────────────────────────────────
// 스타일
// ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // 팝업
  popupOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 30,
  },
  popup: {
    position: 'absolute', top: 60, left: 20,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#222', borderRadius: 12,
    paddingHorizontal: 4, paddingVertical: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
    zIndex: 31,
  },
  popupBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  popupBtnActive: { backgroundColor: MINT },
  popupBtnText: { fontSize: 13, color: '#fff', fontWeight: '500' },
  popupBtnTextActive: { color: '#fff' },
  popupDivider: { width: 0.5, height: 16, backgroundColor: '#444' },
  popupArrow: {
    position: 'absolute', bottom: -6, left: '40%',
    width: 0, height: 0,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 6,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: '#222',
  },

  // 공통 핸들
  panelHandle: {
    width: 36, height: 3, backgroundColor: '#e0e0e0',
    borderRadius: 2, alignSelf: 'center', marginBottom: 10,
  },

  // 문서 선택
  docSelectorWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderRadius: 22,
    padding: 16, paddingBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 8,
    zIndex: 25,
  },
  docSelectorHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  docSelectorTitle: { fontSize: 13, fontWeight: '500', color: '#888' },
  docGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  docItem: {
    width: '30%', backgroundColor: '#F7FAF9',
    borderRadius: 12, borderWidth: 0.5, borderColor: '#e8f4f0',
    padding: 10, alignItems: 'center', gap: 5,
  },
  docItemAll: {
    borderStyle: 'dashed', borderColor: '#c8ede3',
    backgroundColor: '#F7FAF9',
  },
  docIcon: {
    width: 46, height: 40, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  docName: { fontSize: 10, fontWeight: '500', color: '#222', textAlign: 'center', lineHeight: 14 },
  docMeta: { fontSize: 9, color: '#aaa' },

  // 결과 패널
  resultPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 14, paddingTop: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 8,
    zIndex: 20,
  },
  resultHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  resultTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  resultTitle: { fontSize: 13, fontWeight: '500', color: '#222' },
  queryChip: {
    backgroundColor: '#F7FAF9', borderRadius: 8,
    borderWidth: 0.5, borderColor: '#e0f0eb',
    paddingHorizontal: 8, paddingVertical: 2, maxWidth: 100,
  },
  queryChipText: { fontSize: 11, color: '#555' },
  loadingWrap: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  loadingText: { fontSize: 12, color: '#aaa' },
  resultScroll: { flex: 1 },
  emptyWrap: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 13, color: '#bbb' },
  resultItem: {
    backgroundColor: '#F7FAF9', borderRadius: 12,
    borderWidth: 0.5, borderColor: '#e8f4f0',
    padding: 12, marginBottom: 8,
  },
  resultItemTitle: { fontSize: 13, fontWeight: '500', color: '#222', marginBottom: 4 },
  resultSnippet: { fontSize: 12, color: '#555', lineHeight: 18, marginBottom: 8 },
  resultFooter: { gap: 6 },
  sourceChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: MINT_LIGHT, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  sourceChipText: { fontSize: 11, color: '#0F6E56', fontWeight: '500' },
  locRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  locChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff', borderRadius: 8,
    borderWidth: 0.5, borderColor: '#e0f0eb',
    paddingHorizontal: 8, paddingVertical: 3,
  },
  locChipText: { fontSize: 11, color: '#555' },
});
