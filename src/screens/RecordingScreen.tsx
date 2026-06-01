import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { styles } from '@/styles/RecordingScreen.styles';
import { Colors } from '@/styles/theme';
import StopRecordingModal from '@/components/StopRecordingModal';

const MOCK_SCRIPTS = [
  { id: 1, time: '00:00:03', text: '안녕하세요, 오늘 회의 시작하겠습니다.' },
  { id: 2, time: '00:00:08', text: '지난번 안건에 대해서 먼저 이야기해볼까요?' },
  { id: 3, time: '00:00:15', text: '네, 말씀하신 대로 3분기 목표치를 조정하는 방향으로...' },
  { id: 4, time: '00:00:22', text: '그 부분은 마케팅 팀과 협의가 필요할 것 같습니다.' },
];

export default function RecordingScreen() {
  const router = useRouter();
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [scripts, setScripts] = useState(MOCK_SCRIPTS.slice(0, 2));
  const [stopModal, setStopModal] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused]);

  useEffect(() => {
    if (seconds === 15 && scripts.length < 3) {
      setScripts(MOCK_SCRIPTS.slice(0, 3));
    }
    if (seconds === 22 && scripts.length < 4) {
      setScripts(MOCK_SCRIPTS.slice(0, 4));
    }
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [seconds]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, '0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
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
          <Text style={styles.timer}>{formatTime(seconds)}</Text>
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
          <WaveBar key={i} active={!isPaused && i < 18} />
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
          {scripts.map((item) => (
            <View key={item.id} style={styles.scriptItem}>
              <Text style={styles.scriptTime}>{item.time}</Text>
              <Text style={styles.scriptText}>{item.text}</Text>
            </View>
          ))}
          {!isPaused && (
            <View style={styles.scriptItem}>
              <Text style={styles.scriptTime}>{formatTime(seconds)}</Text>
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
            onPress={() => setIsPaused(!isPaused)}
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
          <TouchableOpacity style={styles.stopBtn} onPress={() => setStopModal(true)}>
            <View style={styles.stopIcon} />
          </TouchableOpacity>
          <Text style={styles.saveLabel}>저장</Text>
        </View>
      </View>

      <StopRecordingModal
        visible={stopModal}
        onCancel={() => setStopModal(false)}
        onConfirm={() => {
          setStopModal(false);
          router.back();
        }}
      />
    </SafeAreaView>
  );
}
