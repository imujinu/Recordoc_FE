import { useCallback, useMemo, useRef, useState, type RefObject } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { inferFileKind, listFolderItems, type FileKind, type FileWorkItem } from '@/api/files';
import { AppBottomBar } from '@/components/AppBottomBar';
import { useNewItemSheet } from '@/components/NewItemSheet';
import { Colors } from '@/styles/theme';

type ChatMessage = { role: 'user'; text: string };

function getParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function getDisplayTitle(file: FileWorkItem): string {
  return file.title?.trim() || file.original_filename?.trim() || '제목 없는 파일';
}

function getKindMeta(kind: FileKind): {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  label: string;
} {
  if (kind === 'audio') {
    return { icon: 'mic-outline', color: Colors.mint, bg: Colors.mintLight, label: '음성' };
  }
  if (kind === 'pdf') {
    return { icon: 'document-text-outline', color: '#D85A30', bg: '#FAECE7', label: 'PDF' };
  }
  if (kind === 'ppt') {
    return { icon: 'easel-outline', color: '#7F77DD', bg: '#EEEDFE', label: 'PPT' };
  }
  return { icon: 'document-outline', color: '#888780', bg: '#F1EFE8', label: '문서' };
}

function getStatusLabel(status?: string | null): string {
  if (status === 'processing') return '처리 중';
  if (status === 'failed') return '실패';
  return '완료';
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '폴더 파일 목록을 불러오지 못했습니다.';
}

export default function FolderScreen() {
  const params = useLocalSearchParams<{ folderId?: string; folderName?: string }>();
  const folderId = getParam(params.folderId);
  const folderName = getParam(params.folderName) || '폴더';
  const { openSheet, workItemsRevision } = useNewItemSheet();
  const [files, setFiles] = useState<FileWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const loadFiles = useCallback(async () => {
    if (!folderId) {
      setLoading(false);
      setError('폴더 정보를 찾을 수 없습니다.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextFiles = await listFolderItems(folderId);
      setFiles(nextFiles);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  useFocusEffect(
    useCallback(() => {
      void loadFiles();
    }, [loadFiles])
  );

  useFocusEffect(
    useCallback(() => {
      if (workItemsRevision > 0) {
        void loadFiles();
      }
    }, [loadFiles, workItemsRevision])
  );

  const filteredFiles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return files;
    return files.filter((file) => {
      const title = getDisplayTitle(file).toLowerCase();
      const original = file.original_filename?.toLowerCase() ?? '';
      return title.includes(normalized) || original.includes(normalized);
    });
  }, [files, query]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    setChats((prev) => [...prev, { role: 'user', text }]);
    setInputText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const openFile = (file: FileWorkItem) => {
    const kind = inferFileKind(file);
    if (kind === 'audio') {
      router.push({
        pathname: '/detail',
        params: {
          transcriptId: file.transcript_id,
          status: file.status ?? 'pending',
          title: file.title?.trim() ?? '',
        },
      });
      return;
    }

    router.push({
      pathname: '/pdf',
      params: {
        transcriptId: file.transcript_id,
      },
    });
  };

  const renderNewFileCard = () => (
    <TouchableOpacity
      style={styles.newCard}
      activeOpacity={0.8}
      onPress={() => {
        if (folderId) openSheet(folderId);
      }}
    >
      <Ionicons name="add" size={22} color={Colors.mint} />
      <Text style={[styles.itemName, styles.newText]}>새 파일</Text>
    </TouchableOpacity>
  );

  const renderFiles = () => {
    if (loading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="small" color={Colors.mint} />
          <Text style={styles.emptyTitle}>폴더 파일을 불러오는 중입니다</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={30} color="#D85A30" />
          <Text style={styles.emptyTitle}>파일을 불러오지 못했습니다</Text>
          <Text style={styles.emptyDescription}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadFiles}>
            <Text style={styles.retryText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (files.length === 0) {
      return (
        <>
          <View style={styles.grid}>{renderNewFileCard()}</View>
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={30} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>폴더가 비어 있습니다</Text>
          </View>
        </>
      );
    }

    if (filteredFiles.length === 0) {
      return (
        <>
          <View style={styles.grid}>{renderNewFileCard()}</View>
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={30} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>검색 결과가 없습니다</Text>
          </View>
        </>
      );
    }

    return (
      <View style={styles.grid}>
        {filteredFiles.map((file) => {
          const kind = inferFileKind(file);
          const meta = getKindMeta(kind);
          const isProcessing = file.status === 'processing';
          const isFailed = file.status === 'failed';

          return (
            <TouchableOpacity
              key={file.transcript_id}
              style={[styles.card, isProcessing && styles.processingCard, isFailed && styles.failedCard]}
              activeOpacity={0.8}
              onPress={() => openFile(file)}
            >
              <View style={[styles.itemIcon, { backgroundColor: meta.bg }]}>
                <Ionicons name={meta.icon} size={23} color={meta.color} />
              </View>
              <Text style={styles.itemName} numberOfLines={2}>
                {getDisplayTitle(file)}
              </Text>
              <Text
                style={[
                  styles.itemMeta,
                  isProcessing && styles.processingText,
                  isFailed && styles.failedText,
                ]}
                numberOfLines={1}
              >
                {`${meta.label} · ${getStatusLabel(file.status)}`}
              </Text>
            </TouchableOpacity>
          );
        })}
        {renderNewFileCard()}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.mint} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {folderName}
        </Text>
        <Text style={styles.headerMeta}>파일 {files.length}개</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="ellipsis-horizontal" size={18} color={Colors.mint} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={15} color="#bbb" />
          <TextInput
            style={styles.searchInput}
            placeholder="파일 검색..."
            placeholderTextColor="#bbb"
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={15} color={Colors.textLight} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionLabel}>파일</Text>
        {renderFiles()}
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
        <Text style={styles.panelTitle}>폴더로 질문하기</Text>
      </View>
      <ScrollView ref={scrollRef} style={styles.chatScroll} contentContainerStyle={styles.chatList}>
        {chats.map((message, index) => (
          <View key={`${message.role}-${index}`} style={styles.chatMine}>
            <Text style={styles.chatMineText}>{message.text}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="폴더 내용으로 질문하세요..."
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
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: Colors.textDark,
    paddingVertical: 0,
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
  processingCard: {
    backgroundColor: '#FAF9FF',
    borderColor: '#DDD9FF',
  },
  failedCard: {
    backgroundColor: '#FFF7F7',
    borderColor: '#FFD6D6',
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
  processingText: {
    color: '#7F77DD',
    fontWeight: '500',
  },
  failedText: {
    color: '#E53935',
    fontWeight: '500',
  },
  emptyState: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.white,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 28,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textDark,
    textAlign: 'center',
  },
  emptyDescription: {
    marginTop: 4,
    fontSize: 11,
    color: Colors.textLight,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.mintLight,
  },
  retryText: {
    fontSize: 12,
    color: Colors.mint,
    fontWeight: '600',
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
  chatMine: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.mintLight,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
    maxWidth: '88%',
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
