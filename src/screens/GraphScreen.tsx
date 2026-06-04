import { useMemo, useRef, useState } from 'react';
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
import { router } from 'expo-router';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Colors } from '@/styles/theme';

type SourceType = 'audio' | 'pdf' | 'ppt';
type QuizStatus = 'correct' | 'wrong' | 'untested';

type GraphNode = {
  id: string;
  label: string;
  folder: string;
  source: string;
  source_type: SourceType;
  location: ({ type: 'timestamp'; value: string } | { type: 'page'; value: number })[];
  context: string;
  relations: { target: string; label: string; color: 'mint' | 'purple' | 'coral' }[];
  quiz_status: QuizStatus;
};

const STATUS_COLORS = {
  correct: '#22C9A0',
  wrong: '#E24B4A',
  untested: '#B4B2A9',
  selected: '#EF9F27',
};

const GRAPH_NODES: GraphNode[] = [
  {
    id: 'mitochondria',
    label: '미토콘드리아',
    folder: '알고리즘 강의',
    source: '알고리즘 강의 녹음',
    source_type: 'audio',
    location: [
      { type: 'timestamp', value: '00:12:34' },
      { type: 'timestamp', value: '00:28:10' },
    ],
    context: '세포의 에너지 공장으로 ATP를 생산하는 핵심 소기관입니다.',
    relations: [
      { target: 'ATP', label: '생성', color: 'mint' },
      { target: '세포 호흡', label: '관련', color: 'purple' },
      { target: '포도당', label: '분해', color: 'coral' },
    ],
    quiz_status: 'correct',
  },
  {
    id: 'atp',
    label: 'ATP',
    folder: '알고리즘 강의',
    source: '알고리즘 강의 녹음',
    source_type: 'audio',
    location: [{ type: 'timestamp', value: '00:13:20' }],
    context: '세포에서 에너지 전달에 사용되는 대표적인 분자입니다.',
    relations: [
      { target: '미토콘드리아', label: '생성됨', color: 'mint' },
      { target: '에너지', label: '공급', color: 'mint' },
    ],
    quiz_status: 'untested',
  },
  {
    id: 'respiration',
    label: '세포 호흡',
    folder: '알고리즘 강의',
    source: '알고리즘 요약본.pdf',
    source_type: 'pdf',
    location: [{ type: 'page', value: 12 }],
    context: '포도당을 분해해 ATP를 생성하는 일련의 대사 과정입니다.',
    relations: [
      { target: '미토콘드리아', label: '일어남', color: 'mint' },
      { target: '포도당', label: '사용', color: 'coral' },
    ],
    quiz_status: 'wrong',
  },
  {
    id: 'oxidation',
    label: '산화',
    folder: '알고리즘 강의',
    source: '강의 슬라이드.ppt',
    source_type: 'ppt',
    location: [{ type: 'page', value: 7 }],
    context: '전자 전달 과정에서 산화 반응이 핵심적인 역할을 합니다.',
    relations: [{ target: '세포 호흡', label: '포함', color: 'purple' }],
    quiz_status: 'untested',
  },
  {
    id: 'energy',
    label: '에너지',
    folder: '3월 회의',
    source: '마케팅 회의록',
    source_type: 'audio',
    location: [{ type: 'timestamp', value: '00:05:30' }],
    context: '회의에서는 팀 에너지를 SNS 채널에 집중하기로 결정했습니다.',
    relations: [{ target: 'ATP', label: '비유', color: 'mint' }],
    quiz_status: 'correct',
  },
  {
    id: 'dna',
    label: 'DNA',
    folder: '3월 회의',
    source: '마케팅 회의록',
    source_type: 'audio',
    location: [{ type: 'timestamp', value: '00:08:15' }],
    context: '복제와 정보 저장의 맥락에서 비교 대상으로 언급되었습니다.',
    relations: [{ target: '미토콘드리아', label: '저장됨', color: 'mint' }],
    quiz_status: 'untested',
  },
  {
    id: 'glucose',
    label: '포도당',
    folder: '마케팅 기획',
    source: '기획 요약본.pdf',
    source_type: 'pdf',
    location: [{ type: 'page', value: 3 }],
    context: '세포 호흡에서 주요 기질로 사용되는 분자입니다.',
    relations: [
      { target: '세포 호흡', label: '기질', color: 'coral' },
      { target: '미토콘드리아', label: '분해됨', color: 'mint' },
    ],
    quiz_status: 'wrong',
  },
  {
    id: 'enzyme',
    label: '효소',
    folder: '마케팅 기획',
    source: '기획 요약본.pdf',
    source_type: 'pdf',
    location: [{ type: 'page', value: 5 }],
    context: '생화학 반응을 촉매하는 단백질입니다.',
    relations: [{ target: '세포 호흡', label: '촉매', color: 'purple' }],
    quiz_status: 'untested',
  },
];

