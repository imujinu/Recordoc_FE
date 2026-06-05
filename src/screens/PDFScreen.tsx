import { useRef, useState, type RefObject } from 'react';
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

type ChatMessage = { role: 'user' | 'ai'; text: string };

const PAGE_COUNT = 12;

const INIT_CHATS: ChatMessage[] = [
  { role: 'user', text: '버블 정렬 시간복잡도가 뭐야?' },
  { role: 'ai', text: '최악과 평균 모두 O(n^2)입니다. 이미 정렬된 입력에서 최적화하면 O(n)까지 줄일 수 있습니다.' },
];

export default function PDFScreen() {
  const [page, setPage] = useState(1);
  const [chats, setChats] = useState(INIT_CHATS);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const handleSend = () => {
    if (!inputText.trim()) return;
    setChats((prev) => [
      ...prev,
      { role: 'user', text: inputText },
      { role: 'ai', text: `현재 PDF ${page}페이지 내용을 기준으로 답변을 준비하고 있습니다.` },
    ]);
    setInputText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.mint} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          알고리즘 요약본.pdf
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="search" size={17} color={Colors.mint} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="ellipsis-horizontal" size={18} color={Colors.mint} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.viewer}>
          <View style={styles.pageLabel}>
            <Text style={styles.pageLabelText}>알고리즘 요약본.pdf</Text>
            <Text style={styles.pageLabelText}>
              {page} / {PAGE_COUNT}
            </Text>
          </View>
          <Text style={styles.pdfHeading}>{page}. 정렬 알고리즘 개요</Text>
          <PdfLine width="100%" />
          <PdfLine width="91%" />
          <PdfLine width="80%" highlight />
          <PdfLine width="100%" />
          <PdfLine width="68%" />
          <Text style={[styles.pdfHeading, styles.secondHeading]}>시간 복잡도 비교</Text>
          <PdfLine width="100%" />
          <PdfLine width="95%" highlight />
          <PdfLine width="85%" />
          <PdfLine width="50%" />
        </View>

        <View style={styles.pdfNav}>
          <TouchableOpacity
            style={styles.navButton}
            disabled={page === 1}
            onPress={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            <Ionicons name="chevron-back" size={20} color={page === 1 ? Colors.textLight : Colors.mint} />
          </TouchableOpacity>
          <Text style={styles.navText}>
            {page} / {PAGE_COUNT}
          </Text>
          <TouchableOpacity
            style={styles.navButton}
            disabled={page === PAGE_COUNT}
            onPress={() => setPage((prev) => Math.min(PAGE_COUNT, prev + 1))}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={page === PAGE_COUNT ? Colors.textLight : Colors.mint}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <PdfRagPanel
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

function PdfLine({ width, highlight = false }: { width: `${number}%`; highlight?: boolean }) {
  return <View style={[styles.pdfLine, highlight && styles.pdfHighlight, { width }]} />;
}

function PdfRagPanel({
  chats,
  inputText,
  setInputText,
  onSend,
  scrollRef,
}: {
  chats: ChatMessage[];
  inputText: string;
  setInputText: (text: string) => void;
  onSend: () => void;
  scrollRef: RefObject<ScrollView | null>;
}) {
  return (
    <View style={styles.chatPanel}>
      <View style={styles.panelHandle} />
      <View style={styles.panelTitleRow}>
        <Ionicons name="chatbubble-ellipses-outline" size={14} color={Colors.mint} />
        <Text style={styles.panelTitle}>이 파일로 질문하기</Text>
      </View>
      <ScrollView ref={scrollRef} style={styles.chatScroll} contentContainerStyle={styles.chatList}>
        {chats.map((message, index) => (
          <View key={`${message.role}-${index}`} style={message.role === 'user' ? styles.chatMine : styles.chatAi}>
            <Text style={message.role === 'user' ? styles.chatMineText : styles.chatAiText}>{message.text}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="이 PDF 내용으로 질문하세요..."
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
  content: {
    paddingBottom: 8,
  },
  viewer: {
    marginHorizontal: 12,
    marginTop: 10,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
    padding: 14,
  },
  pageLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pageLabelText: {
    fontSize: 10,
    color: Colors.textLight,
  },
  pdfHeading: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textDark,
    marginBottom: 8,
  },
  secondHeading: {
    marginTop: 10,
  },
  pdfLine: {
    height: 5,
    backgroundColor: '#eee',
    borderRadius: 3,
    marginBottom: 5,
  },
  pdfHighlight: {
    backgroundColor: '#B8E8DC',
  },
  pdfNav: {
    marginHorizontal: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  navButton: {
    width: 34,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontSize: 11,
    color: '#888',
  },
  chatPanel: {
    backgroundColor: Colors.white,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  panelHandle: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#ddd',
    alignSelf: 'center',
    marginBottom: 8,
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
    maxHeight: 96,
  },
  chatList: {
    gap: 5,
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
