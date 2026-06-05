import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  cancelFileProcess,
  getTranscriptSummary,
  processFile,
  type ProcessStatus,
  type TranscriptSummaryChunk,
  type TranscriptSummaryResponse,
  type TranscriptSummarySegment,
} from '@/api/files';
import { AppBottomBar } from '@/components/AppBottomBar';
import { Colors } from '@/styles/theme';

type TopTab = 'summary' | 'script';
type SectionKey = 'overview' | 'paragraphs' | 'keywords';
type DetailStatus = ProcessStatus;
type ChatMessage = { role: 'user' | 'ai'; text: string };

const VALID_STATUSES: DetailStatus[] = ['pending', 'uploaded', 'processing', 'completed', 'failed'];

function getSearchParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function normalizeStatus(status: string | undefined): DetailStatus {
  if (status === 'canceled' || status === 'cancelled') return 'uploaded';
  return VALID_STATUSES.includes(status as DetailStatus) ? (status as DetailStatus) : 'pending';
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSeconds(value: number | string | null | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatSeconds(value: number | string | null | undefined): string {
  const seconds = normalizeSeconds(value) ?? 0;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function getSummaryChunks(data: TranscriptSummaryResponse | null): TranscriptSummaryChunk[] {
  return data?.chunks ?? data?.summaries ?? [];
}

function getSummaryText(data: TranscriptSummaryResponse | null): string {
  const directSummary = cleanText(data?.summary);
  if (directSummary) return directSummary;

  return getSummaryChunks(data)
    .map((chunk) => cleanText(chunk.summary) || cleanText(chunk.text))
    .filter(Boolean)
    .join('\n\n');
}

function getFullText(data: TranscriptSummaryResponse | null): string {
  const directText =
    cleanText(data?.full_text) || cleanText(data?.fullText) || cleanText(data?.transcript) || cleanText(data?.text);
  if (directText) return directText;

  const chunkText = getSummaryChunks(data)
    .map((chunk) => cleanText(chunk.full_text) || cleanText(chunk.fullText) || cleanText(chunk.text))
    .filter(Boolean)
    .join('\n\n');
  if (chunkText) return chunkText;

  return (data?.segments ?? [])
    .map((segment) => cleanText(segment.text))
    .filter(Boolean)
    .join('\n');
}

function getKeywords(data: TranscriptSummaryResponse | null): string[] {
  const keywords = data?.keywords ?? getSummaryChunks(data).flatMap((chunk) => chunk.keywords ?? []);
  return Array.from(new Set(keywords.map((keyword) => keyword.trim()).filter(Boolean)));
}

function getScriptSegments(data: TranscriptSummaryResponse | null): TranscriptSummarySegment[] {
  const segments = data?.segments?.filter((segment) => cleanText(segment.text)) ?? [];
  if (segments.length > 0) return segments;

  const fullText = getFullText(data);
  return fullText
    ? fullText
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((text) => ({ text }))
    : [];
}

export default function DetailScreen() {
  const params = useLocalSearchParams<{
    transcriptId?: string | string[];
    status?: string | string[];
    title?: string | string[];
  }>();
  const transcriptId = getSearchParam(params.transcriptId);
  const title = getSearchParam(params.title);

  const [activeTab, setActiveTab] = useState<TopTab>('summary');
  const [detailStatus, setDetailStatus] = useState<DetailStatus>(() => normalizeStatus(getSearchParam(params.status)));
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    overview: true,
    paragraphs: true,
    keywords: true,
  });
  const [panelOpen, setPanelOpen] = useState(true);
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [summaryData, setSummaryData] = useState<TranscriptSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [canceling, setCanceling] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const processAbortRef = useRef<AbortController | null>(null);
  const statusBeforeProcessingRef = useRef<DetailStatus>(detailStatus === 'processing' ? 'uploaded' : detailStatus);
  const isCompleted = detailStatus === 'completed';

  useEffect(() => {
    return () => {
      processAbortRef.current?.abort();
      processAbortRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isCompleted || !transcriptId) {
      setSummaryData(null);
      setSummaryError('');
      setSummaryLoading(false);
      return;
    }

    const abortController = new AbortController();
    setSummaryLoading(true);
    setSummaryError('');

    getTranscriptSummary(transcriptId, abortController.signal)
      .then((data) => {
        setSummaryData(data);
      })
      .catch((error) => {
        if (abortController.signal.aborted) return;
        setSummaryError(error instanceof Error ? error.message : '요약과 스크립트를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setSummaryLoading(false);
        }
      });

    return () => abortController.abort();
  }, [isCompleted, transcriptId]);

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGenerate = async () => {
    if (detailStatus === 'processing') return;
    if (!transcriptId) {
      Alert.alert('파일 정보 없음', '처리할 파일 정보를 찾을 수 없습니다.');
      return;
    }

    const abortController = new AbortController();
    statusBeforeProcessingRef.current = detailStatus;
    processAbortRef.current?.abort();
    processAbortRef.current = abortController;
    setDetailStatus('processing');

    try {
      const result = await processFile(transcriptId, abortController.signal);
      setDetailStatus(normalizeStatus(result.status));
    } catch (error) {
      if (abortController.signal.aborted) {
        setDetailStatus(statusBeforeProcessingRef.current);
        return;
      }
      setDetailStatus('failed');
      Alert.alert('생성 실패', error instanceof Error ? error.message : '요약 및 스크립트 생성에 실패했습니다.');
    } finally {
      if (processAbortRef.current === abortController) {
        processAbortRef.current = null;
      }
    }
  };

  const handleCancelGenerate = async () => {
    if (detailStatus !== 'processing' || canceling || !transcriptId) return;

    setCanceling(true);
    try {
      const result = await cancelFileProcess(transcriptId);
      const nextStatus = normalizeStatus(result.status);
      statusBeforeProcessingRef.current = nextStatus;
      processAbortRef.current?.abort();
      processAbortRef.current = null;
      setDetailStatus(nextStatus);
      setSummaryData(null);
      setSummaryError('');
    } catch (error) {
      Alert.alert('중지 실패', error instanceof Error ? error.message : '요약 및 스크립트 생성을 중지하지 못했습니다.');
    } finally {
      setCanceling(false);
    }
  };

  const handleSend = () => {
    if (!isCompleted || !inputText.trim()) return;
    setChats((prev) => [
      ...prev,
      { role: 'user', text: inputText },
      { role: 'ai', text: '질문 기능은 요약 데이터 연동 후 이어서 연결할 수 있어요.' },
    ]);
    setInputText('');
    setPanelOpen(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.mint} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="share-outline" size={17} color={Colors.mint} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="ellipsis-horizontal" size={18} color={Colors.mint} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'summary' && styles.tabItemActive]}
          onPress={() => setActiveTab('summary')}
        >
          <Text style={[styles.tabText, activeTab === 'summary' && styles.tabTextActive]}>요약</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'script' && styles.tabItemActive]}
          onPress={() => setActiveTab('script')}
        >
          <Text style={[styles.tabText, activeTab === 'script' && styles.tabTextActive]}>스크립트</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {isCompleted ? (
          activeTab === 'summary' ? (
            <SummaryContent
              data={summaryData}
              loading={summaryLoading}
              error={summaryError}
              openSections={openSections}
              toggleSection={toggleSection}
            />
          ) : (
            <ScriptContent data={summaryData} loading={summaryLoading} error={summaryError} />
          )
        ) : (
          <GenerationState
            status={detailStatus}
            onPress={handleGenerate}
            onCancel={handleCancelGenerate}
            disabled={!transcriptId}
            canCancel={Boolean(transcriptId)}
            canceling={canceling}
          />
        )}
      </View>

      <RagPanel
        open={panelOpen}
        onToggle={() => setPanelOpen((prev) => !prev)}
        chats={isCompleted ? chats : []}
        inputText={inputText}
        setInputText={setInputText}
        onSend={handleSend}
        scrollRef={scrollRef}
        disabled={!isCompleted}
      />
      <AppBottomBar active="work" />
    </SafeAreaView>
  );
}

