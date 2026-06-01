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

export default function RecordingScreen() {
  const router = useRouter();
  const [stopModal, setStopModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const { isConnected, isPaused, segments, elapsedSeconds, start, pause, resume, stop } =
    useRealtimeTranscription();

  useEffect(() => {
    start().catch((err: Error) => {
      Alert.alert('녹음 오류', err.message, [{ text: '확인', onPress: () => router.back() }]);
    });
    return () => { stop().catch(() => {}); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (segments.length > 0) scrollRef.current?.scrollToEnd({ animated: true });
  }, [segments]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, '0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
  };

  const handleStop = async () => {
    setStopModal(false);
    setIsSaving(true);
    try {
      const result = await stop();
      await saveRealtimeTranscript({
        domain_type: 'meeting',
        duration_seconds: elapsedSeconds,
        segments: result.map((seg, i) => ({
          segment_index: i,
          start_seconds: seg.chunkIndex * 5,
          end_seconds: (seg.chunkIndex + 1) * 5,
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
          {segments.map((seg, i) => (
            <View key={i} style={styles.scriptItem}>
              <Text style={styles.scriptTime}>{formatTime(seg.chunkIndex * 5)}</Text>
              <Text style={styles.scriptText}>{seg.text}</Text>
            </View>
          ))}
          {isConnected && !isPaused && (
            <View style={styles.scriptItem}>
              <Text style={styles.scriptTime}>{formatTime(elapsedSeconds)}</Text>
              <Text style={[styles.scriptText, styles.scriptTyping]}>받아쓰는 중...</Text>
            </View>
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
