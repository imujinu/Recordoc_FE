import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const MINT = '#22C9A0';
const MINT_LIGHT = '#E6F7F3';
const BG = '#F7FAF9';

type Tab = '요약' | '전체 텍스트' | '질의응답' | '문서 생성';
type Template = '회의록' | '보고서' | '강의노트' | '할일목록';
type Format = 'PDF' | 'Word' | '텍스트';

const TABS: Tab[] = ['요약', '전체 텍스트', '질의응답', '문서 생성'];

const SCRIPTS = [
  { time: '00:00', text: '안녕하세요, 오늘 회의 시작하겠습니다. 지난번 안건에 대해서 먼저 이야기해볼까요?' },
  { time: '00:59', text: '3분기 목표치를 조정하는 방향으로 논의해봤으면 합니다. 마케팅 팀과 협의가 필요할 것 같습니다.' },
  { time: '01:49', text: 'SNS 캠페인 일정은 7월 초로 잡는 게 좋을 것 같고요. 다음 주까지 각자 초안 제출 부탁드립니다.' },
];

const TEMPLATES: { key: Template; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: '회의록', icon: 'document-text-outline' },
  { key: '보고서', icon: 'clipboard-outline' },
  { key: '강의노트', icon: 'school-outline' },
  { key: '할일목록', icon: 'checkbox-outline' },
];

const FORMATS: { key: Format; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'PDF', icon: 'document-outline' },
  { key: 'Word', icon: 'document-text-outline' },
  { key: '텍스트', icon: 'create-outline' },
];

const SUGGESTIONS = [
  { emoji: '🔖', text: '핵심 주제별로 나눠서 정리해줘' },
  { emoji: '📝', text: '회의록으로 정리해줘' },
  { emoji: '📋', text: '시험문제를 만들어줘' },
  { emoji: '📗', text: '꼭 공부해야 할 내용을 알려줘' },
  { emoji: '🇰🇷', text: '주요 내용을 한글로 번역해줘' },
];

type ChatMessage = { role: 'user' | 'ai'; text: string };

const INIT_CHATS: ChatMessage[] = [
  { role: 'user', text: '주요 결정 사항이 뭐야?' },
  { role: 'ai', text: '이번 회의에서 결정된 주요 사항이에요:\n\n• 3분기 목표치 15% 하향 조정\n• 신규 SNS 캠페인 7월 론칭\n• 주간 체크인 매주 화요일로 변경' },
  { role: 'user', text: '다음 액션 아이템은?' },
  { role: 'ai', text: '각 팀은 다음 주까지 캠페인 초안을 제출해야 해요. 마케팅 팀과 별도 협의도 필요합니다.' },
];

