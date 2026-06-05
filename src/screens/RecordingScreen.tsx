import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BackHandler,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import { styles } from '@/styles/RecordingScreen.styles';
import { Colors } from '@/styles/theme';
import StopRecordingModal from '@/components/StopRecordingModal';
import SaveRecordingModal from '@/components/SaveRecordingModal';
import { useRealtimeTranscription } from '@/hooks/useRealtimeTranscription';
import { saveRealtimeTranscript } from '@/api/realtime';
import {
  ContextPopup,
  DocSelector,
  ResultPanel,
  useScriptSearch,
} from '../../SearchPanel';

const TOKEN_PARTS_PATTERN = /(\s+)/;
const SENTENCE_PATTERN = /[^.!?。！？\n]+[.!?。！？]?|\n+/g;
const EDGE_PUNCTUATION_PATTERN =
  /^[\s"'“”‘’([{<]+|[\s"'“”‘’)\]}>.,!?;:。！？]+$/g;

function splitScriptSentences(text: string): string[] {
  return text.match(SENTENCE_PATTERN)?.filter(Boolean) ?? [text];
}

function normalizeSearchToken(token: string): string {
  return token.trim().replace(EDGE_PUNCTUATION_PATTERN, '');
}

function SelectableScriptText({
  text,
  style,
  selectedText,
  onSelectText,
  suffix,
}: {
  text: string;
  style: StyleProp<TextStyle>;
  selectedText: string;
  onSelectText: (text: string) => void;
  suffix?: ReactNode;
}) {
  return (
    <Text style={style}>
      {splitScriptSentences(text).map((sentence, sentenceIndex) => {
        const sentenceText = sentence.trim();
        return sentence.split(TOKEN_PARTS_PATTERN).map((part, partIndex) => {
          if (!part || /^\s+$/.test(part)) return part;

          const query = normalizeSearchToken(part);
          if (!query) return part;

          const selected = selectedText === query || selectedText === sentenceText;
          return (
            <Text
              key={`${sentenceIndex}-${partIndex}-${part}`}
              style={selected && styles.selectedScriptToken}
              suppressHighlighting
              onPress={() => onSelectText(query)}
              onLongPress={() => {
                if (sentenceText) onSelectText(sentenceText);
              }}
            >
              {part}
            </Text>
          );
        });
      })}
      {suffix}
    </Text>
  );
}

export default function RecordingScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [activeKeyword, setActiveKeyword] = useState<string | null>(null);
  const [stopModal, setStopModal] = useState(false);
  const [saveModal, setSaveModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSummaries, setExpandedSummaries] = useState<Record<number, boolean>>({});
  const scrollRef = useRef<ScrollView>(null);
  const shouldLeaveRef = useRef(false);

  const {
    isConnected,
    isPaused,
    segments,
    summaries,
    interimText,
    elapsedSeconds,
    start,
    pause,
    resume,
    stop,
  } = useRealtimeTranscription();

  const {
    selectedText,
    documents,
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
  } = useScriptSearch({
    onAudioLocationPress: (timestamp, result) => {
      router.push({
        pathname: '/detail',
        params: {
          timestamp,
          source: result.source_name,
        },
      });
    },
    onDocumentLocationPress: (page, result) => {
      router.push({
        pathname: '/pdf',
        params: {
          page: String(page),
          source: result.source_name,
        },
      });
    },
    onError: (message) => {
      Alert.alert('검색 실패', message);
    },
  });

  // 녹음 시작/정리 — 기존 백엔드 연동 유지
  useEffect(() => {
    start().catch((err: Error) => {
      Alert.alert('녹음 오류', err.message, [
        {
          text: '확인',
          onPress: () => {
            shouldLeaveRef.current = true;
            router.back();
          },
        },
      ]);
    });
    return () => {
      stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setStopModal(true);
      return true;
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (shouldLeaveRef.current) return;

      event.preventDefault();
      setStopModal(true);
    });

    return unsubscribe;
  }, [navigation]);

  // 새 전사 수신 시 하단으로 스크롤
  useEffect(() => {
    if (segments.length > 0 || interimText || summaries.length > 0) {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [interimText, segments, summaries]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600)
      .toString()
      .padStart(2, '0');
    const m = Math.floor((s % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
  };

  // 저장(stop) — 기존 백엔드 연동 유지
  const openSaveModal = () => {
    if (isSaving) return;
    setStopModal(false);
    setSaveModal(true);
  };

  const handleStop = async (fileName: string) => {
    setSaveModal(false);
    setIsSaving(true);
    try {
      const result = await stop();
      await saveRealtimeTranscript({
        // 백엔드 유효 도메인 6종(general/legal/medical/science/it/religion) 중 하나여야 함.
        // 'meeting'/'lecture'는 미정규화 경로라 그대로 저장되어 메타데이터 품질 저하 → 'general' 사용.
        domain_type: 'general',
        title: fileName, // 백엔드 필수 필드
        duration_seconds: elapsedSeconds,
        segments: result.map((seg) => ({
          segment_index: seg.finalIndex,
          start_seconds: Math.floor(seg.startSeconds),
          end_seconds: Math.floor(seg.endSeconds),
          text: seg.text,
        })),
      });
      shouldLeaveRef.current = true;
      router.back();
    } catch (err: unknown) {
      setIsSaving(false);
      setSaveModal(true);
      const msg = err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.';
      Alert.alert('저장 실패', msg, [
        {
          text: '취소',
          onPress: () => {
            shouldLeaveRef.current = true;
            router.back();
          },
        },
      ]);
    }
  };

  const handleDiscard = async () => {
    setStopModal(false);
    try {
      await stop();
    } catch (error) {
      console.warn('[Realtime] discard stop failed:', error);
    } finally {
      shouldLeaveRef.current = true;
      router.back();
    }
  };

  // 키워드 탭 핸들러
  const handleKeywordPress = useCallback(
    (word: string) => {
      if (activeKeyword === word) {
        closeAll();
        setActiveKeyword(null);
        return;
      }
      setActiveKeyword(word);
      onTextLongPress(word);
    },
    [activeKeyword, closeAll, onTextLongPress]
  );

  const closeSearch = useCallback(() => {
    closeAll();
    setActiveKeyword(null);
  }, [closeAll]);

  const handleTextLongPress = useCallback(
    (text: string) => {
      setActiveKeyword(null);
      onTextLongPress(text);
    },
    [onTextLongPress]
  );

  const toggleSummary = useCallback((segmentIndex: number) => {
    setExpandedSummaries((current) => ({
      ...current,
      [segmentIndex]: !current[segmentIndex],
    }));
  }, []);

  // 실시간 전사 텍스트 (서버 전사 결과)
  const liveText = segments.map((seg) => seg.text).join(' ');
  const displayLiveText = [liveText, interimText].filter(Boolean).join(' ');
  const liveStart = segments.length > 0 ? formatTime(segments[0].startSeconds) : formatTime(0);

  const recordDate = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
          {/* 타이머 */}
          <View style={styles.timerSection}>
            <View style={styles.timerRow}>
              <View style={[styles.recDot, !isPaused && styles.recDotActive]} />
              <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
            </View>
            <Text style={styles.recDate}>{recordDate} 녹음</Text>
            {isPaused && <Text style={styles.pausedBadge}>일시정지 중</Text>}
          </View>

          {/* 파형 — 일시정지 시 흐리게 */}
          <View style={[styles.waveform, isPaused && styles.waveformPaused]}>
            {[6, 14, 20, 10, 24, 16, 8, 18, 22, 12, 20, 6, 16, 24, 10, 18, 14, 8].map((h, i) => (
              <View key={i} style={[styles.waveBar, { height: h }]} />
            ))}
          </View>

          {/* 하이라이트 버튼 */}
          <TouchableOpacity style={styles.highlightBtn} disabled={isPaused}>
            <Ionicons name="bookmark-outline" size={15} color={isPaused ? '#ccc' : Colors.mint} />
            <Text style={[styles.highlightText, isPaused && styles.disabledText]}>
              하이라이트 추가
            </Text>
          </TouchableOpacity>

          {/* 스크립트 영역 — isPaused 상관없이 항상 표시 */}
          <ScrollView ref={scrollRef} style={styles.scriptArea} showsVerticalScrollIndicator={false}>
            {summaries.map((chunk) => {
              const isExpanded = expandedSummaries[chunk.segmentIndex] ?? false;
              return (
                <View key={chunk.segmentIndex} style={styles.chunkSummarized}>
                  <View style={styles.chunkTimeRow}>
                    <Ionicons name="sparkles" size={11} color={Colors.mint} />
                    <Text style={styles.chunkTimeText}>{chunk.timeRange} 요약</Text>
                  </View>
                  <SelectableScriptText
                    style={styles.summaryText}
                    text={chunk.summary}
                    selectedText={selectedText}
                    onSelectText={handleTextLongPress}
                  />
                  {isExpanded && chunk.fullText && (
                    <SelectableScriptText
                      style={styles.fullText}
                      text={chunk.fullText}
                      selectedText={selectedText}
                      onSelectText={handleTextLongPress}
                    />
                  )}
                  {chunk.keywords.length > 0 && (
                    <View style={styles.keywordRow}>
                      {chunk.keywords.map((word) => (
                        <TouchableOpacity
                          key={`${chunk.segmentIndex}-${word}`}
                          style={[styles.keyword, activeKeyword === word && styles.keywordActive]}
                          onPress={() => handleKeywordPress(word)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.keywordText,
                              activeKeyword === word && styles.keywordTextActive,
                            ]}
                          >
                            {word}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {chunk.fullText && (
                    <TouchableOpacity
                      style={styles.summaryToggle}
                      onPress={() => toggleSummary(chunk.segmentIndex)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.summaryToggleText}>
                        {isExpanded ? '접기' : '전체 보기'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {/* 실시간 현재 문단 */}
            <View style={styles.chunkLive}>
              <View style={styles.chunkLiveTimeRow}>
                <View style={[styles.liveIndicator, isPaused && styles.liveIndicatorPaused]} />
                <Text style={styles.chunkLiveTimeText}>
                  {liveStart} — {isPaused ? '일시정지' : '지금'}
                </Text>
              </View>
              {displayLiveText ? (
                <SelectableScriptText
                  style={styles.liveText}
                  text={displayLiveText}
                  selectedText={selectedText}
                  onSelectText={handleTextLongPress}
                  suffix={isConnected && !isPaused ? <Text style={styles.cursor}>|</Text> : null}
                />
              ) : (
                <Text style={styles.liveText}>
                  {isPaused ? '' : '받아쓰는 중...'}
                  {isConnected && !isPaused && <Text style={styles.cursor}>|</Text>}
                </Text>
              )}
            </View>
          </ScrollView>

          {/* 안내 문구 */}
          {!isPaused && (
            <Text style={styles.notice}>
              녹음 중 다른 앱 사용을 잠시 멈춰주세요.{'\n'}받아쓰기가 실패할 수 있어요.
            </Text>
          )}

          {/* 하단 컨트롤 */}
          <View style={styles.bottomControls}>
            <TouchableOpacity onPress={() => setStopModal(true)} disabled={isSaving}>
              <Text style={styles.ctrlLabel}>취소</Text>
            </TouchableOpacity>

            <View style={styles.centerCol}>
              <TouchableOpacity
                style={styles.btnPause}
                onPress={() => (isPaused ? resume() : pause())}
              >
                <Ionicons name={isPaused ? 'play' : 'pause'} size={22} color="#1A1A1A" />
              </TouchableOpacity>
              <Text style={styles.ctrlLabel}>{isPaused ? '재개' : '일시정지'}</Text>
            </View>

            <View style={styles.centerCol}>
              <TouchableOpacity
                style={styles.btnStop}
                onPress={openSaveModal}
                disabled={isSaving}
              >
                <Ionicons name="stop" size={18} color="white" />
              </TouchableOpacity>
              <Text style={styles.ctrlLabel}>저장</Text>
            </View>
          </View>
      </View>

      {showPopup && (
        <ContextPopup
          selectedText={selectedText}
          onSelect={onScopeSelect}
          onClose={closeSearch}
        />
      )}

      {showDocSelector && (
        <DocSelector documents={documents} onSelect={onDocSelect} onClose={closeSearch} />
      )}

      {showResults && (
        <ResultPanel
          results={results}
          loading={loading}
          query={selectedText}
          scope={scope}
          sourceName={selectedSource?.name}
          onClose={closeSearch}
          onLocationPress={onLocationPress}
        />
      )}

      <StopRecordingModal
        visible={stopModal}
        onCancel={() => setStopModal(false)}
        onDiscard={handleDiscard}
        onSave={openSaveModal}
      />

      <SaveRecordingModal
        visible={saveModal}
        defaultName={`${recordDate} 녹음`}
        onCancel={() => setSaveModal(false)}
        onSave={handleStop}
      />
    </View>
  );
}