function SummaryContent({
  data,
  loading,
  error,
  openSections,
  toggleSection,
}: {
  data: TranscriptSummaryResponse | null;
  loading: boolean;
  error: string;
  openSections: Record<SectionKey, boolean>;
  toggleSection: (key: SectionKey) => void;
}) {
  const summaryText = getSummaryText(data);
  const keywords = getKeywords(data);
  const chunks = getSummaryChunks(data);

  if (loading) {
    return <DetailMessageState icon="sync-outline" title="요약을 불러오는 중이에요" />;
  }

  if (error) {
    return <DetailMessageState icon="alert-circle-outline" title="요약을 불러오지 못했어요" description={error} tone="failed" />;
  }

  if (!summaryText && keywords.length === 0) {
    return <DetailMessageState icon="document-text-outline" title="생성된 요약 데이터가 없어요" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {summaryText && (
        <CollapsibleSection
          icon="sparkles-outline"
          title="전체 요약"
          open={openSections.overview}
          onPress={() => toggleSection('overview')}
        >
          <Text style={styles.sectionText}>{summaryText}</Text>
        </CollapsibleSection>
      )}

      {chunks.length > 0 && (
        <CollapsibleSection
          icon="list-outline"
          title="구간별 요약"
          open={openSections.paragraphs}
          onPress={() => toggleSection('paragraphs')}
        >
          {chunks.map((chunk, index) => {
            const chunkSummary = cleanText(chunk.summary) || cleanText(chunk.text);
            const chunkFullText = cleanText(chunk.full_text) || cleanText(chunk.fullText);
            return (
              <View key={`${index}-${chunkSummary}`} style={styles.contextItem}>
                <View style={styles.contextTitleRow}>
                  <View style={[styles.contextDot, { backgroundColor: index % 2 === 0 ? Colors.mint : '#7F77DD' }]} />
                  <Text style={styles.contextTitle}>구간 {index + 1}</Text>
                </View>
                <Text style={styles.contextText}>{chunkSummary || chunkFullText || '요약 내용이 없습니다.'}</Text>
              </View>
            );
          })}
        </CollapsibleSection>
      )}

      {keywords.length > 0 && (
        <CollapsibleSection
          icon="pricetag-outline"
          title="키워드"
          open={openSections.keywords}
          onPress={() => toggleSection('keywords')}
        >
          <View style={styles.keywordWrap}>
            {keywords.map((keyword, index) => (
              <View
                key={keyword}
                style={[
                  styles.keyword,
                  index % 3 === 1 && styles.keywordPurple,
                  index % 3 === 2 && styles.keywordCoral,
                ]}
              >
                <Text
                  style={[
                    styles.keywordText,
                    index % 3 === 1 && styles.keywordTextPurple,
                    index % 3 === 2 && styles.keywordTextCoral,
                  ]}
                >
                  {keyword}
                </Text>
              </View>
            ))}
          </View>
        </CollapsibleSection>
      )}
    </ScrollView>
  );
}

