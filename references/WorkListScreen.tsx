import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MINT = '#22C9A0';
const MINT_LIGHT = '#E6F7F3';
const BG = '#F7FAF9';

type WorkItem = {
  id: number;
  type: string;
  title: string;
  status: 'converting' | 'done';
  date?: string;
  progress?: number;
  eta?: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const MOCK_ITEMS: WorkItem[] = [
  {
    id: 1,
    type: '녹음',
    title: '3월 마케팅 팀 회의록',
    status: 'converting',
    progress: 67,
    eta: '약 1분 20초 후',
    icon: 'mic-outline',
  },
  {
    id: 2,
    type: 'PDF',
    title: '알고리즘 강의 요약본',
    status: 'done',
    date: '2026. 6. 1. 오전 10:30',
    icon: 'document-text-outline',
  },
];

const SORT_OPTIONS = ['최신순', '오래된순', '이름순'];

export default function WorkListScreen() {
  const [items, setItems] = useState(MOCK_ITEMS);
  const [sortModal, setSortModal] = useState(false);
  const [selectedSort, setSelectedSort] = useState('최신순');

  useEffect(() => {
    const interval = setInterval(() => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.status === 'converting' && item.progress !== undefined) {
            const next = Math.min(item.progress + 1, 100);
            const remaining = Math.round(((100 - next) / 100) * 80);
            const eta = remaining > 60
              ? `약 ${Math.floor(remaining / 60)}분 ${remaining % 60}초 후`
              : `약 ${remaining}초 후`;
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

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>내 작업</Text>
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setSortModal(true)}
        >
          <Ionicons name="swap-vertical-outline" size={14} color="#888" />
          <Text style={styles.sortTxt}>{selectedSort}</Text>
          <Ionicons name="chevron-down" size={12} color="#aaa" />
        </TouchableOpacity>
      </View>

      {/* 목록 */}
      <ScrollView contentContainerStyle={styles.list}>
        {items.map((item) => (
          <View key={item.id} style={styles.row}>
            <View style={styles.rowTop}>
              <View style={styles.rowIcon}>
                <Ionicons name={item.icon} size={20} color={MINT} />
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowType}>{item.type}</Text>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.status === 'converting' ? (
                  <View style={styles.convertingRow}>
                    <Ionicons name="reload-outline" size={11} color={MINT} />
                    <Text style={styles.convertingTxt}>글자 변환중...</Text>
                  </View>
                ) : (
                  <Text style={styles.rowDate}>{item.date}</Text>
                )}
              </View>
              {item.status === 'converting' ? (
                <TouchableOpacity style={styles.stopBtn}>
                  <Ionicons name="stop" size={13} color="#FF5A5A" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.viewBtn}>
                  <Text style={styles.viewBtnTxt}>보기</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 진행률 바 */}
            {item.status === 'converting' && item.progress !== undefined && (
              <View style={styles.progressSection}>
                <View style={styles.progressMeta}>
                  <Text style={styles.progressLabel}>변환 진행률</Text>
                  <Text style={styles.progressPct}>{item.progress}%</Text>
                </View>
                <View style={styles.progressBg}>
                  <View
                    style={[styles.progressFill, { width: `${item.progress}%` }]}
                  />
                </View>
                <Text style={styles.progressEta}>예상 완료 시간 · {item.eta}</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* 정렬 모달 */}
      <Modal visible={sortModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSortModal(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>정렬 기준</Text>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.sortOption}
                onPress={() => {
                  setSelectedSort(option);
                  setSortModal(false);
                }}
              >
                <Text style={[
                  styles.sortOptionTxt,
                  selectedSort === option && styles.sortOptionActive,
                ]}>
                  {option}
                </Text>
                {selectedSort === option && (
                  <Ionicons name="checkmark" size={18} color={MINT} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 하단 탭바 */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="home-outline" size={24} color="#aaa" />
          <Text style={styles.tabLabel}>홈</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="folder" size={24} color={MINT} />
          <Text style={[styles.tabLabel, styles.tabLabelActive]}>내 작업</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.recButton}>
          <Ionicons name="mic" size={26} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="chatbubble-outline" size={24} color="#aaa" />
          <Text style={styles.tabLabel}>채팅</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#aaa" />
          <Text style={styles.tabLabel}>더보기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 18,
    paddingVertical: 14, backgroundColor: '#fff',
    borderBottomWidth: 0.5, borderBottomColor: '#eee',
  },
  title: { fontSize: 17, fontWeight: '600', color: '#222' },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 16, borderWidth: 0.5, borderColor: '#ddd',
    backgroundColor: '#f8f8f8',
  },
  sortTxt: { fontSize: 12, color: '#888' },
  list: { padding: 14, gap: 8 },
  row: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 0.5, borderColor: '#e8f4f0', padding: 14,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: MINT_LIGHT,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  rowInfo: { flex: 1, minWidth: 0 },
  rowType: { fontSize: 11, color: MINT, fontWeight: '500', marginBottom: 2 },
  rowTitle: { fontSize: 13, fontWeight: '500', color: '#222' },
  rowDate: { fontSize: 11, color: '#aaa', marginTop: 2 },
  convertingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  convertingTxt: { fontSize: 11, color: '#aaa' },
  stopBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#fff3f3', borderWidth: 0.5,
    borderColor: '#ffc5c5', justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  viewBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, backgroundColor: MINT_LIGHT, flexShrink: 0,
  },
  viewBtnTxt: { fontSize: 12, color: MINT, fontWeight: '500' },
  progressSection: { marginTop: 10 },
  progressMeta: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: { fontSize: 11, color: '#aaa' },
  progressPct: { fontSize: 12, fontWeight: '500', color: MINT },
  progressBg: {
    width: '100%', height: 5, backgroundColor: '#f0f0f0',
    borderRadius: 4, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: MINT, borderRadius: 4 },
  progressEta: { fontSize: 11, color: '#aaa', marginTop: 5 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 24, paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16, fontWeight: '600', color: '#222',
    marginBottom: 12, textAlign: 'center',
  },
  sortOption: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  sortOptionTxt: { fontSize: 15, color: '#333' },
  sortOptionActive: { color: MINT, fontWeight: '500' },
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderTopWidth: 0.5, borderTopColor: '#eee',
    paddingBottom: 24, paddingTop: 10,
    alignItems: 'center', justifyContent: 'space-around',
  },
  tabItem: { alignItems: 'center', gap: 3 },
  tabLabel: { fontSize: 10, color: '#aaa' },
  tabLabelActive: { color: MINT },
  recButton: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: MINT, justifyContent: 'center',
    alignItems: 'center', marginTop: -18,
  },
});
