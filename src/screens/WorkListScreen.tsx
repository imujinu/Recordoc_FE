import { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/styles/theme';
import { useNewItemSheet } from '@/components/NewItemSheet';

const FOLDER_COLORS = [
  { bg: Colors.mintLight, icon: Colors.mint },
  { bg: '#EEEDFE', icon: '#7F77DD' },
  { bg: '#FAECE7', icon: '#D85A30' },
];

type WorkItem = {
  id: number;
  type: 'audio' | 'pdf';
  title: string;
  status: 'converting' | 'done';
  date?: string;
  progress?: number;
  eta?: string;
};

type FolderItem = {
  id: number;
  title: string;
  fileCount: number;
  badge?: number;
};

const MOCK_FOLDERS: FolderItem[] = [
  { id: 1, title: '3월 회의', fileCount: 4, badge: 2 },
  { id: 2, title: '알고리즘 강의', fileCount: 7 },
  { id: 3, title: '마케팅 기획', fileCount: 2 },
  { id: 4, title: '지식 그래프', fileCount: 12 },
];

const MOCK_ITEMS: WorkItem[] = [
  {
    id: 1,
    type: 'audio',
    title: '3월 마케팅 회의록',
    status: 'converting',
    progress: 67,
    eta: '약 1분 20초',
  },
  {
    id: 2,
    type: 'audio',
    title: '팀 미팅 0602',
    status: 'done',
    date: '2026. 6. 1. 오전 11:02',
  },
  {
    id: 3,
    type: 'pdf',
    title: '알고리즘 요약본',
    status: 'done',
    date: 'PDF · 41MB',
  },
];

export default function WorkListScreen() {
  const [items, setItems] = useState(MOCK_ITEMS);
  const { openSheet } = useNewItemSheet();

  useEffect(() => {
    const interval = setInterval(() => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.status === 'converting' && item.progress !== undefined) {
            const next = Math.min(item.progress + 1, 100);
            const remaining = Math.round(((100 - next) / 100) * 80);
            const eta =
              remaining > 60
                ? `약 ${Math.floor(remaining / 60)}분 ${remaining % 60}초`
                : `약 ${remaining}초`;

            if (next === 100) {
              return {
                ...item,
                status: 'done',
                date: '2026. 6. 1. 오전 11:02',
                progress: 100,
              };
            }

            return { ...item, progress: next, eta };
          }
          return item;
        })
      );
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const openItem = (item: WorkItem) => {
    if (item.status === 'converting') return;
    router.push(item.type === 'pdf' ? '/pdf' : '/detail');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>내 작업</Text>
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
        <View style={styles.searchBar}>
          <Ionicons name="search" size={15} color="#bbb" />
          <Text style={styles.searchText}>파일 또는 폴더 검색...</Text>
        </View>

        <Text style={styles.sectionLabel}>폴더</Text>
        <View style={styles.grid}>
          {MOCK_FOLDERS.map((folder, index) => (
            <TouchableOpacity
              key={folder.id}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => router.push('/folder')}
            >
              <View style={[styles.itemIcon, { backgroundColor: FOLDER_COLORS[index % 3].bg }]}>
                <Ionicons name="folder" size={27} color={FOLDER_COLORS[index % 3].icon} />
                {folder.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{folder.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.itemName} numberOfLines={2}>
                {folder.title}
              </Text>
              <Text style={styles.itemMeta}>파일 {folder.fileCount}개</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.newCard} activeOpacity={0.8} onPress={openSheet}>
            <Ionicons name="add" size={22} color={Colors.mint} />
            <Text style={[styles.itemName, styles.newText]}>새 파일</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>최근 파일</Text>
        <View style={styles.grid}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.card, item.status === 'converting' && styles.convertingCard]}
              activeOpacity={0.8}
              onPress={() => openItem(item)}
            >
              <View
                style={[
                  styles.itemIcon,
                  item.status === 'converting'
                    ? styles.convertingIcon
                    : item.type === 'pdf'
                      ? styles.pdfIcon
                      : styles.audioIcon,
                ]}
              >
                <Ionicons
                  name={item.type === 'pdf' ? 'document-text-outline' : 'mic-outline'}
                  size={23}
                  color={item.status === 'converting' ? '#D85A30' : item.type === 'pdf' ? '#7F77DD' : Colors.mint}
                />
                {item.status === 'converting' && (
                  <View style={styles.progressRing}>
                    <Text style={styles.progressRingText}>{item.progress}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={[styles.itemMeta, item.status === 'converting' && styles.convertingText]}>
                {item.status === 'converting' ? `변환중 ${item.progress}%` : item.date}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#FF5A5A',
    borderRadius: 5,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 8,
    color: Colors.white,
    fontWeight: '600',
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
});