function ScriptContent({
  data,
  loading,
  error,
}: {
  data: TranscriptSummaryResponse | null;
  loading: boolean;
  error: string;
}) {
  const segments = getScriptSegments(data);

  if (loading) {
    return <DetailMessageState icon="sync-outline" title="스크립트를 불러오는 중이에요" />;
  }

  if (error) {
    return <DetailMessageState icon="alert-circle-outline" title="스크립트를 불러오지 못했어요" description={error} tone="failed" />;
  }

  if (segments.length === 0) {
    return <DetailMessageState icon="document-text-outline" title="생성된 스크립트 데이터가 없어요" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.sectionCard}>
        <View style={styles.scriptBody}>
          {segments.map((segment, index) => (
            <View key={`${index}-${segment.text}`} style={styles.scriptItem}>
              <Text style={styles.scriptTime}>
                {formatSeconds(segment.start_seconds ?? segment.startSeconds)}
                {segment.end_seconds || segment.endSeconds ? ` - ${formatSeconds(segment.end_seconds ?? segment.endSeconds)}` : ''}
              </Text>
              <Text style={styles.scriptText}>{segment.text}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function DetailMessageState({
  icon,
  title,
  description,
  tone = 'normal',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  tone?: 'normal' | 'failed';
}) {
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconWrap, tone === 'failed' && styles.emptyIconWrapFailed]}>
        <Ionicons name={icon} size={36} color={tone === 'failed' ? '#D94A4A' : Colors.mint} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.emptySub}>{description}</Text> : null}
    </View>
  );
}