const GRAPH_EDGES = [
  ['mitochondria', 'atp'],
  ['mitochondria', 'respiration'],
  ['mitochondria', 'oxidation'],
  ['atp', 'energy'],
  ['respiration', 'glucose'],
  ['respiration', 'enzyme'],
  ['oxidation', 'enzyme'],
  ['dna', 'mitochondria'],
];

const FILTERS = ['전체', '알고리즘 강의', '3월 회의', '마케팅 기획'];

export default function GraphScreen() {
  const webViewRef = useRef<WebView>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(GRAPH_NODES[0]);
  const [searchText, setSearchText] = useState('');
  const [filter, setFilter] = useState('전체');
  const html = useMemo(() => buildGraphHtml(GRAPH_NODES, GRAPH_EDGES), []);

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
    const payload = JSON.parse(event.nativeEvent.data) as { type: string; id?: string };
    if (payload.type === 'node-selected' && payload.id) {
      setSelectedNode(GRAPH_NODES.find((node) => node.id === payload.id) ?? null);
    }
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
        <LegendDot color={STATUS_COLORS.selected} label="선택됨" />
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
          <TouchableOpacity style={styles.graphButton} onPress={() => inject('window.zoomGraph(0.82)')}>
            <Ionicons name="remove" size={16} color="#555" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.graphButton} onPress={() => inject('window.resetGraph()')}>
            <Ionicons name="scan-outline" size={16} color="#555" />
          </TouchableOpacity>
        </View>
      </View>

      {selectedNode && <NodeDetailPanel node={selectedNode} />}
    </SafeAreaView>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function NodeDetailPanel({ node }: { node: GraphNode }) {
  const statusMeta = {
    correct: { label: '퀴즈 통과', icon: 'checkmark-circle-outline' as const, style: styles.quizCorrect },
    wrong: { label: '오답 · 복습 필요', icon: 'close-circle-outline' as const, style: styles.quizWrong },
    untested: { label: '아직 미응시', icon: 'ellipse-outline' as const, style: styles.quizUntested },
  }[node.quiz_status];

  const openSource = () => {
    router.push(node.source_type === 'audio' ? '/detail' : '/pdf');
  };

  return (
    <View style={styles.detailPanel}>
      <View style={styles.detailHeader}>
        <View style={styles.detailTitleRow}>
          <View style={[styles.detailDot, { backgroundColor: statusColor(node.quiz_status) }]} />
          <Text style={styles.detailTitle} numberOfLines={1}>
            {node.label}
          </Text>
          <View style={styles.detailBadge}>
            <Text style={styles.detailBadgeText}>개념</Text>
          </View>
        </View>
        <View style={styles.detailActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('수정', '노드 수정 API 연결 지점입니다.')}>
            <Ionicons name="create-outline" size={13} color="#888" />
            <Text style={styles.actionText}>수정</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => Alert.alert('삭제', '노드 삭제 API 연결 지점입니다.')}>
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
        <DetailLabel icon={node.source_type === 'audio' ? 'time-outline' : 'reader-outline'} label={node.source_type === 'audio' ? '타임스탬프' : '페이지'} />
        <View style={styles.locationRow}>
          {node.location.map((location) => (
            <TouchableOpacity key={`${location.type}-${location.value}`} style={styles.locationChip} onPress={openSource}>
              <Ionicons name={location.type === 'timestamp' ? 'play-outline' : 'document-outline'} size={11} color={Colors.mint} />
              <Text style={styles.locationText}>
                {location.type === 'timestamp' ? location.value : `${location.value}p`}
              </Text>
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
              <Text style={[styles.relationText, relation.color === 'purple' && styles.relationTextPurple, relation.color === 'coral' && styles.relationTextCoral]}>
                {relation.target} · {relation.label}
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
      </View>
    </View>
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
canvas{display:block;width:100vw;height:260px;background:#fff;}
</style>
<script src="https://cdn.jsdelivr.net/npm/d3-force@3"></script>
</head>
<body>
<canvas id="graph"></canvas>
<script>
const STATUS=${JSON.stringify(STATUS_COLORS)};
const DATA=${graph};
const canvas=document.getElementById('graph');
const ctx=canvas.getContext('2d');
let nodes=DATA.nodes.map(n=>({...n}));
let links=DATA.edges.map(e=>({source:e[0],target:e[1]}));
let selectedId=nodes[0]?.id;
let filter='전체';
let search='';
let scale=1;
let simulation;

function sizeCanvas(){
  const ratio=window.devicePixelRatio||1;
  const w=window.innerWidth;
  const h=260;
  canvas.width=w*ratio;
  canvas.height=h*ratio;
  canvas.style.width=w+'px';
  canvas.style.height=h+'px';
  ctx.setTransform(ratio,0,0,ratio,0,0);
}

function visibleNode(n){
  const matchFilter=filter==='전체'||n.folder===filter;
  const matchSearch=!search||n.label.toLowerCase().includes(search.toLowerCase());
  return matchFilter&&matchSearch;
}

function colorFor(n){
  if(n.id===selectedId) return STATUS.selected;
  if(n.quiz_status==='correct') return STATUS.correct;
  if(n.quiz_status==='wrong') return STATUS.wrong;
  return STATUS.untested;
}

function start(){
  sizeCanvas();
  if(window.d3&&d3.forceSimulation){
    simulation=d3.forceSimulation(nodes)
      .force('link',d3.forceLink(links).id(d=>d.id).distance(68).strength(0.7))
      .force('charge',d3.forceManyBody().strength(-180))
      .force('center',d3.forceCenter(window.innerWidth/2,122))
      .force('collide',d3.forceCollide().radius(34))
      .on('tick',draw);
  }else{
    const cx=window.innerWidth/2, cy=122, r=86;
    nodes.forEach((n,i)=>{n.x=cx+r*Math.cos(i/nodes.length*Math.PI*2);n.y=cy+r*Math.sin(i/nodes.length*Math.PI*2);});
    draw();
  }
}

function draw(){
  const w=canvas.width/(window.devicePixelRatio||1);
  const h=canvas.height/(window.devicePixelRatio||1);
  ctx.save();
  ctx.clearRect(0,0,w,h);
  ctx.translate(w*(1-scale)/2,h*(1-scale)/2);
  ctx.scale(scale,scale);

  links.forEach(l=>{
    const s=typeof l.source==='object'?l.source:nodes.find(n=>n.id===l.source);
    const t=typeof l.target==='object'?l.target:nodes.find(n=>n.id===l.target);
    if(!s||!t||!visibleNode(s)||!visibleNode(t)) return;
    const strong=s.id===selectedId||t.id===selectedId;
    ctx.beginPath();
    ctx.moveTo(s.x,s.y);
    ctx.lineTo(t.x,t.y);
    ctx.strokeStyle=strong?'rgba(239,159,39,0.55)':'#e8f4f0';
    ctx.lineWidth=strong?1.8:0.9;
    ctx.stroke();
  });

  nodes.forEach(n=>{
    if(!visibleNode(n)) return;
    const selected=n.id===selectedId;
    const radius=selected?17:11;
    const c=colorFor(n);
    ctx.beginPath();
    ctx.arc(n.x,n.y,radius,0,Math.PI*2);
    ctx.fillStyle=selected?c:c+'66';
    ctx.fill();
    ctx.strokeStyle=c;
    ctx.lineWidth=selected?2.6:1.3;
    ctx.stroke();
    if(selected){
      ctx.beginPath();
      ctx.arc(n.x,n.y,radius+5,0,Math.PI*2);
      ctx.strokeStyle='rgba(239,159,39,0.26)';
      ctx.lineWidth=4;
      ctx.stroke();
    }
    ctx.fillStyle='#444';
    ctx.font=(selected?'600 ':'')+(selected?'11':'9')+'px sans-serif';
    ctx.textAlign='center';
    ctx.fillText(n.label,n.x,n.y+radius+13);
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
    if(!visibleNode(n)) continue;
    const radius=n.id===selectedId?22:17;
    if(Math.hypot(x-n.x,y-n.y)<=radius){
      selectedId=n.id;
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'node-selected',id:n.id}));
      draw();
      return;
    }
  }
});

window.applySearch=function(value){search=value||'';draw();};
window.applyFilter=function(value){filter=value||'전체';if(simulation){simulation.alpha(0.8).restart();}draw();};
window.zoomGraph=function(next){scale=Math.max(0.55,Math.min(2.4,scale*next));draw();};
window.resetGraph=function(){scale=1;filter=filter||'전체';if(simulation){simulation.alpha(1).restart();}draw();};
window.addEventListener('resize',start);
start();
</script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
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
  legendText: { fontSize: 10, color: '#888' },
  graphWrap: {
    height: 260,
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
});
