import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { styles } from '@/styles/RecordingScreen.styles';
import { Colors } from '@/styles/theme';
import StopRecordingModal from '@/components/StopRecordingModal';
import { useRealtimeTranscription } from '@/hooks/useRealtimeTranscription';
import { saveRealtimeTranscript } from '@/api/realtime';

// 백엔드 summary 구간 길이와 동일하게 유지 (RealtimeSummaryBuffer threshold_seconds)
const SEGMENT_WINDOW_SECONDS = 25;

export default function RecordingScreen() {
  const router = useRouter();
  const [stopModal, setStopModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSet, setExpandedSet] = useState<Set<number>>(new Set());
  const scrollRef = useRef<ScrollView>(null);

  const {
    isConnected,
    isPaused,
    completedSegments,
    currentTranscripts,
    interimText,
    elapsedSeconds,
    start,
    pause,
    resume,
    stop,
  } = useRealtimeTranscription();

  useEffect(() => {
    start().catch((err: Error) => {
      Alert.alert('녹음 오류', err.message, [{ text: '확인', onPress: () => router.back() }]);
    });
    return () => { stop().catch(() => {}); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [completedSegments, currentTranscripts, interimText]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, '0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
  };

  const toggleExpand = (idx: number) => {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const handleStop = async () => {
    setStopModal(false);
    setIsSaving(true);
    try {
      await stop();

      // completedSegments: 백엔드가 summary를 보낸 완료 구간 → fullText를 저장
      // currentTranscripts: 아직 summary가 안 온 나머지 텍스트 → 마지막 구간으로 저장
      const segments = [
        ...completedSegments.map((seg) => ({
          segment_index: seg.segmentIndex,
          start_seconds: seg.segmentIndex * SEGMENT_WINDOW_SECONDS,
          end_seconds: (seg.segmentIndex + 1) * SEGMENT_WINDOW_SECONDS,
          text: seg.fullText,
        })),
        ...(currentTranscripts.length > 0
          ? [{
              segment_index: completedSegments.length,
              start_seconds: completedSegments.length * SEGMENT_WINDOW_SECONDS,
              end_seconds: elapsedSeconds,
              text: currentTranscripts.join(' '),
            }]
          : []),
      ];

      if (segments.length > 0) {
        await saveRealtimeTranscript({
          domain_type: 'general',
          title: new Date().toLocaleDateString('ko-KR') + ' 녹음',
          duration_seconds: elapsedSeconds,
          segments,
        });
      }
      router.back();
    } catch (err: unknown) {
      setIsSaving(false);
      const msg = err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.';
      Alert.alert('저장 실패', msg, [{ text: '취소', onPress: () => router.back() }]);
    }
  };

  const WaveBar = ({ active }: { active: boolean }) => (
    <View style={[styles.waveBar, active && styles.waveBarActive]} />
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelBtn}>취소</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.langBtn}>
          <Ionicons name="globe-outline" size={16} color={Colors.textMid} />
          <Text style={styles.langText}>한국어로 받아쓰기 중</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.textLight} />
        </TouchableOpacity>
      </View>

      <View style={styles.timerSection}>
        <View style={styles.timerRow}>
          <View style={[styles.recDot, isPaused && styles.recDotPaused]} />
          <Text style={styles.timer}>{formatTime(elapsedSeconds)}</Text>
        </View>
        <Text style={styles.recordTitle}>
          {new Date().toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}{' '}
          녹음
        </Text>
      </View>

      <View style={styles.waveContainer}>
        {Array.from({ length: 32 }).map((_, i) => (
          <WaveBar key={i} active={isConnected && !isPaused && i < 18} />
        ))}
      </View>

      <TouchableOpacity style={styles.highlightBtn}>
        <Ionicons name="bookmark-outline" size={16} color={Colors.mint} />
        <Text style={styles.highlightText}>하이라이트 추가</Text>
      </TouchableOpacity>

      <View style={styles.scriptContainer}>
        <View style={styles.scriptHeader}>
          <Ionicons name="document-text-outline" size={14} color={Colors.mint} />
          <Text style={styles.scriptHeaderText}>실시간 스크립트</Text>
        </View>
        <ScrollView
          ref={scrollRef}
          style={styles.scriptScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* 완료된 구간 — 백엔드 summary 이벤트로 교체된 카드 */}
          {completedSegments.map((seg) => {
            const expanded = expandedSet.has(seg.segmentIndex);
            return (
              <View key={seg.segmentIndex} style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <Text style={styles.summaryLabel}>구간 {seg.segmentIndex + 1}</Text>
                  <TouchableOpacity onPress={() => toggleExpand(seg.segmentIndex)}>
                    <Text style={styles.expandBtn}>{expanded ? '접기' : '전체 보기'}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.summaryText}>
                  {expanded ? seg.fullText : seg.summary}
                </Text>
              </View>
            );
          })}

          {/* 현재 구간 — is_final=true 누적 텍스트 */}
          {currentTranscripts.length > 0 && (
            <View style={styles.scriptItem}>
              <Text style={styles.scriptText}>{currentTranscripts.join(' ')}</Text>
            </View>
          )}

          {/* 실시간 미리보기 — is_final=false, 계속 덮어쓰임 */}
          {interimText ? (
            <View style={styles.scriptItem}>
              <Text style={[styles.scriptText, styles.scriptTyping]}>{interimText}</Text>
            </View>
          ) : (
            isConnected && !isPaused && (
              <View style={styles.scriptItem}>
                <Text style={[styles.scriptText, styles.scriptTyping]}>받아쓰는 중...</Text>
              </View>
            )
          )}
        </ScrollView>
      </View>

      <Text style={styles.notice}>
        녹음 중 다른 앱 사용을 잠시 멈춰주세요.{'\n'}받아쓰기가 실패할 수 있어요.
      </Text>

      <View style={styles.controls}>
        <View style={styles.controlSide}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelText}>취소</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centerCol}>
          <TouchableOpacity
            style={[styles.mainBtn, isPaused && styles.mainBtnPaused]}
            onPress={() => (isPaused ? resume() : pause())}
          >
            <Ionicons
              name={isPaused ? 'mic' : 'pause'}
              size={28}
              color={isPaused ? Colors.white : '#333'}
            />
          </TouchableOpacity>
          <Text style={styles.pauseLabel}>{isPaused ? '녹음 이어하기' : '일시정지'}</Text>
        </View>
        <View style={styles.controlSide}>
          <TouchableOpacity
            style={styles.stopBtn}
            onPress={() => setStopModal(true)}
            disabled={isSaving}
          >
            <View style={styles.stopIcon} />
          </TouchableOpacity>
          <Text style={styles.saveLabel}>저장</Text>
        </View>
      </View>

      <StopRecordingModal
        visible={stopModal}
        onCancel={() => setStopModal(false)}
        onConfirm={handleStop}
      />
    </SafeAreaView>
  );
}
