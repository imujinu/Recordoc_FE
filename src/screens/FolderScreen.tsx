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
import { useNewItemSheet } from '@/components/NewItemSheet';

type FolderFile = {
  id: number;
  title: string;
  type: 'audio' | 'pdf';
  meta: string;
  status?: 'converting' | 'done';
  progress?: number;
};

type ChatMessage = { role: 'user' | 'ai'; text: string };

const FILES: FolderFile[] = [
  { id: 1, title: '마케팅 회의', type: 'audio', meta: '42분', status: 'done' },
  { id: 2, title: '팀 미팅', type: 'audio', meta: '변환중 67%', status: 'converting', progress: 67 },
  { id: 3, title: '회의 자료.pdf', type: 'pdf', meta: 'PDF', status: 'done' },
  { id: 4, title: '주간 리뷰', type: 'audio', meta: '38분', status: 'done' },
];

const INIT_CHATS: ChatMessage[] = [
  { role: 'user', text: '이 폴더에서 결정된 사항은 뭐야?' },
  { role: 'ai', text: '예산 15% 증액, 인스타그램 릴스 채널 우선 적용, 다음 회의 전 KPI 초안 공유가 주요 결정입니다.' },
];

export default function FolderScreen() {
  const { openSheet } = useNewItemSheet();
  const [chats, setChats] = useState(INIT_CHATS);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const handleSend = () => {
    if (!inputText.trim()) return;
    setChats((prev) => [
      ...prev,
      { role: 'user', text: inputText },
      { role: 'ai', text: '이 폴더의 파일들을 기준으로 답변을 정리하고 있습니다.' },
    ]);
    setInputText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const openFile = (file: FolderFile) => {
    if (file.status === 'converting') return;
    router.push(file.type === 'pdf' ? '/pdf' : '/detail');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.mint} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          3월 회의
        </Text>
        <Text style={styles.headerMeta}>파일 {FILES.length}개</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="ellipsis-horizontal" size={18} color={Colors.mint} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={15} color="#bbb" />
          <Text style={styles.searchText}>파일 검색...</Text>
        </View>

        <Text style={styles.sectionLabel}>파일</Text>
        <View style={styles.grid}>
          {FILES.map((file) => (
            <TouchableOpacity
              key={file.id}
              style={[styles.card, file.status === 'converting' && styles.convertingCard]}
              activeOpacity={0.8}
              onPress={() => openFile(file)}
            >
              <View
                style={[
                  styles.itemIcon,
                  file.status === 'converting'
                    ? styles.convertingIcon
                    : file.type === 'pdf'
                      ? styles.pdfIcon
                      : styles.audioIcon,
                ]}
              >
                <Ionicons
                  name={file.type === 'pdf' ? 'document-text-outline' : 'mic-outline'}
                  size={23}
                  color={file.status === 'converting' ? '#D85A30' : file.type === 'pdf' ? '#7F77DD' : Colors.mint}
                />
                {file.status === 'converting' && (
                  <View style={styles.progressRing}>
                    <Text style={styles.progressRingText}>{file.progress}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.itemName} numberOfLines={2}>
                {file.title}
              </Text>
              <Text style={[styles.itemMeta, file.status === 'converting' && styles.convertingText]}>
                {file.meta}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.newCard} activeOpacity={0.8} onPress={openSheet}>
            <Ionicons name="add" size={22} color={Colors.mint} />
            <Text style={[styles.itemName, styles.newText]}>새 파일</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <FolderRagPanel
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

function FolderRagPanel({
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
        <Text style={styles.panelTitle}>이 폴더로 질문하기</Text>
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
          placeholder="이 폴더 내용으로 질문하세요..."
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
  headerMeta: {
    fontSize: 11,
    color: Colors.textLight,
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
  searchBar: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 6,
    backgroundColor: Colors.white,
    borderWidth: 0.5,
    borderColor: '#e0f0eb',
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  searchText: {
    fontSize: 12,
    color: '#bbb',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#888',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  card: {
    width: '31.8%',
    minHeight: 96,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
    paddingHorizontal: 6,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 5,
  },
  convertingCard: {
    backgroundColor: '#FFFAF5',
    borderColor: '#f0e0c8',
  },
  newCard: {
    width: '31.8%',
    minHeight: 96,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#c8ede3',
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 6,
  },
  itemIcon: {
    width: 46,
    height: 40,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioIcon: {
    backgroundColor: Colors.mintLight,
  },
  pdfIcon: {
    backgroundColor: '#EEEDFE',
  },
  convertingIcon: {
    backgroundColor: '#FFF3E8',
  },
  itemName: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.textDark,
    textAlign: 'center',
    lineHeight: 14,
  },
  itemMeta: {
    fontSize: 9,
    color: Colors.textLight,
    textAlign: 'center',
  },
  newText: {
    color: Colors.mint,
  },
  progressRing: {
    position: 'absolute',
    right: -6,
    bottom: -7,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#D85A30',
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingText: {
    fontSize: 7,
    fontWeight: '700',
    color: '#D85A30',
  },
  convertingText: {
    color: '#D85A30',
    fontWeight: '500',
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
