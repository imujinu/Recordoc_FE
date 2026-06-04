import { useRef, useState, type ReactNode, type RefObject } from 'react';
import {
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
import { Colors } from '@/styles/theme';
import { AppBottomBar } from '@/components/AppBottomBar';

type TopTab = 'summary' | 'script';
type SectionKey = 'overview' | 'paragraphs' | 'keywords';
type ChatMessage = { role: 'user' | 'ai'; text: string };

const SCRIPTS = [
  { time: '00:00:03', text: '안녕하세요. 오늘 회의를 시작하겠습니다. 지난번 의견에 대해 먼저 이야기해볼까요?' },
  { time: '00:00:24', text: '2분기 예산은 조정하는 방향으로 진행하면 좋겠습니다. 신규 채널 진입 비용이 필요합니다.' },
  { time: '00:00:38', text: '인스타그램 릴스에 집중하는 것이 효율적일 것 같아요.' },
  { time: '00:00:52', text: '유튜브 쇼츠도 같이 가면 좋겠지만, 리소스가 부족할 수 있어요.' },
];

const PARAGRAPHS = [
  {
    title: '예산 조정 논의',
    color: Colors.mint,
    body: '2분기 마케팅 예산을 전분기 대비 15% 증액하기로 합의했습니다. 신규 채널 진입 비용과 크리에이티브 작업 비용 증가가 주요 이유입니다.',
  },
  {
    title: 'SNS 전략 개편',
    color: '#7F77DD',
    body: '인스타그램 릴스 콘텐츠를 핵심 채널로 선정했습니다. 기존 블로그 중심 전략에서 짧은 영상 중심으로 전환합니다.',
  },
  {
    title: '다음 회의 액션 아이템',
    color: '#D85A30',
    body: '각 파트는 채널별 KPI 초안과 콘텐츠 제작 일정을 준비하고, 다음 회의 전 공유 드라이브에 업로드합니다.',
  },
];

const KEYWORDS = [
  '마케팅 예산',
  '2분기',
  '15% 증액',
  '인스타그램',
  '릴스',
  '유튜브 쇼츠',
  'SNS 전략',
  'KPI',
  '액션 아이템',
];

const INIT_CHATS: ChatMessage[] = [
  { role: 'user', text: '예산 증액 이유가 뭐야?' },
  { role: 'ai', text: '신규 채널 진입 비용과 크리에이티브 작업 비용 증가 때문에 15% 증액하기로 했습니다.' },
];

export default function DetailScreen() {
  const [activeTab, setActiveTab] = useState<TopTab>('summary');
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    overview: true,
    paragraphs: true,
    keywords: true,
  });
  const [panelOpen, setPanelOpen] = useState(true);
  const [chats, setChats] = useState<ChatMessage[]>(INIT_CHATS);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    setChats((prev) => [
      ...prev,
      { role: 'user', text: inputText },
      { role: 'ai', text: '스크립트를 기준으로 답변을 준비 중입니다. 잠시만 기다려주세요.' },
    ]);
    setInputText('');
    setPanelOpen(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.mint} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          3월 마케팅 회의록
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="share-outline" size={17} color={Colors.mint} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="ellipsis-horizontal" size={18} color={Colors.mint} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'summary' && styles.tabItemActive]}
          onPress={() => setActiveTab('summary')}
        >
          <Text style={[styles.tabText, activeTab === 'summary' && styles.tabTextActive]}>요약</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'script' && styles.tabItemActive]}
          onPress={() => setActiveTab('script')}
        >
          <Text style={[styles.tabText, activeTab === 'script' && styles.tabTextActive]}>스크립트</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'summary' ? (
        <ScrollView contentContainerStyle={styles.content}>
          <CollapsibleSection
            icon="sparkles-outline"
            title="전체 요약"
            open={openSections.overview}
            onPress={() => toggleSection('overview')}
          >
            <Text style={styles.sectionText}>
              3월 마케팅 회의에서는 2분기 캠페인 예산 조정과 SNS 콘텐츠 전략을 주요 안건으로 논의했습니다.
              예산은 전분기 대비 15% 증액하기로 결정했으며, 인스타그램 릴스를 핵심 채널로 선정하고 유튜브
              쇼츠 병행 운영은 리소스 상황에 따라 검토하기로 했습니다.
            </Text>
          </CollapsibleSection>

          <CollapsibleSection
            icon="list-outline"
            title="문단별 요약"
            open={openSections.paragraphs}
            onPress={() => toggleSection('paragraphs')}
          >
            {PARAGRAPHS.map((item) => (
              <View key={item.title} style={styles.contextItem}>
                <View style={styles.contextTitleRow}>
                  <View style={[styles.contextDot, { backgroundColor: item.color }]} />
                  <Text style={styles.contextTitle}>{item.title}</Text>
                </View>
                <Text style={styles.contextText}>{item.body}</Text>
              </View>
            ))}
          </CollapsibleSection>

          <CollapsibleSection
            icon="pricetag-outline"
            title="키워드"
            open={openSections.keywords}
            onPress={() => toggleSection('keywords')}
          >
            <View style={styles.keywordWrap}>
              {KEYWORDS.map((keyword, index) => (
                <View
                  key={keyword}
                  style={[
                    styles.keyword,
                    index % 3 === 1 && styles.keywordPurple,
                    index % 3 === 2 && styles.keywordCoral,
                  ]}
                >
                  <Text
                    style={[
                      styles.keywordText,
                      index % 3 === 1 && styles.keywordTextPurple,
                      index % 3 === 2 && styles.keywordTextCoral,
                    ]}
                  >
                    {keyword}
                  </Text>
                </View>
              ))}
            </View>
          </CollapsibleSection>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.sectionCard}>
            <View style={styles.scriptBody}>
              {SCRIPTS.map((script) => (
                <View key={script.time} style={styles.scriptItem}>
                  <Text style={styles.scriptTime}>{script.time}</Text>
                  <Text style={styles.scriptText}>{script.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      <RagPanel
        open={panelOpen}
        onToggle={() => setPanelOpen((prev) => !prev)}
        chats={chats}
        inputText={inputText}
        setInputText={setInputText}
        onSend={handleSend}
        scrollRef={scrollRef}
      />
      <AppBottomBar active="work" />
    </SafeAreaView>
  );
}

function CollapsibleSection({
  icon,
  title,
  open,
  onPress,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  open: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <TouchableOpacity style={styles.sectionHeader} onPress={onPress}>
        <View style={styles.sectionLabelRow}>
          <Ionicons name={icon} size={13} color={Colors.mint} />
          <Text style={styles.sectionLabel}>{title}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textLight} />
      </TouchableOpacity>
      {open && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
}

function RagPanel({
  open,
  onToggle,
  chats,
  inputText,
  setInputText,
  onSend,
  scrollRef,
}: {
  open: boolean;
  onToggle: () => void;
  chats: ChatMessage[];
  inputText: string;
  setInputText: (text: string) => void;
  onSend: () => void;
  scrollRef: RefObject<ScrollView | null>;
}) {
  return (
    <View style={styles.chatPanel}>
      <TouchableOpacity style={styles.panelHandleButton} onPress={onToggle}>
        <View style={styles.panelHandle} />
      </TouchableOpacity>
      <View style={styles.panelTitleRow}>
        <Ionicons name="chatbubble-ellipses-outline" size={14} color={Colors.mint} />
        <Text style={styles.panelTitle}>이 파일로 질문하기</Text>
      </View>
      {open && (
        <ScrollView ref={scrollRef} style={styles.chatScroll} contentContainerStyle={styles.chatList}>
          {chats.map((message, index) => (
            <View key={`${message.role}-${index}`} style={message.role === 'user' ? styles.chatMine : styles.chatAi}>
              <Text style={message.role === 'user' ? styles.chatMineText : styles.chatAiText}>{message.text}</Text>
            </View>
          ))}
        </ScrollView>
      )}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="이 내용으로 질문하세요..."
          placeholderTextColor="#bbb"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={onSend}
        />
        <TouchableOpacity onPress={onSend}>
          <Ionicons name="send" size={17} color={Colors.mint} />
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 7,
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
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: Colors.mint,
  },
  tabText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  tabTextActive: {
    color: Colors.mint,
    fontWeight: '600',
  },
  content: {
    padding: 12,
    paddingBottom: 10,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
    marginBottom: 8,
    overflow: 'hidden',
  },
  sectionHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.mint,
  },
  sectionBody: {
    borderTopWidth: 0.5,
    borderTopColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  sectionText: {
    fontSize: 12,
    color: '#444',
    lineHeight: 20,
    paddingTop: 8,
  },
  contextItem: {
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f5f5f5',
  },
  contextTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 5,
  },
  contextDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  contextTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textDark,
  },
  contextText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 20,
    paddingLeft: 11,
  },
  keywordWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 8,
  },
  keyword: {
    backgroundColor: Colors.mintLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  keywordPurple: {
    backgroundColor: '#EEEDFE',
  },
  keywordCoral: {
    backgroundColor: '#FAECE7',
  },
  keywordText: {
    fontSize: 11,
    color: '#0F6E56',
    fontWeight: '500',
  },
  keywordTextPurple: {
    color: '#3C3489',
  },
  keywordTextCoral: {
    color: '#712B13',
  },
  scriptBody: {
    padding: 12,
  },
  scriptItem: {
    marginBottom: 10,
  },
  scriptTime: {
    fontSize: 10,
    color: Colors.textLight,
    marginBottom: 2,
  },
  scriptText: {
    fontSize: 12,
    color: '#333',
    lineHeight: 19,
  },
  chatPanel: {
    backgroundColor: Colors.white,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  panelHandleButton: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 6,
  },
  panelHandle: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#ddd',
  },
  panelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  panelTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#888',
  },
  chatScroll: {
    maxHeight: 112,
  },
  chatList: {
    gap: 5,
    paddingBottom: 3,
  },
  chatAi: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.bg,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
    maxWidth: '88%',
  },
  chatMine: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.mintLight,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
    maxWidth: '88%',
  },
  chatAiText: {
    fontSize: 11,
    color: '#444',
    lineHeight: 16,
  },
  chatMineText: {
    fontSize: 11,
    color: '#0F6E56',
    lineHeight: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.bg,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#e0f0eb',
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 6,
  },
  input: {
    flex: 1,
    fontSize: 11,
    color: Colors.textDark,
    paddingVertical: 0,
  },
});
