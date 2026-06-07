import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Colors } from '@/styles/theme';

type SourceType = 'audio' | 'pdf';
type QuizStatus = 'correct' | 'wrong' | 'untested';
type RelationColor = 'mint' | 'purple' | 'coral';

type GraphNode = {
  id: string;
  label: string;
  type: string;
  source: string;
  source_type: SourceType;
  timestamps: string[];
  context: string;
  relations: { target: string; label: string; color: RelationColor }[];
  quiz_status: QuizStatus;
  quiz: {
    question: string;
    options: string[];
    answer: number;
  };
};

const STATUS_COLORS = {
  correct: '#22C9A0',
  wrong: '#E24B4A',
  untested: '#B4B2A9',
  selected: '#EF9F27',
};

const INITIAL_GRAPH_NODES: GraphNode[] = [
  {
    id: 'mitochondria',
    label: '미토콘드리아',
    type: '개념',
    source: '알고리즘 강의',
    source_type: 'audio',
    timestamps: ['00:12:34', '00:28:10', '00:41:55'],
    context: '"미토콘드리아는 세포의 에너지 공장으로, ATP를 생산하는 핵심 소기관입니다."',
    relations: [
      { target: 'ATP', label: '생성', color: 'mint' },
      { target: '세포 호흡', label: '연관', color: 'purple' },
      { target: '포도당', label: '분해', color: 'coral' },
    ],
    quiz_status: 'correct',
    quiz: {
      question: '미토콘드리아의 주요 기능은?',
      options: ['ATP 생성', '단백질 합성', 'DNA 복제', '세포벽 형성'],
      answer: 0,
    },
  },
  {
    id: 'atp',
    label: 'ATP',
    type: '개념',
    source: '알고리즘 강의',
    source_type: 'audio',
    timestamps: ['00:13:20'],
    context: '"ATP는 아데노신 삼인산으로, 세포의 에너지 화폐 역할을 합니다."',
    relations: [
      { target: '미토콘드리아', label: '생성됨', color: 'mint' },
      { target: '에너지', label: '공급', color: 'mint' },
    ],
    quiz_status: 'untested',
    quiz: {
      question: 'ATP의 풀네임은?',
      options: ['아데노신 삼인산', '아데닌 삼인산', '아데노신 이인산', '아데닌 이인산'],
      answer: 0,
    },
  },
  {
    id: 'respiration',
    label: '세포 호흡',
    type: '개념',
    source: '알고리즘 강의',
    source_type: 'audio',
    timestamps: ['00:25:44', '00:38:02'],
    context: '"세포 호흡은 포도당을 분해하여 ATP를 생산하는 과정입니다."',
    relations: [
      { target: '미토콘드리아', label: '일어남', color: 'mint' },
      { target: '포도당', label: '사용', color: 'coral' },
    ],
    quiz_status: 'wrong',
    quiz: {
      question: '세포 호흡이 일어나는 장소는?',
      options: ['핵', '리보솜', '미토콘드리아', '세포막'],
      answer: 2,
    },
  },
  {
    id: 'oxidation',
    label: '산화',
    type: '개념',
    source: '알고리즘 강의',
    source_type: 'audio',
    timestamps: ['00:29:11'],
    context: '"산화적 인산화 과정에서 산화가 핵심적인 역할을 합니다."',
    relations: [{ target: '세포 호흡', label: '포함', color: 'purple' }],
    quiz_status: 'untested',
    quiz: {
      question: '산화란 무엇인가?',
      options: ['전자를 잃는 과정', '전자를 얻는 과정', '수소를 얻는 과정', '산소를 잃는 과정'],
      answer: 0,
    },
  },
  {
    id: 'energy',
    label: '에너지',
    type: '개념',
    source: '3월 회의',
    source_type: 'audio',
    timestamps: ['00:05:30'],
    context: '"마케팅 에너지를 SNS 채널에 집중하기로 결정했습니다."',
    relations: [{ target: 'ATP', label: '제공받음', color: 'mint' }],
    quiz_status: 'correct',
    quiz: {
      question: '에너지 대사의 핵심 분자는?',
      options: ['DNA', 'ATP', 'RNA', '단백질'],
      answer: 1,
    },
  },
  {
    id: 'dna',
    label: 'DNA',
    type: '개념',
    source: '3월 회의',
    source_type: 'audio',
    timestamps: ['00:08:15'],
    context: '"DNA 복제 과정에서 에너지가 필요합니다."',
    relations: [{ target: '미토콘드리아', label: '저장됨', color: 'mint' }],
    quiz_status: 'untested',
    quiz: {
      question: 'DNA의 구성 단위는?',
      options: ['아미노산', '뉴클레오타이드', '포도당', '지방산'],
      answer: 1,
    },
  },
  {
    id: 'glucose',
    label: '포도당',
    type: '개념',
    source: '마케팅',
    source_type: 'pdf',
    timestamps: ['00:31:00'],
    context: '"포도당은 세포 호흡의 주요 기질로 사용됩니다."',
    relations: [
      { target: '세포 호흡', label: '기질', color: 'coral' },
      { target: '미토콘드리아', label: '분해됨', color: 'mint' },
    ],
    quiz_status: 'wrong',
    quiz: {
      question: '포도당의 화학식은?',
      options: ['C6H12O6', 'C12H22O11', 'C6H6O6', 'C6H12O3'],
      answer: 0,
    },
  },
  {
    id: 'enzyme',
    label: '효소',
    type: '개념',
    source: '마케팅',
    source_type: 'pdf',
    timestamps: ['00:33:45'],
    context: '"효소는 생화학 반응의 촉매 역할을 합니다."',
    relations: [{ target: '세포 호흡', label: '촉매', color: 'purple' }],
    quiz_status: 'untested',
    quiz: {
      question: '효소의 주성분은?',
      options: ['탄수화물', '지질', '단백질', '핵산'],
      answer: 2,
    },
  },
  {
    id: 'nadh',
    label: 'NADH',
    type: '개념',
    source: '알고리즘 강의',
    source_type: 'audio',
    timestamps: ['00:36:22'],
    context: '"NADH는 전자 전달계에서 중요한 역할을 합니다."',
    relations: [
      { target: '세포 호흡', label: '생성됨', color: 'purple' },
      { target: '산화', label: '관여', color: 'coral' },
    ],
    quiz_status: 'correct',
    quiz: {
      question: 'NADH의 역할은?',
      options: ['에너지 저장', '전자 운반', '단백질 합성', 'DNA 복제'],
      answer: 1,
    },
  },
];

