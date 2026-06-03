import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  SafeAreaView,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { styles } from '@/styles/RecordingScreen.styles';
import { Colors } from '@/styles/theme';
import StopRecordingModal from '@/components/StopRecordingModal';
import { useRealtimeTranscription } from '@/hooks/useRealtimeTranscription';
import { saveRealtimeTranscript } from '@/api/realtime';

interface SearchPopupState {
  visible: boolean;
  word: string;
}

export default function RecordingScreen() {
  const router = useRouter();
  const [searchPopup, setSearchPopup] = useState<SearchPopupState>({
    visible: false,
    word: '',
  });
  const [activeKeyword, setActiveKeyword] = useState<string | null>(null);
  const [stopModal, setStopModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSummaries, setExpandedSummaries] = useState<Record<number, boolean>>({});
  const scrollRef = useRef<ScrollView>(null);

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

  // 녹음 시작/정리 — 기존 백엔드 연동 유지
  useEffect(() => {
    start().catch((err: Error) => {
      Alert.alert('녹음 오류', err.message, [{ text: '확인', onPress: () => router.back() }]);
    });
    return () => {
      stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const handleStop = async () => {
    setStopModal(false);
    setIsSaving(true);
    try {
      const result = await stop();
      await saveRealtimeTranscript({
        // 백엔드 유효 도메인 6종(general/legal/medical/science/it/religion) 중 하나여야 함.
        // 'meeting'/'lecture'는 미정규화 경로라 그대로 저장되어 메타데이터 품질 저하 → 'general' 사용.
        domain_type: 'general',
        title: `${recordDate} 녹음`, // 백엔드 필수 필드
        duration_seconds: elapsedSeconds,
        segments: result.map((seg) => ({
          segment_index: seg.finalIndex,
          start_seconds: Math.floor(seg.startSeconds),
          end_seconds: Math.floor(seg.endSeconds),
          text: seg.text,
        })),
      });
      router.back();
    } catch (err: unknown) {
      setIsSaving(false);
      const msg = err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.';
      Alert.alert('저장 실패', msg, [{ text: '취소', onPress: () => router.back() }]);
    }
  };

  // 키워드 탭 핸들러
  const handleKeywordPress = useCallback(
    (word: string) => {
      if (activeKeyword === word) {
        setSearchPopup({ visible: false, word: '' });
        setActiveKeyword(null);
        return;
      }
      setActiveKeyword(word);
      setSearchPopup({ visible: true, word });
    },
    [activeKeyword]
  );

  // 팝업 닫기
  const closePopup = useCallback(() => {
    setSearchPopup({ visible: false, word: '' });
    setActiveKeyword(null);
  }, []);

  // 검색 수행 — 검색 API 미연동, 추후 연결 예정
  const handleSearch = useCallback(
    (type: 'lecture' | 'web' | 'both') => {
      const word = searchPopup.word;
      closePopup();
      // TODO: 검색 결과 화면 연동 (강의자료/웹/둘 다)
      console.log(`검색: "${word}" / 타입: ${type}`);
    },
    [searchPopup.word, closePopup]
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
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={closePopup}>
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
                  <Text style={styles.summaryText}>{chunk.summary}</Text>
                  {isExpanded && chunk.fullText && (
                    <Text style={styles.fullText} selectable>
                      {chunk.fullText}
                    </Text>
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
              <Text style={styles.liveText} selectable>
                {displayLiveText || (isPaused ? '' : '받아쓰는 중...')}
                {isConnected && !isPaused && <Text style={styles.cursor}>|</Text>}
              </Text>
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
            <TouchableOpacity onPress={() => router.back()}>
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
                onPress={() => setStopModal(true)}
                disabled={isSaving}
              >
                <Ionicons name="stop" size={18} color="white" />
              </TouchableOpacity>
              <Text style={styles.ctrlLabel}>저장</Text>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>

      {/* 검색 팝업 모달 */}
      <Modal
        visible={searchPopup.visible}
        transparent
        animationType="fade"
        onRequestClose={closePopup}
      >
        <TouchableWithoutFeedback onPress={closePopup}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.popupContainer}>
                <View style={styles.popupQueryRow}>
                  <Ionicons name="search" size={13} color="#666" />
                  <View style={styles.popupWordBadge}>
                    <Text style={styles.popupWordText}>{searchPopup.word}</Text>
                  </View>
                  <Text style={styles.popupQueryLabel}>검색하기</Text>
                </View>

                <View style={styles.searchBtns}>
                  <TouchableOpacity
                    style={styles.searchBtn}
                    onPress={() => handleSearch('lecture')}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="book-outline" size={14} color="#444" />
                    <Text style={styles.searchBtnText}>강의자료</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.searchBtn}
                    onPress={() => handleSearch('web')}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="globe-outline" size={14} color="#444" />
                    <Text style={styles.searchBtnText}>웹 검색</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.searchBtn, styles.searchBtnPrimary]}
                    onPress={() => handleSearch('both')}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="grid-outline" size={14} color="white" />
                    <Text style={[styles.searchBtnText, styles.searchBtnTextPrimary]}>둘 다</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <StopRecordingModal
        visible={stopModal}
        onCancel={() => setStopModal(false)}
        onConfirm={handleStop}
      />
    </SafeAreaView>
  );
}