function GenerationState({
  status,
  onPress,
  onCancel,
  disabled,
  canCancel,
  canceling,
}: {
  status: DetailStatus;
  onPress: () => void;
  onCancel: () => void;
  disabled: boolean;
  canCancel: boolean;
  canceling: boolean;
}) {
  const isProcessing = status === 'processing';
  const isFailed = status === 'failed';
  const title = isProcessing
    ? '요약과 스크립트를 생성 중이에요'
    : isFailed
      ? '생성에 실패했어요'
      : '아직 요약이 생성되지 않았어요';
  const description = isProcessing
    ? '완료되면 요약과 스크립트 탭에서 확인할 수 있어요'
    : isFailed
      ? '다시 시도하면 요약과 스크립트를 생성할 수 있어요'
      : '버튼을 눌러 AI 요약 및 스크립트를 한 번에 생성할 수 있어요';
  const infoText = isProcessing
    ? '처리 중에는 화면을 닫아도 완료 후 다시 확인할 수 있어요.'
    : isFailed
      ? '네트워크 상태나 파일 처리 가능 여부를 확인한 뒤 다시 시도해주세요.'
      : '요약과 스크립트는 함께 생성돼요. 생성 후 각 탭에서 확인할 수 있어요.';
  const buttonLabel = isProcessing ? (canceling ? '중지 중' : '생성 중지') : isFailed ? '다시 생성' : '요약 및 스크립트 생성';

  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconWrap, isFailed && styles.emptyIconWrapFailed]}>
        <Ionicons
          name={isFailed ? 'alert-circle-outline' : isProcessing ? 'sync-outline' : 'document-text-outline'}
          size={36}
          color={isFailed ? '#D94A4A' : Colors.mint}
        />
        <View style={styles.emptyBadge}>
          <Ionicons name={isFailed ? 'refresh-outline' : 'time-outline'} size={12} color={Colors.textLight} />
        </View>
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{description}</Text>
      <View style={[styles.infoPill, isFailed && styles.infoPillFailed]}>
        <Ionicons
          name="information-circle-outline"
          size={15}
          color={isFailed ? '#D94A4A' : Colors.mint}
          style={styles.infoIcon}
        />
        <Text style={[styles.infoPillText, isFailed && styles.infoPillTextFailed]}>{infoText}</Text>
      </View>
      <TouchableOpacity
        style={[
          styles.genButton,
          (disabled || canceling || (isProcessing && !canCancel)) && styles.genButtonDisabled,
          isProcessing && styles.cancelButton,
        ]}
        onPress={isProcessing ? onCancel : onPress}
        disabled={disabled || canceling || (isProcessing && !canCancel)}
      >
        <Ionicons name={isProcessing ? 'stop-circle-outline' : 'sparkles-outline'} size={17} color={Colors.white} />
        <Text style={styles.genButtonLabel}>{buttonLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

function CollapsibleSection({
  icon,
  title,
  open,
  onPress,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  open: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <TouchableOpacity style={styles.sectionHeader} onPress={onPress}>
        <View style={styles.sectionLabelRow}>
          <Ionicons name={icon} size={13} color={Colors.mint} />
          <Text style={styles.sectionLabel}>{title}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textLight} />
      </TouchableOpacity>
      {open && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
}

function RagPanel({
  open,
  onToggle,
  chats,
  inputText,
  setInputText,
  onSend,
  scrollRef,
  disabled,
}: {
  open: boolean;
  onToggle: () => void;
  chats: ChatMessage[];
  inputText: string;
  setInputText: (text: string) => void;
  onSend: () => void;
  scrollRef: RefObject<ScrollView | null>;
  disabled: boolean;
}) {
  return (
    <View style={styles.chatPanel}>
      <TouchableOpacity style={styles.panelHandleButton} onPress={onToggle}>
        <View style={styles.panelHandle} />
      </TouchableOpacity>
      <View style={styles.panelTitleRow}>
        <Ionicons name="chatbubble-ellipses-outline" size={14} color={disabled ? Colors.textLight : Colors.mint} />
        <Text style={styles.panelTitle}>이 파일로 질문하기</Text>
      </View>
      {open && !disabled && (
        <ScrollView ref={scrollRef} style={styles.chatScroll} contentContainerStyle={styles.chatList}>
          {chats.map((message, index) => (
            <View key={`${message.role}-${index}`} style={message.role === 'user' ? styles.chatMine : styles.chatAi}>
              <Text style={message.role === 'user' ? styles.chatMineText : styles.chatAiText}>{message.text}</Text>
            </View>
          ))}
        </ScrollView>
      )}
      <View style={[styles.inputRow, disabled && styles.inputRowDisabled]}>
        <TextInput
          style={styles.input}
          placeholder={disabled ? '요약 생성 후 질문할 수 있어요' : '이 내용으로 질문하세요...'}
          placeholderTextColor="#bbb"
          value={disabled ? '' : inputText}
          onChangeText={disabled ? undefined : setInputText}
          onSubmitEditing={disabled ? undefined : onSend}
          editable={!disabled}
        />
        <TouchableOpacity onPress={onSend} disabled={disabled}>
          <Ionicons name="send" size={17} color={disabled ? '#ccc' : Colors.mint} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    backgroundColor: Colors.white,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 7,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#F0FAF7',
    borderWidth: 0.5,
    borderColor: '#c8ede3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: Colors.mint,
  },
  tabText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  tabTextActive: {
    color: Colors.mint,
    fontWeight: '600',
  },
  body: {
    flex: 1,
  },
  content: {
    padding: 12,
    paddingBottom: 10,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 20,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: Colors.mintLight,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  emptyIconWrapFailed: {
    backgroundColor: '#FDECEC',
  },
  emptyBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: '#e0f0eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textDark,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: -6,
  },
  infoPill: {
    width: '100%',
    backgroundColor: '#F0FAF7',
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  infoPillFailed: {
    backgroundColor: '#FFF3F3',
  },
  infoIcon: {
    marginTop: 1,
  },
  infoPillText: {
    flex: 1,
    fontSize: 11,
    color: '#0F6E56',
    lineHeight: 19,
  },
  infoPillTextFailed: {
    color: '#9E2F2F',
  },
  genButton: {
    width: '100%',
    borderRadius: 13,
    backgroundColor: Colors.mint,
    paddingVertical: 14,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  genButtonDisabled: {
    opacity: 0.62,
  },
  cancelButton: {
    backgroundColor: '#D85A30',
  },
  genButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.white,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
    marginBottom: 8,
    overflow: 'hidden',
  },
  sectionHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.mint,
  },
  sectionBody: {
    borderTopWidth: 0.5,
    borderTopColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  sectionText: {
    fontSize: 12,
    color: '#444',
    lineHeight: 20,
    paddingTop: 8,
  },
  contextItem: {
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f5f5f5',
  },
  contextTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 5,
  },
  contextDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  contextTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textDark,
  },
  contextText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 20,
    paddingLeft: 11,
  },
  keywordWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 8,
  },
  keyword: {
    backgroundColor: Colors.mintLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  keywordPurple: {
    backgroundColor: '#EEEDFE',
  },
  keywordCoral: {
    backgroundColor: '#FAECE7',
  },
  keywordText: {
    fontSize: 11,
    color: '#0F6E56',
    fontWeight: '500',
  },
  keywordTextPurple: {
    color: '#3C3489',
  },
  keywordTextCoral: {
    color: '#712B13',
  },
  scriptBody: {
    padding: 12,
  },
  scriptItem: {
    marginBottom: 10,
  },
  scriptTime: {
    fontSize: 10,
    color: Colors.textLight,
    marginBottom: 2,
  },
  scriptText: {
    fontSize: 12,
    color: '#333',
    lineHeight: 19,
  },
  chatPanel: {
    backgroundColor: Colors.white,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  panelHandleButton: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 6,
  },
  panelHandle: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#ddd',
  },
  panelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  panelTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#888',
  },
  chatScroll: {
    maxHeight: 112,
  },
  chatList: {
    gap: 5,
    paddingBottom: 3,
  },
  chatAi: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.bg,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
    maxWidth: '88%',
  },
  chatMine: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.mintLight,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
    maxWidth: '88%',
  },
  chatAiText: {
    fontSize: 11,
    color: '#444',
    lineHeight: 16,
  },
  chatMineText: {
    fontSize: 11,
    color: '#0F6E56',
    lineHeight: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.bg,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#e0f0eb',
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 6,
  },
  inputRowDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e8e8e8',
    opacity: 0.68,
  },
  input: {
    flex: 1,
    fontSize: 11,
    color: Colors.textDark,
    paddingVertical: 0,
  },
});