const GRAPH_EDGES = [
  ['mitochondria', 'atp'],
  ['mitochondria', 'respiration'],
  ['mitochondria', 'oxidation'],
  ['mitochondria', 'energy'],
  ['mitochondria', 'dna'],
  ['atp', 'energy'],
  ['respiration', 'glucose'],
  ['respiration', 'enzyme'],
  ['oxidation', 'nadh'],
  ['respiration', 'nadh'],
  ['glucose', 'mitochondria'],
];

const FILTERS = ['전체', '알고리즘 강의', '3월 회의', '마케팅'];

export default function GraphScreen() {
  const webViewRef = useRef<WebView>(null);
  const [nodes, setNodes] = useState(INITIAL_GRAPH_NODES);
  const [selectedId, setSelectedId] = useState(INITIAL_GRAPH_NODES[0].id);
  const [searchText, setSearchText] = useState('');
  const [filter, setFilter] = useState('전체');
  const [quizNode, setQuizNode] = useState<GraphNode | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const selectedNode = nodes.find((node) => node.id === selectedId) ?? nodes[0] ?? null;
  const html = useMemo(() => buildGraphHtml(nodes, GRAPH_EDGES), [nodes]);
  const visibleNodeCount = nodes.filter((node) => {
    const matchesFilter = filter === '전체' || node.source === filter;
    const matchesSearch = !searchText || node.label.toLowerCase().includes(searchText.toLowerCase());
    return matchesFilter && matchesSearch;
  }).length;

  const inject = (script: string) => {
    webViewRef.current?.injectJavaScript(`${script}; true;`);
  };

  const updateSearch = (text: string) => {
    setSearchText(text);
    inject(`window.applySearch(${JSON.stringify(text)})`);
  };

  const updateFilter = (nextFilter: string) => {
    setFilter(nextFilter);
    inject(`window.applyFilter(${JSON.stringify(nextFilter)})`);
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as { type: string; id?: string };
      if (payload.type === 'node-selected' && payload.id) {
        setSelectedId(payload.id);
      }
    } catch {
      // Ignore malformed WebView messages.
    }
  };

  const openQuiz = (node: GraphNode) => {
    setSelectedAnswer(null);
    setQuizNode(node);
  };

  const answerQuiz = (optionIndex: number) => {
    if (!quizNode || selectedAnswer !== null) return;
    const isCorrect = optionIndex === quizNode.quiz.answer;
    setSelectedAnswer(optionIndex);
    setNodes((prev) =>
      prev.map((node) => (node.id === quizNode.id ? { ...node, quiz_status: isCorrect ? 'correct' : 'wrong' } : node)),
    );
    setQuizNode((prev) => (prev ? { ...prev, quiz_status: isCorrect ? 'correct' : 'wrong' } : prev));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>지식 그래프</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="share-outline" size={17} color={Colors.mint} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="ellipsis-horizontal" size={18} color={Colors.mint} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={15} color="#bbb" />
          <TextInput
            style={styles.searchInput}
            placeholder="개념 검색..."
            placeholderTextColor="#bbb"
            value={searchText}
            onChangeText={updateSearch}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {FILTERS.map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.filterChip, filter === item && styles.filterChipActive]}
              onPress={() => updateFilter(item)}
            >
              <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.legend}>
          <LegendDot color={STATUS_COLORS.correct} label="맞춤" />
          <LegendDot color={STATUS_COLORS.wrong} label="틀림" />
          <LegendDot color={STATUS_COLORS.untested} label="미응시" />
          <LegendDot color={STATUS_COLORS.selected} label="선택됨" selected />
        </View>

        <View style={styles.graphWrap}>
          <WebView
            ref={webViewRef}
            style={styles.webView}
            originWhitelist={['*']}
            source={{ html }}
            onMessage={handleMessage}
            javaScriptEnabled
            scrollEnabled={false}
          />
          <View style={styles.graphToolbar}>
            <TouchableOpacity style={styles.graphButton} onPress={() => inject('window.zoomGraph(1.2)')}>
              <Ionicons name="add" size={16} color="#555" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.graphButton} onPress={() => inject('window.zoomGraph(0.8)')}>
              <Ionicons name="remove" size={16} color="#555" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.graphButton} onPress={() => inject('window.resetGraph()')}>
              <Ionicons name="scan-outline" size={16} color="#555" />
            </TouchableOpacity>
          </View>
          <View style={styles.nodeCount}>
            <Text style={styles.nodeCountText}>
              노드 {visibleNodeCount} · 엣지 {GRAPH_EDGES.length}
            </Text>
          </View>
        </View>

        {selectedNode && <NodeDetailPanel node={selectedNode} onOpenQuiz={openQuiz} />}
      </ScrollView>
      <QuizModal
        node={quizNode}
        selectedAnswer={selectedAnswer}
        onAnswer={answerQuiz}
        onClose={() => setQuizNode(null)}
      />
    </SafeAreaView>
  );
}

