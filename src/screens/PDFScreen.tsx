import { useEffect, useRef, useState, type RefObject } from 'react';
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
  fileDetailToSummaryResponse,
  getFileDetail,
  getProcessStatus,
  processFile,
  type ProcessStatus,
  type TranscriptSummaryContext,
  type TranscriptSummaryResponse,
} from '@/api/files';
import { AppBottomBar } from '@/components/AppBottomBar';
import { Colors } from '@/styles/theme';

type PdfTab = 'summary' | 'text' | 'qa';
type ChatMessage = { role: 'user' | 'ai'; text: string };
type PdfStatus = ProcessStatus;

const VALID_STATUSES: PdfStatus[] = ['uploaded', 'processing', 'completed', 'failed', 'cancelled'];
const TABS: { key: PdfTab; label: string }[] = [
  { key: 'summary', label: '요약' },
  { key: 'text', label: '전체 텍스트' },
  { key: 'qa', label: '질의응답' },
];

function getSearchParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function normalizeStatus(status: string | undefined): PdfStatus {
  if (status === 'canceled' || status === 'cancelled') return 'cancelled';
  return VALID_STATUSES.includes(status as PdfStatus) ? (status as PdfStatus) : 'uploaded';
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeTextItem(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return cleanText(record.keyword) || cleanText(record.title) || cleanText(record.name) || cleanText(record.summary);
  }
  return '';
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

function getSummaryTitle(data: TranscriptSummaryResponse | null, fallback: string): string {
  return cleanText(data?.overview?.title) || cleanText(data?.title) || fallback;
}

function getSummaryText(data: TranscriptSummaryResponse | null): string {
  const directSummary = cleanText(data?.overview?.summary) || cleanText(data?.summary);
  if (directSummary) return directSummary;

  return (data?.contexts ?? [])
    .map((context) => cleanText(context.content))
    .filter(Boolean)
    .join('\n\n');
}

function getFullText(data: TranscriptSummaryResponse | null): string {
  const directText =
    cleanText(data?.full_text) || cleanText(data?.fullText) || cleanText(data?.transcript) || cleanText(data?.text);
  if (directText) return directText;

  const contextText = (data?.contexts ?? [])
    .map((context) => {
      const topic = cleanText(context.topic);
      const content = cleanText(context.content);
      return [topic, content].filter(Boolean).join('\n');
    })
    .filter(Boolean)
    .join('\n\n');
  if (contextText) return contextText;

  return (data?.chunks ?? data?.summaries ?? [])
    .map((chunk) => cleanText(chunk.full_text) || cleanText(chunk.fullText) || cleanText(chunk.text))
    .filter(Boolean)
    .join('\n\n');
}

function getKeyPoints(data: TranscriptSummaryResponse | null): string[] {
  return (data?.overview?.key_points ?? []).map(normalizeTextItem).filter(Boolean);
}

function getKeywords(data: TranscriptSummaryResponse | null): string[] {
  const keywords = [
    ...(data?.keywords ?? []),
    ...(data?.contexts ?? []).flatMap((context) => [...(context.keywords ?? []), ...(context.concepts ?? [])]),
    ...(data?.chunks ?? data?.summaries ?? []).flatMap((chunk) => chunk.keywords ?? []),
  ];
  return Array.from(new Set(keywords.map(normalizeTextItem).filter(Boolean)));
}

function getContexts(data: TranscriptSummaryResponse | null): TranscriptSummaryContext[] {
  return data?.contexts?.filter((context) => cleanText(context.topic) || cleanText(context.content)) ?? [];
}

export default function PDFScreen() {
  const params = useLocalSearchParams<{
    transcriptId?: string | string[];
    status?: string | string[];
    title?: string | string[];
    source?: string | string[];
  }>();
  const transcriptId = getSearchParam(params.transcriptId);
  const fallbackTitle = getSearchParam(params.title) || getSearchParam(params.source) || '문서';

  const [activeTab, setActiveTab] = useState<PdfTab>('summary');
  const [pdfStatus, setPdfStatus] = useState<PdfStatus>(() => normalizeStatus(getSearchParam(params.status)));
  const [summaryData, setSummaryData] = useState<TranscriptSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [canceling, setCanceling] = useState(false);
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const processAbortRef = useRef<AbortController | null>(null);
  const statusBeforeProcessingRef = useRef<PdfStatus>(pdfStatus === 'processing' ? 'uploaded' : pdfStatus);
  const isCompleted = pdfStatus === 'completed';
  const title = getSummaryTitle(summaryData, fallbackTitle);

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

    getFileDetail(transcriptId, abortController.signal)
      .then((data) => {
        const nextStatus = getProcessStatus(data);
        setPdfStatus(nextStatus);
        setSummaryData(nextStatus === 'completed' ? fileDetailToSummaryResponse(data) : null);
      })
      .catch((error) => {
        if (abortController.signal.aborted) return;
        setSummaryError(error instanceof Error ? error.message : '문서 데이터를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!abortController.signal.aborted) setSummaryLoading(false);
      });

    return () => abortController.abort();
  }, [isCompleted, transcriptId]);

  const handleGenerate = async () => {
    if (pdfStatus === 'processing') return;
    if (!transcriptId) {
      Alert.alert('파일 정보 없음', '처리할 문서 정보를 찾을 수 없습니다.');
      return;
    }

    const abortController = new AbortController();
    statusBeforeProcessingRef.current = pdfStatus;
    processAbortRef.current?.abort();
    processAbortRef.current = abortController;
    setPdfStatus('processing');

    try {
      const result = await processFile(transcriptId, abortController.signal);
      setPdfStatus(getProcessStatus(result));
    } catch (error) {
      if (abortController.signal.aborted) {
        setPdfStatus(statusBeforeProcessingRef.current);
        return;
      }
      setPdfStatus('failed');
      Alert.alert('생성 실패', error instanceof Error ? error.message : '문서 데이터 생성에 실패했습니다.');
    } finally {
      if (processAbortRef.current === abortController) processAbortRef.current = null;
    }
  };

  const handleCancelGenerate = async () => {
    if (pdfStatus !== 'processing' || canceling || !transcriptId) return;

    setCanceling(true);
    try {
      const result = await cancelFileProcess(transcriptId);
      const nextStatus = getProcessStatus(result);
      statusBeforeProcessingRef.current = nextStatus;
      processAbortRef.current?.abort();
      processAbortRef.current = null;
      setPdfStatus(nextStatus);
      setSummaryData(null);
      setSummaryError('');
    } catch (error) {
      Alert.alert('중지 실패', error instanceof Error ? error.message : '문서 데이터 생성을 중지하지 못했습니다.');
    } finally {
      setCanceling(false);
    }
  };

  const handleSend = () => {
    if (!isCompleted || !inputText.trim()) return;
    setChats((prev) => [
      ...prev,
      { role: 'user', text: inputText },
      { role: 'ai', text: '문서 내용을 기준으로 답변을 준비하고 있습니다.' },
    ]);
    setInputText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.nav}>
        <View style={styles.navLeft}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#333" />
          </TouchableOpacity>
          <Text style={styles.navTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <View style={styles.navRight}>
          {activeTab === 'text' && (
            <TouchableOpacity>
              <Ionicons name="search-outline" size={20} color="#888" />
            </TouchableOpacity>
          )}
          <TouchableOpacity>
            <Ionicons name="share-outline" size={20} color="#888" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="ellipsis-vertical" size={20} color="#888" />
          </TouchableOpacity>
        </View>
      </View>

      {isCompleted && (
        <View style={styles.tabs}>
          {TABS.map((tab) => (
            <TouchableOpacity key={tab.key} style={styles.tabItem} onPress={() => setActiveTab(tab.key)}>
              <Text style={[styles.tabTxt, activeTab === tab.key && styles.tabTxtActive]}>{tab.label}</Text>
              {activeTab === tab.key && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {isCompleted ? (
        <>
          {activeTab === 'summary' && (
            <SummaryTab data={summaryData} loading={summaryLoading} error={summaryError} fallbackTitle={fallbackTitle} />
          )}
          {activeTab === 'text' && <TextTab data={summaryData} loading={summaryLoading} error={summaryError} />}
          {activeTab === 'qa' && (
            <QATab
              chats={chats}
              inputText={inputText}
              setInputText={setInputText}
              onSend={handleSend}
              scrollRef={scrollRef}
            />
          )}
        </>
      ) : (
        <GenerationState
          status={pdfStatus}
          onPress={handleGenerate}
          onCancel={handleCancelGenerate}
          disabled={!transcriptId}
          canCancel={Boolean(transcriptId)}
          canceling={canceling}
        />
      )}

      <AppBottomBar active="work" />
    </SafeAreaView>
  );
}

function SummaryTab({
  data,
  loading,
  error,
  fallbackTitle,
}: {
  data: TranscriptSummaryResponse | null;
  loading: boolean;
  error: string;
  fallbackTitle: string;
}) {
  const summaryText = getSummaryText(data);
  const title = getSummaryTitle(data, fallbackTitle);
  const keyPoints = getKeyPoints(data);
  const contexts = getContexts(data);
  const keywords = getKeywords(data);

  if (loading) return <MessageState icon="sync-outline" title="문서 데이터를 불러오는 중입니다" />;
  if (error) return <MessageState icon="alert-circle-outline" title="문서 데이터를 불러오지 못했습니다" description={error} tone="failed" />;
  if (!summaryText && keyPoints.length === 0 && contexts.length === 0 && keywords.length === 0) {
    return <MessageState icon="document-text-outline" title="생성된 문서 데이터가 없습니다" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {summaryText ? (
        <View style={styles.summarySection}>
          <View style={styles.summaryTag}>
            <Ionicons name="sparkles" size={11} color={Colors.mint} />
            <Text style={styles.summaryTagTxt}>AI 요약</Text>
          </View>
          <Text style={styles.summaryTitle}>{title}</Text>
          <Text style={styles.summaryBody}>{summaryText}</Text>
        </View>
      ) : null}

      {keyPoints.length > 0 ? (
        <>
          <View style={styles.divider} />
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>주요 포인트</Text>
            <Text style={styles.summaryBody}>{keyPoints.map((point) => `• ${point}`).join('\n')}</Text>
          </View>
        </>
      ) : null}

      {contexts.length > 0 ? (
        <>
          <View style={styles.divider} />
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>구간별 요약</Text>
            {contexts.map((context, index) => {
              const topic = cleanText(context.topic) || `구간 ${index + 1}`;
              const content = cleanText(context.content);
              const timeLabel = `${formatSeconds(context.start_seconds)} - ${formatSeconds(context.end_seconds)}`;
              return (
                <View key={`${index}-${topic}`} style={styles.contextBlock}>
                  <View style={styles.contextHeader}>
                    <Text style={styles.contextTitle}>{topic}</Text>
                    <Text style={styles.contextTime}>{timeLabel}</Text>
                  </View>
                  {content ? <Text style={styles.summaryBody}>{content}</Text> : null}
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      {keywords.length > 0 ? (
        <>
          <View style={styles.divider} />
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>키워드</Text>
            <View style={styles.keywordRow}>
              {keywords.map((keyword) => (
                <View key={keyword} style={styles.keyword}>
                  <Text style={styles.keywordTxt}>{keyword}</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

function TextTab({
  data,
  loading,
  error,
}: {
  data: TranscriptSummaryResponse | null;
  loading: boolean;
  error: string;
}) {
  const contexts = getContexts(data);
  const fullText = getFullText(data);

  if (loading) return <MessageState icon="sync-outline" title="전체 텍스트를 불러오는 중입니다" />;
  if (error) return <MessageState icon="alert-circle-outline" title="전체 텍스트를 불러오지 못했습니다" description={error} tone="failed" />;
  if (contexts.length === 0 && !fullText) return <MessageState icon="document-text-outline" title="표시할 텍스트가 없습니다" />;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content}>
        {contexts.length > 0 ? (
          contexts.map((context, index) => (
            <View key={`${index}-${context.topic ?? context.start_seconds}`} style={styles.scriptBlock}>
              <Text style={styles.scriptTime}>
                {formatSeconds(context.start_seconds)}
                {context.end_seconds != null ? ` - ${formatSeconds(context.end_seconds)}` : ''}
              </Text>
              {cleanText(context.topic) ? <Text style={styles.scriptTitle}>{context.topic}</Text> : null}
              <Text style={styles.scriptBody}>{cleanText(context.content)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.scriptBody}>{fullText}</Text>
        )}
      </ScrollView>
      <View style={styles.playerBar}>
        <View style={styles.progBg}>
          <View style={styles.progFill}>
            <View style={styles.progHandle} />
          </View>
        </View>
        <View style={styles.playerTime}>
          <Text style={styles.playerTimeCurrent}>00:00</Text>
          <Text style={styles.playerTimeTotal}>{contexts.at(-1)?.end_seconds != null ? formatSeconds(contexts.at(-1)?.end_seconds) : '--:--'}</Text>
        </View>
      </View>
    </View>
  );
}

function QATab({
  chats,
  inputText,
  setInputText,
  onSend,
  scrollRef,
}: {
  chats: ChatMessage[];
  inputText: string;
  setInputText: (text: string) => void;
  onSend: () => void;
  scrollRef: RefObject<ScrollView | null>;
}) {
  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.chatList}>
        {chats.length === 0 ? (
          <View style={styles.qaEmpty}>
            <Ionicons name="chatbubble-ellipses-outline" size={28} color="#bbb" />
            <Text style={styles.qaEmptyText}>문서 내용에 대해 질문해보세요</Text>
          </View>
        ) : (
          chats.map((message, index) => (
            <View key={`${message.role}-${index}`} style={message.role === 'user' ? styles.bubbleWrapUser : styles.bubbleWrapAi}>
              {message.role === 'ai' && (
                <View style={styles.aiAvatar}>
                  <Ionicons name="sparkles" size={12} color={Colors.mint} />
                </View>
              )}
              <View style={message.role === 'user' ? styles.bubbleUser : styles.bubbleAi}>
                <Text style={message.role === 'user' ? styles.bubbleUserTxt : styles.bubbleAiTxt}>{message.text}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
      <View style={styles.inputBar}>
        <TextInput
          style={styles.inputField}
          placeholder="궁금한 내용을 질문해 보세요"
          placeholderTextColor="#bbb"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={onSend}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={onSend}>
          <Ionicons name="arrow-up" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
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
  status: PdfStatus;
  onPress: () => void;
  onCancel: () => void;
  disabled: boolean;
  canCancel: boolean;
  canceling: boolean;
}) {
  const isProcessing = status === 'processing';
  const isFailed = status === 'failed';
  const title = isProcessing
    ? '문서 데이터를 생성 중입니다'
    : isFailed
      ? '문서 데이터 생성에 실패했습니다'
      : '아직 문서 데이터가 생성되지 않았습니다';
  const description = isProcessing
    ? '완료되면 요약과 전체 텍스트를 확인할 수 있습니다.'
    : isFailed
      ? '다시 시도하면 문서 데이터를 생성할 수 있습니다.'
      : '버튼을 눌러 요약과 검색용 문서 데이터를 생성하세요.';
  const buttonLabel = isProcessing ? (canceling ? '중지 중' : '생성 중지') : isFailed ? '다시 생성' : '문서 데이터 생성';

  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconWrap, isFailed && styles.emptyIconWrapFailed]}>
        <Ionicons
          name={isFailed ? 'alert-circle-outline' : isProcessing ? 'sync-outline' : 'document-text-outline'}
          size={36}
          color={isFailed ? '#D94A4A' : Colors.mint}
        />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{description}</Text>
      <TouchableOpacity
        style={[styles.genButton, (disabled || canceling || (isProcessing && !canCancel)) && styles.genButtonDisabled, isProcessing && styles.cancelButton]}
        onPress={isProcessing ? onCancel : onPress}
        disabled={disabled || canceling || (isProcessing && !canCancel)}
      >
        <Ionicons name={isProcessing ? 'stop-circle-outline' : 'sparkles-outline'} size={17} color="#fff" />
        <Text style={styles.genButtonLabel}>{buttonLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

function MessageState({
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  navLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  navTitle: { fontSize: 14, fontWeight: '500', color: '#222', flex: 1 },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  tabs: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 10, position: 'relative' },
  tabTxt: { fontSize: 12, color: '#aaa' },
  tabTxtActive: { color: Colors.mint, fontWeight: '500' },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: '10%',
    width: '80%',
    height: 2,
    backgroundColor: Colors.mint,
    borderRadius: 2,
  },
  content: { padding: 18, paddingBottom: 32 },
  summarySection: { marginBottom: 12 },
  summaryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.mintLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 7,
  },
  summaryTagTxt: { fontSize: 11, color: Colors.mint, fontWeight: '500' },
  summaryTitle: { fontSize: 13, fontWeight: '500', color: '#222', marginBottom: 5 },
  summaryBody: { fontSize: 12, color: '#666', lineHeight: 19 },
  divider: { height: 0.5, backgroundColor: '#eee', marginVertical: 10 },
  contextBlock: {
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 5,
  },
  contextTitle: { flex: 1, fontSize: 12, fontWeight: '500', color: '#222' },
  contextTime: { fontSize: 10, color: Colors.mint, fontWeight: '500' },
  keywordRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  keyword: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: Colors.bg,
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
  },
  keywordTxt: { fontSize: 11, color: '#888' },
  scriptBlock: { marginBottom: 16 },
  scriptTime: { fontSize: 11, color: Colors.mint, fontWeight: '500', marginBottom: 4 },
  scriptTitle: { fontSize: 13, fontWeight: '500', color: '#222', marginBottom: 3 },
  scriptBody: { fontSize: 13, color: '#333', lineHeight: 20 },
  playerBar: {
    borderTopWidth: 0.5,
    borderTopColor: '#eee',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  progBg: {
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginBottom: 6,
  },
  progFill: {
    height: '100%',
    width: '20%',
    backgroundColor: Colors.mint,
    borderRadius: 4,
    position: 'relative',
  },
  progHandle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.mint,
    position: 'absolute',
    right: -6,
    top: -4,
  },
  playerTime: { flexDirection: 'row', justifyContent: 'space-between' },
  playerTimeCurrent: { fontSize: 11, color: Colors.mint },
  playerTimeTotal: { fontSize: 11, color: '#aaa' },
  chatList: { padding: 16, gap: 10, paddingBottom: 8, flexGrow: 1 },
  bubbleWrapUser: { flexDirection: 'row', justifyContent: 'flex-end' },
  bubbleWrapAi: { flexDirection: 'row', justifyContent: 'flex-start', gap: 6 },
  aiAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.mintLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  bubbleUser: {
    backgroundColor: Colors.mint,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderBottomRightRadius: 2,
    maxWidth: '75%',
  },
  bubbleUserTxt: { fontSize: 13, color: '#fff', lineHeight: 19 },
  bubbleAi: {
    backgroundColor: Colors.bg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderTopLeftRadius: 2,
    maxWidth: '80%',
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
  },
  bubbleAiTxt: { fontSize: 13, color: '#333', lineHeight: 19 },
  qaEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  qaEmptyText: { marginTop: 8, fontSize: 12, color: '#aaa' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: '#ddd',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.bg,
  },
  inputField: { flex: 1, fontSize: 13, color: '#333', paddingVertical: 0 },
  sendBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.mint,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  emptyIconWrapFailed: { backgroundColor: '#FDECEC' },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#222', textAlign: 'center' },
  emptySub: { fontSize: 12, color: '#999', textAlign: 'center', lineHeight: 20, marginTop: -6 },
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
  genButtonDisabled: { opacity: 0.62 },
  cancelButton: { backgroundColor: '#D85A30' },
  genButtonLabel: { fontSize: 13, fontWeight: '600', color: '#fff' },
});