export default function DetailScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('요약');
  const [selectedTemplate, setSelectedTemplate] = useState<Template>('회의록');
  const [selectedFormat, setSelectedFormat] = useState<Format>('PDF');
  const [docGenerated, setDocGenerated] = useState(false);
  const [archiveModal, setArchiveModal] = useState(false);
  const [chats, setChats] = useState<ChatMessage[]>(INIT_CHATS);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const handleSend = () => {
    if (!inputText.trim()) return;
    setChats(prev => [
      ...prev,
      { role: 'user', text: inputText },
      { role: 'ai', text: '스크립트를 분석 중이에요. 잠시만 기다려 주세요.' },
    ]);
    setInputText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 네비게이션 */}
      <View style={styles.nav}>
        <View style={styles.navLeft}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#333" />
          </TouchableOpacity>
          <Text style={styles.navTitle} numberOfLines={1}>3월 마케팅 팀 회의록</Text>
        </View>
        <View style={styles.navRight}>
          {activeTab === '전체 텍스트' && (
            <TouchableOpacity>
              <Ionicons name="search-outline" size={20} color="#888" />
            </TouchableOpacity>
          )}
          <TouchableOpacity>
            <Ionicons name="share-outline" size={20} color="#888" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="ellipsis-vertical" size={20} color="#888" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 탭 */}
      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={styles.tabItem}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabTxt, activeTab === tab && styles.tabTxtActive]}>
              {tab}
            </Text>
            {activeTab === tab && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* 탭 콘텐츠 */}
      {activeTab === '요약' && <SummaryTab />}
      {activeTab === '전체 텍스트' && <ScriptTab />}
      {activeTab === '질의응답' && (
        <QATab
          chats={chats}
          inputText={inputText}
          setInputText={setInputText}
          onSend={handleSend}
          scrollRef={scrollRef}
        />
      )}
      {activeTab === '문서 생성' && (
        <DocTab
          selectedTemplate={selectedTemplate}
          setSelectedTemplate={setSelectedTemplate}
          selectedFormat={selectedFormat}
          setSelectedFormat={setSelectedFormat}
          docGenerated={docGenerated}
          setDocGenerated={setDocGenerated}
          onArchive={() => setArchiveModal(true)}
        />
      )}

      {/* 문서 보관함 모달 */}
      <Modal visible={archiveModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setArchiveModal(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>문서 보관함</Text>
            <View style={styles.archiveItem}>
              <View style={styles.archiveIcon}>
                <Ionicons name="document-outline" size={20} color={MINT} />
              </View>
              <View style={styles.archiveInfo}>
                <Text style={styles.archiveTitle}>3월 마케팅 팀 회의록.pdf</Text>
                <Text style={styles.archiveSub}>방금 생성됨 · PDF</Text>
              </View>
              <TouchableOpacity style={styles.openBtn}>
                <Text style={styles.openBtnTxt}>열기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function SummaryTab() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.summarySection}>
        <View style={styles.summaryTag}>
          <Ionicons name="sparkles" size={11} color={MINT} />
          <Text style={styles.summaryTagTxt}>AI 요약</Text>
        </View>
        <Text style={styles.summaryTitle}>3분기 목표 조정 및 마케팅 전략 논의</Text>
        <Text style={styles.summaryBody}>
          마케팅 팀 회의에서 3분기 목표치 조정 방향을 검토했습니다. SNS 채널 전략 개편과 신규 캠페인 일정에 대해 논의했으며, 다음 주까지 각 팀별 초안을 제출하기로 했습니다.
        </Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.summarySection}>
        <Text style={styles.summaryTitle}>주요 결정 사항</Text>
        <Text style={styles.summaryBody}>
          {'• 3분기 목표치 15% 하향 조정\n• 신규 SNS 캠페인 7월 론칭\n• 주간 체크인 매주 화요일로 변경'}
        </Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.summarySection}>
        <Text style={styles.summaryTitle}>키워드</Text>
        <View style={styles.keywordRow}>
          {['3분기 목표', 'SNS 전략', '캠페인', '마케팅'].map((kw) => (
            <View key={kw} style={styles.keyword}>
              <Text style={styles.keywordTxt}>{kw}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function ScriptTab() {
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content}>
        {SCRIPTS.map((s) => (
          <View key={s.time} style={styles.scriptBlock}>
            <Text style={styles.scriptTime}>{s.time}</Text>
            <Text style={styles.scriptBody}>{s.text}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.playerBar}>
        <View style={styles.progBg}>
          <View style={styles.progFill}>
            <View style={styles.progHandle} />
          </View>
        </View>
        <View style={styles.playerTime}>
          <Text style={styles.playerTimeCurrent}>00:22</Text>
          <Text style={styles.playerTimeTotal}>02:42</Text>
        </View>
        <View style={styles.playerCtrl}>
          <Text style={styles.speedTxt}>1.0x</Text>
          <TouchableOpacity>
            <Ionicons name="play-back-outline" size={22} color="#aaa" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.playBtn}>
            <Ionicons name="play" size={26} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="play-forward-outline" size={22} color="#aaa" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="bookmark-outline" size={22} color="#aaa" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function QATab({ chats, inputText, setInputText, onSend, scrollRef }: {
  chats: ChatMessage[];
  inputText: string;
  setInputText: (t: string) => void;
  onSend: () => void;
  scrollRef: React.RefObject<ScrollView>;
}) {
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.chatList}
      >
        {chats.map((msg, i) => (
          <View
            key={i}
            style={msg.role === 'user' ? styles.bubbleWrapUser : styles.bubbleWrapAi}
          >
            {msg.role === 'ai' && (
              <View style={styles.aiAvatar}>
                <Ionicons name="sparkles" size={12} color={MINT} />
              </View>
            )}
            <View style={msg.role === 'user' ? styles.bubbleUser : styles.bubbleAi}>
              <Text style={msg.role === 'user' ? styles.bubbleUserTxt : styles.bubbleAiTxt}>
                {msg.text}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.inputBar}>
        <TextInput
          style={styles.inputField}
          placeholder="궁금한 내용을 질문해 보세요"
          placeholderTextColor="#bbb"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={onSend}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={onSend}>
          <Ionicons name="arrow-up" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DocTab({ selectedTemplate, setSelectedTemplate, selectedFormat, setSelectedFormat, docGenerated, setDocGenerated, onArchive }: {
  selectedTemplate: Template;
  setSelectedTemplate: (t: Template) => void;
  selectedFormat: Format;
  setSelectedFormat: (f: Format) => void;
  docGenerated: boolean;
  setDocGenerated: (v: boolean) => void;
  onArchive: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      {/* 문서 보관함 버튼 */}
      <TouchableOpacity style={styles.archiveRow} onPress={onArchive}>
        <Ionicons name="folder-outline" size={15} color="#888" />
        <Text style={styles.archiveRowTxt}>문서 보관함</Text>
        <Ionicons name="chevron-forward" size={14} color="#ccc" />
      </TouchableOpacity>

      {/* 템플릿 선택 */}
      <Text style={styles.docSectionTitle}>템플릿 선택</Text>
      <View style={styles.templateGrid}>
        {TEMPLATES.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={styles.templateItem}
            onPress={() => setSelectedTemplate(t.key)}
          >
            <View style={[styles.templateIconBox, selectedTemplate === t.key && styles.templateIconBoxSel]}>
              <Ionicons name={t.icon} size={22} color={selectedTemplate === t.key ? MINT : '#aaa'} />
              {selectedTemplate === t.key && (
                <View style={styles.tCheck}>
                  <Ionicons name="checkmark" size={9} color="#fff" />
                </View>
              )}
            </View>
            <Text style={[styles.templateLbl, selectedTemplate === t.key && styles.templateLblSel]}>
              {t.key}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 파일 형식 */}
      <Text style={styles.docSectionTitle}>파일 형식</Text>
      <View style={styles.formatGrid}>
        {FORMATS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.formatItem, selectedFormat === f.key && styles.formatItemSel]}
            onPress={() => setSelectedFormat(f.key)}
          >
            <Ionicons name={f.icon} size={24} color={selectedFormat === f.key ? MINT : '#aaa'} />
            <Text style={[styles.formatLbl, selectedFormat === f.key && styles.formatLblSel]}>
              {f.key}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 생성 버튼 */}
      <TouchableOpacity style={styles.genBtn} onPress={() => setDocGenerated(true)}>
        <Text style={styles.genBtnTxt}>문서 생성하기</Text>
      </TouchableOpacity>

      {/* 생성된 문서 카드 */}
      {docGenerated && (
        <View style={styles.docDoneCard}>
          <View style={styles.docDoneIcon}>
            <Ionicons name="document-outline" size={22} color={MINT} />
          </View>
          <View style={styles.docDoneInfo}>
            <Text style={styles.docDoneTitle} numberOfLines={1}>
              3월 마케팅 팀 회의록.{selectedFormat === 'PDF' ? 'pdf' : selectedFormat === 'Word' ? 'docx' : 'txt'}
            </Text>
            <Text style={styles.docDoneSub}>방금 생성됨 · {selectedFormat}</Text>
          </View>
          <TouchableOpacity style={styles.openBtn}>
            <Text style={styles.openBtnTxt}>열기</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  nav: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: '#eee',
  },
  navLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  navTitle: { fontSize: 14, fontWeight: '500', color: '#222', flex: 1 },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  tabs: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 10, position: 'relative' },
  tabTxt: { fontSize: 12, color: '#aaa' },
  tabTxtActive: { color: MINT, fontWeight: '500' },
  tabUnderline: {
    position: 'absolute', bottom: -1, left: '10%',
    width: '80%', height: 2, backgroundColor: MINT, borderRadius: 2,
  },
  content: { padding: 18, paddingBottom: 32 },

  // 요약
  summarySection: { marginBottom: 12 },
  summaryTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: MINT_LIGHT, paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 7,
  },
  summaryTagTxt: { fontSize: 11, color: MINT, fontWeight: '500' },
  summaryTitle: { fontSize: 13, fontWeight: '500', color: '#222', marginBottom: 5 },
  summaryBody: { fontSize: 12, color: '#666', lineHeight: 19 },
  divider: { height: 0.5, backgroundColor: '#eee', marginVertical: 10 },
  keywordRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  keyword: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
    backgroundColor: BG, borderWidth: 0.5, borderColor: '#e0e0e0',
  },
  keywordTxt: { fontSize: 11, color: '#888' },

  // 전체 텍스트
  scriptBlock: { marginBottom: 16 },
  scriptTime: { fontSize: 11, color: MINT, fontWeight: '500', marginBottom: 4 },
  scriptBody: { fontSize: 13, color: '#333', lineHeight: 20 },
  playerBar: {
    borderTopWidth: 0.5, borderTopColor: '#eee',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  progBg: {
    height: 4, backgroundColor: '#f0f0f0',
    borderRadius: 4, marginBottom: 6,
  },
  progFill: {
    height: '100%', width: '20%',
    backgroundColor: MINT, borderRadius: 4,
    position: 'relative',
  },
  progHandle: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: MINT, position: 'absolute',
    right: -6, top: -4,
  },
  playerTime: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  playerTimeCurrent: { fontSize: 11, color: MINT },
  playerTimeTotal: { fontSize: 11, color: '#aaa' },
  playerCtrl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  speedTxt: { fontSize: 12, fontWeight: '500', color: '#333' },
  playBtn: { padding: 4 },

  // 질의응답
  chatList: { padding: 16, gap: 10, paddingBottom: 8 },
  bubbleWrapUser: { flexDirection: 'row', justifyContent: 'flex-end' },
  bubbleWrapAi: { flexDirection: 'row', justifyContent: 'flex-start', gap: 6 },
  aiAvatar: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: MINT_LIGHT,
    justifyContent: 'center', alignItems: 'center', marginTop: 2, flexShrink: 0,
  },
  bubbleUser: {
    backgroundColor: MINT, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 16, borderBottomRightRadius: 2, maxWidth: '75%',
  },
  bubbleUserTxt: { fontSize: 13, color: '#fff', lineHeight: 19 },
  bubbleAi: {
    backgroundColor: BG, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 16, borderTopLeftRadius: 2, maxWidth: '80%',
    borderWidth: 0.5, borderColor: '#e0e0e0',
  },
  bubbleAiTxt: { fontSize: 13, color: '#333', lineHeight: 19 },
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 12,
    borderWidth: 0.5, borderColor: '#ddd',
    borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: BG,
  },
  inputField: { flex: 1, fontSize: 13, color: '#333' },
  sendBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: MINT, justifyContent: 'center', alignItems: 'center',
  },

  // 문서 생성
  archiveRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-end', marginBottom: 16,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, borderWidth: 0.5, borderColor: '#eee',
    backgroundColor: BG,
  },
  archiveRowTxt: { fontSize: 12, color: '#888' },
  docSectionTitle: { fontSize: 12, fontWeight: '500', color: '#888', marginBottom: 10 },
  templateGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  templateItem: { alignItems: 'center', gap: 5 },
  templateIconBox: {
    width: 52, height: 60, borderRadius: 10,
    borderWidth: 0.5, borderColor: '#eee', backgroundColor: BG,
    justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  templateIconBoxSel: { borderWidth: 1.5, borderColor: MINT, backgroundColor: MINT_LIGHT },
  tCheck: {
    position: 'absolute', top: -5, right: -5,
    width: 15, height: 15, borderRadius: 8,
    backgroundColor: MINT, justifyContent: 'center', alignItems: 'center',
  },
  templateLbl: { fontSize: 11, color: '#aaa', textAlign: 'center' },
  templateLblSel: { color: MINT, fontWeight: '500' },
  formatGrid: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  formatItem: {
    flex: 1, alignItems: 'center', gap: 5, paddingVertical: 12,
    borderRadius: 10, borderWidth: 0.5, borderColor: '#eee', backgroundColor: BG,
  },
  formatItemSel: { borderWidth: 1.5, borderColor: MINT, backgroundColor: MINT_LIGHT },
  formatLbl: { fontSize: 11, color: '#aaa' },
  formatLblSel: { color: MINT, fontWeight: '500' },
  genBtn: {
    backgroundColor: MINT, paddingVertical: 13,
    borderRadius: 12, alignItems: 'center', marginBottom: 10,
  },
  genBtnTxt: { fontSize: 14, fontWeight: '500', color: '#fff' },
  docDoneCard: {
    backgroundColor: MINT_LIGHT, borderRadius: 14,
    padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  docDoneIcon: {
    width: 40, height: 46, borderRadius: 6,
    backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#b8e8d8',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  docDoneInfo: { flex: 1, minWidth: 0 },
  docDoneTitle: { fontSize: 12, fontWeight: '500', color: MINT },
  docDoneSub: { fontSize: 10, color: '#5DCAA5', marginTop: 2 },
  openBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 12, backgroundColor: MINT, flexShrink: 0,
  },
  openBtnTxt: { fontSize: 11, color: '#fff', fontWeight: '500' },

  // 보관함 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 24, paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#222', marginBottom: 16, textAlign: 'center' },
  archiveItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  archiveIcon: {
    width: 42, height: 48, borderRadius: 7,
    backgroundColor: MINT_LIGHT, justifyContent: 'center', alignItems: 'center',
  },
  archiveInfo: { flex: 1 },
  archiveTitle: { fontSize: 13, fontWeight: '500', color: '#222' },
  archiveSub: { fontSize: 11, color: '#aaa', marginTop: 2 },
});