function LegendDot({ color, label, selected = false }: { color: string; label: string; selected?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, selected && styles.legendDotSelected, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function NodeDetailPanel({ node, onOpenQuiz }: { node: GraphNode; onOpenQuiz: (node: GraphNode) => void }) {
  const statusMeta = {
    correct: { label: '퀴즈 통과', icon: 'checkmark-circle-outline' as const, style: styles.quizCorrect },
    wrong: { label: '오답 - 복습 필요', icon: 'close-circle-outline' as const, style: styles.quizWrong },
    untested: { label: '아직 미응시', icon: 'ellipse-outline' as const, style: styles.quizUntested },
  }[node.quiz_status];

  const openSource = () => {
    router.push(node.source_type === 'audio' ? '/detail' : '/pdf');
  };

  return (
    <View style={styles.detailPanel}>
      <View style={styles.detailHeader}>
        <View style={styles.detailTitleRow}>
          <View style={[styles.detailDot, { backgroundColor: STATUS_COLORS.selected }]} />
          <Text style={styles.detailTitle} numberOfLines={1}>
            {node.label}
          </Text>
          <View style={styles.detailBadge}>
            <Text style={styles.detailBadgeText}>{node.type}</Text>
          </View>
        </View>
        <View style={styles.detailActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('수정', '노드 수정 API 연결 지점입니다.')}>
            <Ionicons name="create-outline" size={13} color="#888" />
            <Text style={styles.actionText}>수정</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => Alert.alert('삭제', '노드 삭제 API 연결 지점입니다.')}
          >
            <Ionicons name="trash-outline" size={13} color="#FF5A5A" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.detailBody}>
        <DetailLabel icon="document-text-outline" label="출처" />
        <TouchableOpacity style={styles.sourceChip} onPress={openSource}>
          <Ionicons name={node.source_type === 'audio' ? 'mic-outline' : 'document-text-outline'} size={12} color="#0F6E56" />
          <Text style={styles.sourceChipText}>{node.source}</Text>
        </TouchableOpacity>

        <View style={styles.divider} />
        <DetailLabel icon="time-outline" label="타임스탬프" />
        <View style={styles.locationRow}>
          {node.timestamps.map((timestamp) => (
            <TouchableOpacity key={timestamp} style={styles.locationChip} onPress={openSource}>
              <Ionicons name="play-outline" size={11} color={Colors.mint} />
              <Text style={styles.locationText}>{timestamp}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.divider} />
        <DetailLabel icon="chatbox-outline" label="맥락" />
        <View style={styles.contextBox}>
          <Text style={styles.contextText}>{node.context}</Text>
        </View>

        <View style={styles.divider} />
        <DetailLabel icon="swap-horizontal-outline" label="연결 관계" />
        <View style={styles.relationRow}>
          {node.relations.map((relation) => (
            <View
              key={`${relation.target}-${relation.label}`}
              style={[styles.relationChip, relation.color === 'purple' && styles.relationPurple, relation.color === 'coral' && styles.relationCoral]}
            >
              <Text
                style={[styles.relationText, relation.color === 'purple' && styles.relationTextPurple, relation.color === 'coral' && styles.relationTextCoral]}
              >
                {relation.target} → {relation.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />
        <DetailLabel icon="bulb-outline" label="퀴즈 상태" />
        <View style={[styles.quizStatus, statusMeta.style]}>
          <Ionicons name={statusMeta.icon} size={15} color={statusColor(node.quiz_status)} />
          <Text style={[styles.quizStatusText, { color: statusColor(node.quiz_status) }]}>{statusMeta.label}</Text>
        </View>

        <TouchableOpacity
          style={[styles.quizButton, node.quiz_status !== 'untested' && styles.quizRetryButton]}
          onPress={() => onOpenQuiz(node)}
        >
          <Ionicons name="bulb-outline" size={14} color={node.quiz_status === 'untested' ? Colors.white : '#555'} />
          <Text style={[styles.quizButtonText, node.quiz_status !== 'untested' && styles.quizRetryButtonText]}>
            {node.quiz_status === 'untested' ? '퀴즈 풀기' : '다시 풀기'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function QuizModal({
  node,
  selectedAnswer,
  onAnswer,
  onClose,
}: {
  node: GraphNode | null;
  selectedAnswer: number | null;
  onAnswer: (optionIndex: number) => void;
  onClose: () => void;
}) {
  const isAnswered = selectedAnswer !== null;
  const isCorrect = node && selectedAnswer === node.quiz.answer;

  return (
    <Modal transparent visible={Boolean(node)} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.quizSheet}>
          <View style={styles.quizHandle} />
          <Text style={styles.quizTitle}>{node?.label}</Text>
          <Text style={styles.quizSource}>출처: {node?.source}</Text>
          <View style={styles.quizQuestionBox}>
            <Text style={styles.quizQuestion}>{node?.quiz.question}</Text>
          </View>
          <View style={styles.quizOptions}>
            {node?.quiz.options.map((option, index) => {
              const correctOption = isAnswered && index === node.quiz.answer;
              const wrongOption = isAnswered && selectedAnswer === index && selectedAnswer !== node.quiz.answer;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.quizOption, correctOption && styles.quizOptionCorrect, wrongOption && styles.quizOptionWrong]}
                  onPress={() => onAnswer(index)}
                  disabled={isAnswered}
                >
                  <Text style={[styles.quizOptionText, correctOption && styles.quizOptionTextCorrect, wrongOption && styles.quizOptionTextWrong]}>
                    {String.fromCharCode(9312 + index)} {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {isAnswered && node ? (
            <View style={[styles.quizResult, isCorrect ? styles.quizResultCorrect : styles.quizResultWrong]}>
              <Text style={[styles.quizResultText, isCorrect ? styles.quizResultTextCorrect : styles.quizResultTextWrong]}>
                {isCorrect ? '정답이에요! 그래프에 반영됐습니다.' : `오답이에요. 정답은 "${node.quiz.options[node.quiz.answer]}"입니다.`}
              </Text>
            </View>
          ) : null}
          <TouchableOpacity style={styles.quizCloseButton} onPress={onClose}>
            <Text style={styles.quizCloseText}>{isAnswered ? '확인 후 닫기' : '닫기'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function DetailLabel({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.detailLabelRow}>
      <Ionicons name={icon} size={12} color={Colors.textLight} />
      <Text style={styles.detailLabel}>{label}</Text>
    </View>
  );
}

function statusColor(status: QuizStatus) {
  if (status === 'correct') return STATUS_COLORS.correct;
  if (status === 'wrong') return STATUS_COLORS.wrong;
  return STATUS_COLORS.untested;
}

function buildGraphHtml(nodes: GraphNode[], edges: string[][]) {
  const graph = JSON.stringify({ nodes, edges });
  return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0"/>
<style>
html,body{margin:0;padding:0;background:#fff;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
canvas{display:block;width:100vw;height:200px;background:#fff;}
</style>
</head>
<body>
<canvas id="graph"></canvas>
<script>
const STATUS=${JSON.stringify(STATUS_COLORS)};
const DATA=${graph};
const canvas=document.getElementById('graph');
const ctx=canvas.getContext('2d');
let nodes=DATA.nodes.map(n=>({...n}));
let links=DATA.edges.map(([source,target])=>({source,target}));
let selectedId=nodes[0]?.id;
let filter='전체';
let search='';
let scale=1;
let positions=[];

function sizeCanvas(){
  const ratio=window.devicePixelRatio||1;
  const w=window.innerWidth;
  const h=200;
  canvas.width=w*ratio;
  canvas.height=h*ratio;
  canvas.style.width=w+'px';
  canvas.style.height=h+'px';
  ctx.setTransform(ratio,0,0,ratio,0,0);
  layoutNodes();
  draw();
}

function visibleNode(n){
  const matchFilter=filter==='전체'||n.source===filter;
  const matchSearch=!search||n.label.toLowerCase().includes(search.toLowerCase());
  return matchFilter&&matchSearch;
}

function visibleIds(){
  return nodes.filter(visibleNode).map(n=>n.id);
}

function layoutNodes(){
  const w=canvas.width/(window.devicePixelRatio||1);
  const h=canvas.height/(window.devicePixelRatio||1);
  const ids=visibleIds();
  const cx=w*0.5;
  const cy=h*0.46;
  const r=Math.min(w,h)*0.33;
  positions=nodes.map((n)=>{
    if(!ids.includes(n.id)) return {id:n.id,x:-100,y:-100,visible:false};
    if(n.id==='mitochondria') return {id:n.id,x:cx,y:cy,visible:true};
    const otherIds=ids.filter(id=>id!=='mitochondria');
    const fi=otherIds.indexOf(n.id);
    const total=Math.max(otherIds.length,1);
    const angle=(fi/total)*Math.PI*2-Math.PI/2;
    return {id:n.id,x:cx+r*Math.cos(angle),y:cy+r*Math.sin(angle),visible:true};
  });
}

function pos(id){
  return positions.find(p=>p.id===id);
}

function colorFor(n){
  if(n.id===selectedId) return STATUS.selected;
  if(n.quiz_status==='correct') return STATUS.correct;
  if(n.quiz_status==='wrong') return STATUS.wrong;
  return STATUS.untested;
}

function draw(){
  const w=canvas.width/(window.devicePixelRatio||1);
  const h=canvas.height/(window.devicePixelRatio||1);
  ctx.save();
  ctx.clearRect(0,0,w,h);
  ctx.translate(w*(1-scale)/2,h*(1-scale)/2);
  ctx.scale(scale,scale);

  links.forEach(l=>{
    const s=pos(l.source);
    const t=pos(l.target);
    if(!s?.visible||!t?.visible) return;
    const strong=l.source===selectedId||l.target===selectedId;
    ctx.beginPath();
    ctx.moveTo(s.x,s.y);
    ctx.lineTo(t.x,t.y);
    ctx.strokeStyle=strong?'rgba(239,159,39,0.55)':'#e8f4f0';
    ctx.lineWidth=strong?1.5:0.8;
    ctx.stroke();
  });

  nodes.forEach(n=>{
    const p=pos(n.id);
    if(!p?.visible) return;
    const selected=n.id===selectedId;
    const radius=selected?17:10;
    const c=colorFor(n);
    ctx.beginPath();
    ctx.arc(p.x,p.y,radius,0,Math.PI*2);
    ctx.fillStyle=selected?c:c+'55';
    ctx.fill();
    ctx.strokeStyle=c;
    ctx.lineWidth=selected?2.5:1.2;
    ctx.stroke();
    if(selected){
      ctx.beginPath();
      ctx.arc(p.x,p.y,radius+4,0,Math.PI*2);
      ctx.strokeStyle='rgba(239,159,39,0.25)';
      ctx.lineWidth=3;
      ctx.stroke();
    }
    ctx.fillStyle='#444';
    ctx.font=(selected?'600 ':'')+(selected?'11':'9')+'px sans-serif';
    ctx.textAlign='center';
    ctx.fillText(n.label,p.x,p.y+radius+12);
  });
  ctx.restore();
}

canvas.addEventListener('click',event=>{
  const rect=canvas.getBoundingClientRect();
  const w=canvas.width/(window.devicePixelRatio||1);
  const h=canvas.height/(window.devicePixelRatio||1);
  const x=(event.clientX-rect.left-w*(1-scale)/2)/scale;
  const y=(event.clientY-rect.top-h*(1-scale)/2)/scale;
  for(const n of nodes){
    const p=pos(n.id);
    if(!p?.visible) continue;
    const radius=n.id===selectedId?25:18;
    if(Math.hypot(x-p.x,y-p.y)<=radius){
      selectedId=n.id;
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'node-selected',id:n.id}));
      draw();
      return;
    }
  }
});

window.applySearch=function(value){search=value||'';layoutNodes();draw();};
window.applyFilter=function(value){filter=value||'전체';layoutNodes();draw();};
window.zoomGraph=function(next){scale=Math.max(0.5,Math.min(2.5,scale*next));draw();};
window.resetGraph=function(){scale=1;layoutNodes();draw();};
window.addEventListener('resize',sizeCanvas);
sizeCanvas();
</script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 96 },
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
  title: { fontSize: 17, fontWeight: '600', color: Colors.textDark },
  headerActions: { flexDirection: 'row', gap: 8 },
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
  searchBar: {
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 6,
    backgroundColor: Colors.white,
    borderWidth: 0.5,
    borderColor: '#e0f0eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 12, color: Colors.textDark, paddingVertical: 0 },
  chipRow: { gap: 6, paddingHorizontal: 14, paddingBottom: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: '#ddd',
    backgroundColor: Colors.white,
  },
  filterChipActive: { borderColor: Colors.mint, backgroundColor: Colors.mint },
  filterText: { fontSize: 11, color: '#888' },
  filterTextActive: { color: Colors.white, fontWeight: '500' },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendDotSelected: { borderWidth: 1.5, borderColor: '#BA7517' },
  legendText: { fontSize: 10, color: '#888' },
  graphWrap: {
    height: 200,
    marginHorizontal: 14,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: '#e0f0eb',
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  webView: { flex: 1, backgroundColor: Colors.white },
  graphToolbar: { position: 'absolute', top: 10, right: 10, gap: 6 },
  graphButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#e0f0eb',
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCount: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#eee',
    backgroundColor: Colors.white,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  nodeCountText: { fontSize: 11, color: '#aaa' },
  detailPanel: {
    marginHorizontal: 14,
    marginTop: 8,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.mint,
    overflow: 'hidden',
  },
  detailHeader: {
    backgroundColor: Colors.mintLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  detailTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  detailDot: { width: 10, height: 10, borderRadius: 5 },
  detailTitle: { flexShrink: 1, fontSize: 14, fontWeight: '600', color: '#0F6E56' },
  detailBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: Colors.white,
    borderWidth: 0.5,
    borderColor: Colors.mint,
  },
  detailBadgeText: { fontSize: 10, color: '#0F6E56', fontWeight: '500' },
  detailActions: { flexDirection: 'row', gap: 6 },
  actionButton: {
    minHeight: 27,
    paddingHorizontal: 9,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#ddd',
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  deleteButton: { borderColor: '#ffc5c5', backgroundColor: '#fff3f3' },
  actionText: { fontSize: 11, color: '#888' },
  detailBody: { paddingHorizontal: 12, paddingVertical: 10, gap: 7 },
  detailLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailLabel: { fontSize: 10, fontWeight: '500', color: Colors.textLight },
  sourceChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.mintLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sourceChipText: { fontSize: 11, color: '#0F6E56', fontWeight: '500' },
  divider: { height: 0.5, backgroundColor: '#f0f0f0' },
  locationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.bg,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#e0f0eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  locationText: { fontSize: 11, color: '#555' },
  contextBox: {
    backgroundColor: Colors.bg,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#e0f0eb',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  contextText: { fontSize: 11, color: '#444', lineHeight: 17 },
  relationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  relationChip: {
    borderRadius: 8,
    backgroundColor: Colors.mintLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  relationPurple: { backgroundColor: '#EEEDFE' },
  relationCoral: { backgroundColor: '#FAECE7' },
  relationText: { fontSize: 11, fontWeight: '500', color: '#0F6E56' },
  relationTextPurple: { color: '#3C3489' },
  relationTextCoral: { color: '#712B13' },
  quizStatus: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  quizCorrect: { backgroundColor: Colors.mintLight },
  quizWrong: { backgroundColor: '#FCEBEB' },
  quizUntested: { backgroundColor: '#F1EFE8' },
  quizStatusText: { fontSize: 11, fontWeight: '500' },
  quizButton: {
    width: '100%',
    borderRadius: 10,
    backgroundColor: Colors.mint,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  quizRetryButton: {
    backgroundColor: Colors.bg,
    borderWidth: 0.5,
    borderColor: '#e0f0eb',
  },
  quizButtonText: { fontSize: 12, fontWeight: '500', color: Colors.white },
  quizRetryButtonText: { color: '#555' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  quizSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
  },
  quizHandle: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  quizTitle: { fontSize: 13, fontWeight: '600', color: '#222', marginBottom: 4 },
  quizSource: { fontSize: 11, color: '#aaa', marginBottom: 16 },
  quizQuestionBox: {
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#e0f0eb',
    backgroundColor: Colors.bg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  quizQuestion: { fontSize: 13, color: '#222', lineHeight: 20 },
  quizOptions: { gap: 7, marginBottom: 14 },
  quizOption: {
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  quizOptionCorrect: { borderColor: Colors.mint, backgroundColor: Colors.mintLight },
  quizOptionWrong: { borderColor: '#E24B4A', backgroundColor: '#FCEBEB' },
  quizOptionText: { fontSize: 12, color: '#333' },
  quizOptionTextCorrect: { color: '#0F6E56', fontWeight: '500' },
  quizOptionTextWrong: { color: '#A32D2D', fontWeight: '500' },
  quizResult: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  quizResultCorrect: { backgroundColor: Colors.mintLight },
  quizResultWrong: { backgroundColor: '#FCEBEB' },
  quizResultText: { fontSize: 12 },
  quizResultTextCorrect: { color: '#0F6E56' },
  quizResultTextWrong: { color: '#A32D2D' },
  quizCloseButton: {
    width: '100%',
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    alignItems: 'center',
  },
  quizCloseText: { fontSize: 13, color: '#555', fontWeight: '500' },
});
