import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MINT = '#22C9A0';
const MINT_LIGHT = '#E6F7F3';

const MOCK_SCRIPTS = [
  { id: 1, time: '00:00:03', text: '안녕하세요, 오늘 회의 시작하겠습니다.' },
  { id: 2, time: '00:00:08', text: '지난번 안건에 대해서 먼저 이야기해볼까요?' },
  { id: 3, time: '00:00:15', text: '네, 말씀하신 대로 3분기 목표치를 조정하는 방향으로...' },
  { id: 4, time: '00:00:22', text: '그 부분은 마케팅 팀과 협의가 필요할 것 같습니다.' },
];

export default function RecordingScreen() {
  const [isRecording, setIsRecording] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [scripts, setScripts] = useState(MOCK_SCRIPTS.slice(0, 2));
  const [stopModal, setStopModal] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!isRecording || isPaused) return;
    const timer = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isRecording, isPaused]);

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
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity>
          <Text style={styles.cancelBtn}>취소</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.langBtn}>
          <Ionicons name="globe-outline" size={16} color="#555" />
          <Text style={styles.langText}>한국어로 받아쓰기 중</Text>
          <Ionicons name="chevron-forward" size={14} color="#aaa" />
        </TouchableOpacity>
      </View>

      {/* 타이머 + 제목 */}
      <View style={styles.timerSection}>
        <View style={styles.timerRow}>
          <View style={[styles.recDot, isPaused && styles.recDotPaused]} />
          <Text style={styles.timer}>{formatTime(seconds)}</Text>
        </View>
        <Text style={styles.recordTitle}>
          {new Date().toLocaleDateString('ko-KR', {
            year: 'numeric', month: 'long', day: 'numeric',
          })} 녹음
        </Text>
      </View>

      {/* 파형 */}
      <View style={styles.waveContainer}>
        {Array.from({ length: 32 }).map((_, i) => (
          <WaveBar key={i} active={!isPaused && i < 18} />
        ))}
      </View>

      {/* 하이라이트 추가 */}
      <TouchableOpacity style={styles.highlightBtn}>
        <Ionicons name="bookmark-outline" size={16} color={MINT} />
        <Text style={styles.highlightText}>하이라이트 추가</Text>
      </TouchableOpacity>

      {/* 실시간 스크립트 */}
      <View style={styles.scriptContainer}>
        <View style={styles.scriptHeader}>
          <Ionicons name="document-text-outline" size={14} color={MINT} />
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

      {/* 안내 문구 */}
      <Text style={styles.notice}>
        녹음 중 다른 앱 사용을 잠시 멈춰주세요.{'\n'}받아쓰기가 실패할 수 있어요.
      </Text>

      {/* 하단 컨트롤 */}
      <View style={styles.controls}>
        <View style={styles.controlSide}>
          <TouchableOpacity>
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
              color={isPaused ? '#fff' : '#333'}
            />
          </TouchableOpacity>
          <Text style={styles.pauseLabel}>{isPaused ? '녹음 이어하기' : '일시정지'}</Text>
        </View>
        <View style={styles.controlSide}>
          <TouchableOpacity
            style={styles.stopBtn}
            onPress={() => setStopModal(true)}
          >
            <View style={styles.stopIcon} />
          </TouchableOpacity>
          <Text style={styles.saveLabel}>저장</Text>
        </View>
      </View>

      {/* 종료 확인 모달 */}
      <Modal visible={stopModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>녹음을 종료할까요?</Text>
            <Text style={styles.modalDesc}>녹음이 종료되면 받아쓰기가 시작됩니다</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setStopModal(false)}
              >
                <Text style={styles.modalCancelText}>아니오</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={() => setStopModal(false)}
              >
                <Text style={styles.modalConfirmText}>녹음 종료</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  cancelBtn: { fontSize: 15, color: '#555' },
  langBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f5f5f5', paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 20,
  },
  langText: { fontSize: 13, color: '#555' },
  timerSection: { alignItems: 'center', paddingTop: 32, paddingBottom: 12 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  recDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: MINT,
  },
  recDotPaused: { backgroundColor: '#ccc' },
  timer: { fontSize: 28, fontWeight: '300', color: '#222', letterSpacing: 2 },
  recordTitle: { fontSize: 18, fontWeight: '600', color: '#222' },
  waveContainer: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 3,
    paddingHorizontal: 20, marginVertical: 20, height: 40,
  },
  waveBar: {
    width: 3, height: 12, borderRadius: 2, backgroundColor: '#e0e0e0',
  },
  waveBarActive: { backgroundColor: MINT, height: 28 },
  highlightBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'center', marginBottom: 16,
  },
  highlightText: { fontSize: 14, color: MINT, fontWeight: '500' },
  scriptContainer: {
    flex: 1, marginHorizontal: 20,
    backgroundColor: '#F7FAF9',
    borderRadius: 16, borderWidth: 0.5,
    borderColor: '#e0f0eb', padding: 14,
    marginBottom: 12,
  },
  scriptHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 5, marginBottom: 10,
  },
  scriptHeaderText: { fontSize: 12, color: MINT, fontWeight: '600' },
  scriptScroll: { flex: 1 },
  scriptItem: { marginBottom: 10 },
  scriptTime: { fontSize: 11, color: '#aaa', marginBottom: 2 },
  scriptText: { fontSize: 14, color: '#333', lineHeight: 20 },
  scriptTyping: { color: '#bbb', fontStyle: 'italic' },
  notice: {
    fontSize: 12, color: '#bbb',
    textAlign: 'center', lineHeight: 18,
    marginBottom: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    marginBottom: 20,
  },
  controlSide: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCol: {
    alignItems: 'center',
    gap: 6,
  },
  cancelText: {
    fontSize: 14, color: '#888',
  },
  saveLabel: {
    fontSize: 11, color: '#aaa',
  },
  mainBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center', alignItems: 'center',
  },
  mainBtnPaused: { backgroundColor: MINT },
  stopBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#222',
    justifyContent: 'center', alignItems: 'center',
  },
  stopIcon: {
    width: 16, height: 16, borderRadius: 2, backgroundColor: '#fff',
  },
  pauseLabel: {
    fontSize: 11, color: '#aaa',
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalBox: {
    width: '80%', backgroundColor: '#fff',
    borderRadius: 20, padding: 28, alignItems: 'center',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#222', marginBottom: 8 },
  modalDesc: { fontSize: 14, color: '#888', marginBottom: 24, textAlign: 'center' },
  modalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#f0f0f0', alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, color: '#555', fontWeight: '500' },
  modalConfirmBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: MINT, alignItems: 'center',
  },
  modalConfirmText: { fontSize: 15, color: '#fff', fontWeight: '600' },
});
