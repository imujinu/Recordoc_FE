import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { router, useFocusEffect } from 'expo-router';
import {
  getProcessStatus,
  inferFileKind,
  listWorkItems,
  type FileKind,
  type FileWorkItem,
  type FolderWorkItem,
  type WorkItem,
} from '@/api/files';
import { useNewItemSheet } from '@/components/NewItemSheet';
import { Colors } from '@/styles/theme';

const FOLDER_COLORS = [
  { bg: Colors.mintLight, icon: Colors.mint },
  { bg: '#EEEDFE', icon: '#7F77DD' },
  { bg: '#FAECE7', icon: '#D85A30' },
  { bg: '#F1EFE8', icon: '#888780' },
  { bg: '#EAF3FF', icon: '#3A7BD5' },
];

function getStableColorIndex(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % FOLDER_COLORS.length;
}

function getDisplayTitle(file: FileWorkItem): string {
  return file.title?.trim() || file.original_filename?.trim() || '제목 없는 파일';
}

function getStatusLabel(status?: string | null): string {
  if (!status) return '완료';
  if (status === 'completed' || status === 'done') return '완료';
  if (status === 'processing') return '처리 중';
  if (status === 'failed') return '실패';
  return status;
}

function formatDate(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`;
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

function getStatusStyle(status?: string | null) {
  if (status === 'failed') return styles.fileListStatusFail;
  if (status === 'processing') return styles.fileListStatusProcessing;
  return styles.fileListStatusDone;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '내 작업 목록을 불러오지 못했습니다.';
}

export default function WorkListScreen() {
  const { openSheet, workItemsRevision } = useNewItemSheet();
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [recentExpanded, setRecentExpanded] = useState(false);

  const loadWorkItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextItems = await listWorkItems();
      setItems(nextItems);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadWorkItems();
    }, [loadWorkItems])
  );

  useEffect(() => {
    if (workItemsRevision > 0) {
      void loadWorkItems();
    }
  }, [loadWorkItems, workItemsRevision]);

  useEffect(() => {
    setRecentExpanded(false);
  }, [query]);

  const folders = useMemo(() => items.filter((item): item is FolderWorkItem => item.type === 'folder'), [items]);
  const files = useMemo(() => items.filter((item): item is FileWorkItem => item.type === 'file'), [items]);

  const filteredFolders = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return folders;
    return folders.filter((folder) => folder.name.toLowerCase().includes(normalized));
  }, [folders, query]);

  const filteredFiles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return files;
    return files.filter((file) => {
      const title = getDisplayTitle(file).toLowerCase();
      const original = file.original_filename?.toLowerCase() ?? '';
      return title.includes(normalized) || original.includes(normalized);
    });
  }, [files, query]);

  const openFolder = (folder: FolderWorkItem) => {
    router.push(`/folder?folderId=${encodeURIComponent(folder.id)}&folderName=${encodeURIComponent(folder.name)}` as never);
  };

  const openFile = (file: FileWorkItem) => {
    const kind = inferFileKind(file);
    if (kind === 'audio') {
      router.push({
        pathname: '/detail',
        params: {
          transcriptId: file.transcript_id,
          status: getProcessStatus(file),
          title: file.title?.trim() ?? '',
        },
      });
      return;
    }

    router.push({
      pathname: '/pdf',
      params: {
        transcriptId: file.transcript_id,
        status: getProcessStatus(file),
        title: getDisplayTitle(file),
      },
    });
  };

  const renderFolderCard = (folder: FolderWorkItem) => {
    const color = FOLDER_COLORS[getStableColorIndex(folder.id || folder.name)];
    const fileCount = typeof folder.file_count === 'number' ? folder.file_count : null;

    return (
      <TouchableOpacity key={folder.id} style={styles.card} activeOpacity={0.8} onPress={() => openFolder(folder)}>
        <View style={[styles.itemIcon, { backgroundColor: color.bg }]}>
          <Ionicons name="folder-outline" size={25} color={color.icon} />
        </View>
        <Text style={styles.itemName} numberOfLines={2}>
          {folder.name}
        </Text>
        <Text style={styles.itemMeta} numberOfLines={1}>
          {fileCount === null ? '폴더' : `파일 ${fileCount}개`}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderFileRow = (file: FileWorkItem) => {
    const kind = inferFileKind(file);
    const meta = getKindMeta(kind);
    const date = formatDate(file.created_at);
    const status = getStatusLabel(file.status);

    return (
      <TouchableOpacity
        key={file.transcript_id}
        style={styles.fileListRow}
        activeOpacity={0.8}
        onPress={() => openFile(file)}
      >
        <View style={[styles.fileListIcon, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={20} color={meta.color} />
        </View>
        <View style={styles.fileListInfo}>
          <Text style={styles.fileListName} numberOfLines={1}>
            {getDisplayTitle(file)}
          </Text>
          <Text style={styles.fileListMeta} numberOfLines={1}>
            {[meta.label, date].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Text style={[styles.fileListStatus, getStatusStyle(file.status)]} numberOfLines={1}>
          {status}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderFileState = () => {
    const visibleFiles = recentExpanded ? filteredFiles.slice(0, 10) : filteredFiles.slice(0, 3);

    if (loading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="small" color={Colors.mint} />
          <Text style={styles.emptyTitle}>내 작업 목록을 불러오는 중입니다</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={30} color="#D85A30" />
          <Text style={styles.emptyTitle}>목록을 불러오지 못했습니다</Text>
          <Text style={styles.emptyDescription}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadWorkItems}>
            <Text style={styles.retryText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (files.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="file-tray-outline" size={30} color={Colors.textLight} />
          <Text style={styles.emptyTitle}>아직 추가한 파일이 없습니다</Text>
          <Text style={styles.emptyDescription}>새 파일에서 음성이나 문서를 업로드해주세요</Text>
        </View>
      );
    }

    if (filteredFiles.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={30} color={Colors.textLight} />
          <Text style={styles.emptyTitle}>검색 결과가 없습니다</Text>
          <Text style={styles.emptyDescription}>다른 파일명으로 검색해 주세요</Text>
        </View>
      );
    }

    return (
      <View style={styles.fileList}>
        {visibleFiles.map(renderFileRow)}
        {!recentExpanded && filteredFiles.length > 3 && (
          <TouchableOpacity style={styles.expandFilesButton} onPress={() => setRecentExpanded(true)}>
            <Ionicons name="chevron-down" size={13} color={Colors.mint} />
          </TouchableOpacity>
        )}
        {recentExpanded && (
          <View style={styles.recentFooter}>
            <TouchableOpacity style={styles.collapseFilesButton} onPress={() => setRecentExpanded(false)}>
              <Ionicons name="chevron-up" size={13} color={Colors.mint} />
            </TouchableOpacity>
            {filteredFiles.length > 10 && (
              <TouchableOpacity style={styles.viewAllLink}>
                <Text style={styles.viewAllText}>전체 보기 ({filteredFiles.length}개) →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  const showFolderEmpty = !loading && !error && filteredFolders.length === 0 && query.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>내 작업</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="search-outline" size={17} color={Colors.mint} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="ellipsis-horizontal" size={18} color={Colors.mint} />
          </TouchableOpacity>
        </View>
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

        <Text style={styles.sectionLabel}>폴더</Text>
        <View style={styles.grid}>
          {filteredFolders.map(renderFolderCard)}
          {!showFolderEmpty && (
            <TouchableOpacity style={styles.newCard} activeOpacity={0.8} onPress={() => openSheet()}>
              <Ionicons name="add" size={22} color={Colors.mint} />
              <Text style={[styles.itemName, styles.newText]}>새 파일</Text>
            </TouchableOpacity>
          )}
        </View>
        {showFolderEmpty && (
          <Text style={styles.folderEmptyText}>검색된 폴더가 없습니다</Text>
        )}

        <Text style={styles.sectionLabel}>최근 파일</Text>
        {renderFileState()}
      </ScrollView>
    </SafeAreaView>
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
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
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
    paddingBottom: 16,
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
    minHeight: 104,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
    paddingHorizontal: 6,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 5,
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
  folderEmptyText: {
    marginHorizontal: 12,
    marginBottom: 12,
    fontSize: 11,
    color: Colors.textLight,
  },
  fileList: {
    paddingBottom: 8,
  },
  fileListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
    marginHorizontal: 12,
    marginBottom: 6,
  },
  fileListIcon: {
    width: 40,
    height: 40,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fileListInfo: {
    flex: 1,
    minWidth: 0,
  },
  fileListName: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textDark,
  },
  fileListMeta: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 2,
  },
  fileListStatus: {
    fontSize: 10,
    fontWeight: '500',
    flexShrink: 0,
    maxWidth: 72,
  },
  fileListStatusDone: {
    color: Colors.mint,
  },
  fileListStatusProcessing: {
    color: '#7F77DD',
  },
  fileListStatusFail: {
    color: '#E53935',
  },
  expandFilesButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    marginHorizontal: 12,
    marginBottom: 6,
  },
  recentFooter: {
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
    minHeight: 28,
    paddingBottom: 14,
  },
  collapseFilesButton: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllLink: {
    position: 'absolute',
    right: 12,
    top: 0,
    height: 22,
    justifyContent: 'center',
  },
  viewAllText: {
    fontSize: 11,
    lineHeight: 14,
    color: Colors.mint,
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
});
