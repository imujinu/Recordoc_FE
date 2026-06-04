import { useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { updateQuizNodeStatuses, type QuizNodeStatusUpdate } from '@/api/quiz';
import { AppBottomBar } from '@/components/AppBottomBar';
import { Colors } from '@/styles/theme';

type ScreenState = 'home' | 'quiz' | 'result';
type AnswerState = 'correct' | 'wrong' | 'skipped';

type ScopeItem = {
  id: string;
  title: string;
  type: 'folder' | 'audio' | 'pdf';
  meta: string;
  nodes: number;
};

type QuizQuestion = {
  nodeId: string;
  node: string;
  source: string;
  sourceType: 'audio' | 'pdf' | 'ppt';
  question: string;
  options: string[];
  answer: number;
};

const FOLDER_COLORS = [
  { bg: Colors.mintLight, color: Colors.mint },
  { bg: '#EEEDFE', color: '#7F77DD' },
  { bg: '#FAECE7', color: '#D85A30' },
];

const SCOPES: ScopeItem[] = [
  { id: 'folder-march', title: '3월 회의', type: 'folder', meta: '노드 4개', nodes: 4 },
  { id: 'folder-algo', title: '알고리즘 강의', type: 'folder', meta: '노드 6개', nodes: 6 },
  { id: 'folder-marketing', title: '마케팅 기획', type: 'folder', meta: '노드 2개', nodes: 2 },
  { id: 'audio-meeting', title: '마케팅 회의록', type: 'audio', meta: '녹음 · 42분', nodes: 3 },
  { id: 'pdf-algo', title: '알고리즘 요약본', type: 'pdf', meta: 'PDF · 41MB', nodes: 5 },
  { id: 'more', title: '더 보기', type: 'folder', meta: '범위 추가', nodes: 0 },
];

const QUESTIONS: QuizQuestion[] = [
  {
    nodeId: 'mitochondria',
    node: '미토콘드리아',
    source: '알고리즘 강의',
    sourceType: 'audio',
    question: '미토콘드리아의 주요 기능은 무엇인가요?',
    options: ['ATP 생성', '단백질 합성', 'DNA 복제', '세포벽 형성'],
    answer: 0,
  },
  {
    nodeId: 'atp',
    node: 'ATP',
    source: '알고리즘 강의',
    sourceType: 'audio',
    question: 'ATP는 세포에서 주로 어떤 역할을 하나요?',
    options: ['에너지 전달', '유전 정보 저장', '세포막 구성', '산소 운반'],
    answer: 0,
  },
  {
    nodeId: 'respiration',
    node: '세포 호흡',
    source: '알고리즘 요약본.pdf',
    sourceType: 'pdf',
    question: '세포 호흡이 주로 일어나는 장소는 어디인가요?',
    options: ['핵', '리보솜', '미토콘드리아', '세포막'],
    answer: 2,
  },
  {
    nodeId: 'nadh',
    node: 'NADH',
    source: '강의 슬라이드.ppt',
    sourceType: 'ppt',
    question: 'NADH의 주요 역할은 무엇인가요?',
    options: ['에너지 저장', '전자 운반', '단백질 합성', 'DNA 복제'],
    answer: 1,
  },
  {
    nodeId: 'glucose',
    node: '포도당',
    source: '기획 요약본.pdf',
    sourceType: 'pdf',
    question: '포도당의 화학식은 무엇인가요?',
    options: ['C6H12O6', 'C12H22O11', 'C6H6O6', 'C6H12O3'],
    answer: 0,
  },
];

export default function QuizScreen() {
  const [screen, setScreen] = useState<ScreenState>('home');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['folder-march', 'folder-algo']);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [submitted, setSubmitted] = useState(false);

  const currentQuestion = QUESTIONS[currentIndex];
  const correctCount = Object.values(answers).filter((answer) => answer === 'correct').length;
  const wrongCount = Object.values(answers).filter((answer) => answer === 'wrong').length;
  const skippedCount = Object.values(answers).filter((answer) => answer === 'skipped').length;
  const accuracy = QUESTIONS.length ? Math.round((correctCount / QUESTIONS.length) * 100) : 0;
  const progress = useMemo(() => ((currentIndex + (selectedAnswer !== null ? 1 : 0)) / QUESTIONS.length) * 100, [currentIndex, selectedAnswer]);

  const toggleScope = (scope: ScopeItem) => {
    if (scope.id === 'more') return;
    setSelectedScopes((prev) => (prev.includes(scope.id) ? prev.filter((id) => id !== scope.id) : [...prev, scope.id]));
  };

  const startQuiz = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setAnswers({});
    setSubmitted(false);
    setScreen('quiz');
  };

  const selectAnswer = (index: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.nodeId]: index === currentQuestion.answer ? 'correct' : 'wrong',
    }));
  };

  const skipQuestion = () => {
    const nextAnswers: Record<string, AnswerState> = { ...answers, [currentQuestion.nodeId]: 'skipped' };
    setAnswers(nextAnswers);
    goNext(nextAnswers);
  };

  const goNext = (finalAnswers = answers) => {
    if (currentIndex >= QUESTIONS.length - 1) {
      setScreen('result');
      submitResult(finalAnswers);
      return;
    }
    setCurrentIndex((prev) => prev + 1);
    setSelectedAnswer(null);
  };

  const submitResult = async (finalAnswers = answers) => {
    if (submitted) return;
    setSubmitted(true);
    const updates: QuizNodeStatusUpdate[] = QUESTIONS.map((question) => ({
      node_id: question.nodeId,
      quiz_status: finalAnswers[question.nodeId] === 'correct' ? 'correct' : finalAnswers[question.nodeId] === 'wrong' ? 'wrong' : 'skipped',
    }));

    try {
      await updateQuizNodeStatuses(updates);
    } catch {
      Alert.alert('퀴즈 결과 저장', '결과는 화면에 반영됐지만 서버 반영은 실패했습니다.');
    }
  };

  const retryWrong = () => {
    const firstWrong = QUESTIONS.findIndex((question) => answers[question.nodeId] === 'wrong');
    setCurrentIndex(firstWrong >= 0 ? firstWrong : 0);
    setSelectedAnswer(null);
    setScreen('quiz');
  };

  const goHome = () => {
    setScreen('home');
    setCurrentIndex(0);
    setSelectedAnswer(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      {screen === 'home' && (
        <>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>퀴즈</Text>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="ellipsis-horizontal" size={18} color={Colors.mint} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.homeContent}>
            <View style={styles.scopeSection}>
              <View style={styles.sectionLabelRow}>
                <Ionicons name="library-outline" size={14} color={Colors.mint} />
                <Text style={styles.sectionLabel}>출제 범위 선택</Text>
              </View>
              <View style={styles.scopeGrid}>
                {SCOPES.map((scope, index) => {
                  const selected = selectedScopes.includes(scope.id);
                  const color = FOLDER_COLORS[index % 3];
                  const iconName = scope.type === 'audio' ? 'mic-outline' : scope.type === 'pdf' ? 'document-text-outline' : scope.id === 'more' ? 'add' : 'folder';

                  return (
                    <TouchableOpacity
                      key={scope.id}
                      style={[styles.scopeItem, selected && styles.scopeItemSelected, scope.id === 'more' && styles.moreScope]}
                      onPress={() => toggleScope(scope)}
                      activeOpacity={0.82}
                    >
                      {selected && (
                        <View style={styles.checkBadge}>
                          <Ionicons name="checkmark" size={10} color={Colors.white} />
                        </View>
                      )}
                      <View style={[styles.scopeIcon, { backgroundColor: color.bg }]}>
                        <Ionicons name={iconName} size={scope.id === 'more' ? 22 : 24} color={color.color} />
                      </View>
                      <Text style={[styles.scopeName, scope.id === 'more' && styles.moreScopeText]} numberOfLines={2}>
                        {scope.title}
                      </Text>
                      <Text style={scope.type === 'folder' ? styles.scopeCount : styles.scopeMeta}>{scope.meta}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.bottomSection}>
              <View style={styles.statRow}>
                <StatCard value="78%" label="전체 정답률" sub="지난주 +5%" color={Colors.mint} />
                <StatCard value="12/20" label="완료 노드" sub="전체 개념" color={Colors.textDark} />
                <StatCard value="5" label="복습 필요" sub="오늘 예정" color="#E24B4A" />
              </View>
              <TouchableOpacity style={styles.startButton} onPress={startQuiz}>
                <Ionicons name="play" size={16} color={Colors.white} />
                <Text style={styles.startButtonText}>퀴즈 시작</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </>
      )}

      {screen === 'quiz' && currentQuestion && (
        <>
          <View style={styles.quizHeader}>
            <TouchableOpacity onPress={goHome}>
              <Ionicons name="close" size={21} color={Colors.textLight} />
            </TouchableOpacity>
            <Text style={styles.quizHeaderTitle}>
              {currentIndex + 1} / {QUESTIONS.length}
            </Text>
            <View style={{ width: 21 }} />
          </View>

          <View style={styles.progressWrap}>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressLabel}>
              {currentIndex + 1} / {QUESTIONS.length}
            </Text>
          </View>

          <ScrollView contentContainerStyle={styles.quizContent}>
            <View style={styles.sourceTag}>
              <Ionicons name={currentQuestion.sourceType === 'audio' ? 'mic-outline' : 'document-text-outline'} size={12} color="#0F6E56" />
              <Text style={styles.sourceTagText}>{currentQuestion.source}</Text>
            </View>

            <View style={styles.questionCard}>
              <View style={styles.nodeLabel}>
                <Ionicons name="radio-button-on-outline" size={13} color={Colors.mint} />
                <Text style={styles.nodeLabelText}>{currentQuestion.node}</Text>
              </View>
              <Text style={styles.questionText}>{currentQuestion.question}</Text>
            </View>

            <View style={styles.options}>
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrect = currentQuestion.answer === index;
                const showCorrect = selectedAnswer !== null && isCorrect;
                const showWrong = selectedAnswer !== null && isSelected && !isCorrect;

                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.option, showCorrect && styles.optionCorrect, showWrong && styles.optionWrong]}
                    onPress={() => selectAnswer(index)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.optionLabel}>
                      <Text style={styles.optionLabelText}>{String.fromCharCode(65 + index)}</Text>
                    </View>
                    <Text style={[styles.optionText, showCorrect && styles.optionTextCorrect, showWrong && styles.optionTextWrong]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedAnswer !== null && (
              <View style={[styles.feedback, selectedAnswer === currentQuestion.answer ? styles.feedbackCorrect : styles.feedbackWrong]}>
                <Ionicons
                  name={selectedAnswer === currentQuestion.answer ? 'checkmark-circle-outline' : 'close-circle-outline'}
                  size={16}
                  color={selectedAnswer === currentQuestion.answer ? '#0F6E56' : '#A32D2D'}
                />
                <Text style={[styles.feedbackText, selectedAnswer === currentQuestion.answer ? styles.feedbackTextCorrect : styles.feedbackTextWrong]}>
                  {selectedAnswer === currentQuestion.answer ? '정답이에요.' : `오답입니다. 정답은 "${currentQuestion.options[currentQuestion.answer]}"입니다.`}
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.navRow}>
            <TouchableOpacity style={styles.navButton} onPress={skipQuestion}>
              <Text style={styles.navButtonText}>건너뛰기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.navButton, styles.nextButton, selectedAnswer === null && styles.nextButtonDisabled]} disabled={selectedAnswer === null} onPress={() => goNext()}>
              <Text style={styles.nextButtonText}>{currentIndex === QUESTIONS.length - 1 ? '결과 보기' : '다음'}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {screen === 'result' && (
        <ScrollView contentContainerStyle={styles.resultContent}>
          <Text style={styles.resultTitle}>퀴즈 완료</Text>
          <View style={styles.resultHero}>
            <Text style={styles.resultScore}>
              {correctCount}/{QUESTIONS.length}
            </Text>
            <Text style={styles.resultSub}>정답률 {accuracy}%</Text>
          </View>
          <View style={styles.resultStats}>
            <ResultStat value={String(correctCount)} label="맞춤" color={Colors.mint} />
            <ResultStat value={String(wrongCount)} label="틀림" color="#E24B4A" />
            <ResultStat value={String(skippedCount)} label="건너뜀" color="#B4B2A9" />
          </View>
          <TouchableOpacity style={styles.graphNotice} onPress={() => router.push('/graph')}>
            <View style={styles.graphNoticeIcon}>
              <Ionicons name="git-network-outline" size={20} color={Colors.mint} />
            </View>
            <View style={styles.graphNoticeText}>
              <Text style={styles.graphNoticeTitle}>그래프에 반영됐어요</Text>
              <Text style={styles.graphNoticeSub}>
                맞춤 {correctCount}개, 틀림 {wrongCount}개 노드 상태가 업데이트됩니다.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.mint} />
          </TouchableOpacity>
          <View style={styles.resultButtons}>
            <TouchableOpacity style={[styles.resultButton, styles.resultPrimary]} onPress={retryWrong}>
              <Ionicons name="refresh" size={16} color={Colors.white} />
              <Text style={styles.resultPrimaryText}>틀린 문제 다시 풀기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.resultButton, styles.resultSecondary]} onPress={goHome}>
              <Ionicons name="home-outline" size={16} color="#555" />
              <Text style={styles.resultSecondaryText}>홈으로</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      <AppBottomBar active="more" />
    </SafeAreaView>
  );
}

function StatCard({ value, label, sub, color }: { value: string; label: string; sub: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

function ResultStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.resultStat}>
      <Text style={[styles.resultStatValue, { color }]}>{value}</Text>
      <Text style={styles.resultStatLabel}>{label}</Text>
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
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textDark,
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
  homeContent: {
    flexGrow: 1,
  },
  scopeSection: {
    backgroundColor: Colors.white,
    padding: 14,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#888',
  },
  scopeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scopeItem: {
    width: '31.8%',
    minHeight: 96,
    backgroundColor: Colors.bg,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
    paddingHorizontal: 6,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 5,
  },
  scopeItemSelected: {
    borderColor: Colors.mint,
    backgroundColor: Colors.mintLight,
  },
  moreScope: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#c8ede3',
    justifyContent: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: Colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  scopeIcon: {
    width: 46,
    height: 40,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeName: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.textDark,
    textAlign: 'center',
    lineHeight: 14,
  },
  moreScopeText: {
    color: Colors.mint,
  },
  scopeMeta: {
    fontSize: 9,
    color: Colors.textLight,
    textAlign: 'center',
  },
  scopeCount: {
    fontSize: 9,
    color: Colors.mint,
    fontWeight: '500',
    textAlign: 'center',
  },
  bottomSection: {
    padding: 14,
    gap: 10,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textLight,
    textAlign: 'center',
  },
  statSub: {
    fontSize: 9,
    color: '#bbb',
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: Colors.mint,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.white,
  },
  quizHeader: {
    backgroundColor: Colors.white,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quizHeaderTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textDark,
  },
  progressWrap: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  progressBg: {
    height: 4,
    backgroundColor: '#eee',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.mint,
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 11,
    color: Colors.textLight,
    textAlign: 'right',
    marginTop: 4,
  },
  quizContent: {
    paddingHorizontal: 14,
    gap: 10,
    paddingBottom: 10,
  },
  sourceTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.mintLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sourceTagText: {
    fontSize: 11,
    color: '#0F6E56',
    fontWeight: '500',
  },
  questionCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  nodeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  nodeLabelText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.mint,
  },
  questionText: {
    fontSize: 14,
    color: Colors.textDark,
    lineHeight: 22,
    fontWeight: '500',
  },
  options: {
    gap: 7,
  },
  option: {
    backgroundColor: Colors.white,
    borderRadius: 11,
    borderWidth: 0.5,
    borderColor: '#ddd',
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionCorrect: {
    borderColor: Colors.mint,
    backgroundColor: Colors.mintLight,
  },
  optionWrong: {
    borderColor: '#E24B4A',
    backgroundColor: '#FCEBEB',
  },
  optionLabel: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: Colors.bg,
    borderWidth: 0.5,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabelText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#555',
  },
  optionText: {
    flex: 1,
    fontSize: 13,
    color: '#333',
  },
  optionTextCorrect: {
    color: '#0F6E56',
    fontWeight: '500',
  },
  optionTextWrong: {
    color: '#A32D2D',
    fontWeight: '500',
  },
  feedback: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedbackCorrect: {
    backgroundColor: Colors.mintLight,
  },
  feedbackWrong: {
    backgroundColor: '#FCEBEB',
  },
  feedbackText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  feedbackTextCorrect: {
    color: '#0F6E56',
  },
  feedbackTextWrong: {
    color: '#A32D2D',
  },
  navRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 11,
    borderWidth: 0.5,
    borderColor: '#ddd',
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: Colors.mint,
    borderColor: Colors.mint,
  },
  nextButtonDisabled: {
    opacity: 0.45,
  },
  nextButtonText: {
    fontSize: 13,
    color: Colors.white,
    fontWeight: '500',
  },
  resultContent: {
    padding: 14,
    gap: 12,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textDark,
  },
  resultHero: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
    paddingHorizontal: 14,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  resultScore: {
    fontSize: 48,
    fontWeight: '600',
    color: Colors.mint,
  },
  resultSub: {
    fontSize: 13,
    color: '#888',
  },
  resultStats: {
    flexDirection: 'row',
    gap: 8,
  },
  resultStat: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 3,
  },
  resultStatValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultStatLabel: {
    fontSize: 10,
    color: Colors.textLight,
  },
  graphNotice: {
    backgroundColor: Colors.mintLight,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.mint,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  graphNoticeIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  graphNoticeText: {
    flex: 1,
  },
  graphNoticeTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0F6E56',
  },
  graphNoticeSub: {
    fontSize: 11,
    color: '#1D9E75',
    marginTop: 2,
  },
  resultButtons: {
    gap: 7,
  },
  resultButton: {
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  resultPrimary: {
    backgroundColor: Colors.mint,
  },
  resultSecondary: {
    backgroundColor: Colors.white,
    borderWidth: 0.5,
    borderColor: '#ddd',
  },
  resultPrimaryText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.white,
  },
  resultSecondaryText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#555',
  },
});
