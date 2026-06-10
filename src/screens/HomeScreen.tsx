import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { BrandMark } from '@/components/BrandMark';
import { logout } from '@/api/auth';
import {
  getProcessStatus,
  inferFileKind,
  listWorkItems,
  type FileKind,
  type FileWorkItem,
} from '@/api/files';
import { styles } from '@/styles/HomeScreen.styles';
import { Colors } from '@/styles/theme';

type ContentStatus = 'uploaded' | 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'canceled';
type IndexStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'canceled';

interface RecentWorkItem {
  id: string;
  title: string;
  date: string;
  content_status: ContentStatus;
  index_status: IndexStatus;
  status: ReturnType<typeof getProcessStatus>;
  kind: FileKind;
}

interface BadgeInfo {
  label: string;
  bg: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  showProgress?: boolean;
  showRetry?: boolean;
}

interface StatusDisplay {
  content: BadgeInfo;
  index?: BadgeInfo;
}

const EMPTY_RECENT_GIF = require('../../assets/swim.gif');

const GRID_ITEMS = [
  { label: '녹음', icon: 'mic-outline', route: '/recording', bg: '#E6F7F3', color: '#22C9A0' },
  { label: '내 작업', icon: 'folder-outline', route: '/my-work', bg: '#EEEDFE', color: '#7F77DD' },
  { label: '그래프', icon: 'git-network-outline', route: '/graph', bg: '#E6F1FB', color: '#378ADD' },
  { label: '퀴즈', icon: 'bulb-outline', route: '/quiz', bg: '#FAECE7', color: '#D85A30' },
] as const;

function normalizeContentStatus(value?: string | null): ContentStatus {
  const status = value?.trim().toLowerCase();
  if (
    status === 'pending' ||
    status === 'processing' ||
    status === 'completed' ||
    status === 'failed' ||
    status === 'cancelled' ||
    status === 'canceled'
  ) {
    return status;
  }
  return 'uploaded';
}

function normalizeIndexStatus(value?: string | null): IndexStatus {
  const status = value?.trim().toLowerCase();
  if (
    status === 'processing' ||
    status === 'completed' ||
    status === 'failed' ||
    status === 'cancelled' ||
    status === 'canceled'
  ) {
    return status;
  }
  return 'pending';
}

function getDisplayTitle(file: FileWorkItem): string {
  return file.title?.trim() || file.original_filename?.trim() || '제목 없는 파일';
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
} {
  if (kind === 'audio') {
    return { icon: 'mic-outline', color: Colors.mint, bg: Colors.mintLight };
  }
  if (kind === 'pdf') {
    return { icon: 'document-text-outline', color: '#D85A30', bg: '#FAECE7' };
  }
  if (kind === 'ppt') {
    return { icon: 'easel-outline', color: '#7F77DD', bg: '#EEEDFE' };
  }
  return { icon: 'document-outline', color: '#888780', bg: '#F1EFE8' };
}

function toRecentWorkItem(file: FileWorkItem): RecentWorkItem {
  return {
    id: file.transcript_id,
    title: getDisplayTitle(file),
    date: formatDate(file.created_at),
    content_status: normalizeContentStatus(file.content_status ?? file.status),
    index_status: normalizeIndexStatus(file.index_status),
    status: getProcessStatus(file),
    kind: inferFileKind(file),
  };
}

function getStatusDisplay(item: RecentWorkItem): StatusDisplay {
  const { content_status, index_status } = item;

  if (content_status === 'uploaded') {
    return { content: { label: '업로드됨', bg: '#F1EFE8', color: '#444441', icon: 'cloud-upload-outline' } };
  }
  if (content_status === 'cancelled' || content_status === 'canceled') {
    return { content: { label: '취소됨', bg: '#F1EFE8', color: '#444441', icon: 'close-outline' } };
  }
  if (content_status === 'failed') {
    return { content: { label: '변환 실패', bg: '#FCEBEB', color: '#791F1F', icon: 'alert-circle-outline', showRetry: true } };
  }
  if (content_status === 'pending') {
    return { content: { label: '변환 대기', bg: '#F1EFE8', color: '#444441', icon: 'time-outline' } };
  }
  if (content_status === 'processing') {
    return { content: { label: '변환 중', bg: '#E6F1FB', color: '#0C447C', icon: 'sync-outline', showProgress: true } };
  }

  const contentBadge: BadgeInfo = { label: '변환 완료', bg: '#E1F5EE', color: '#085041', icon: 'checkmark-outline' };

  switch (index_status) {
    case 'pending':
      return { content: contentBadge, index: { label: '요약 대기', bg: '#F1EFE8', color: '#444441', icon: 'time-outline' } };
    case 'processing':
      return { content: contentBadge, index: { label: '요약 생성 중', bg: '#EEEDFE', color: '#3C3489', icon: 'sync-outline', showProgress: true } };
    case 'failed':
      return { content: contentBadge, index: { label: '요약 실패', bg: '#FAEEDA', color: '#633806', icon: 'warning-outline', showRetry: true } };
    case 'cancelled':
    case 'canceled':
      return { content: contentBadge, index: { label: '요약 취소', bg: '#F1EFE8', color: '#444441', icon: 'close-outline' } };
    case 'completed':
      return { content: contentBadge, index: { label: '요약 완료', bg: '#EEEDFE', color: '#3C3489', icon: 'document-text-outline' } };
  }
}

function Badge({ info }: { info: BadgeInfo }) {
  return (
    <View style={[styles.badge, { backgroundColor: info.bg }]}>
      <Ionicons name={info.icon} size={11} color={info.color} />
      <Text style={[styles.badgeText, { color: info.color }]}>{info.label}</Text>
    </View>
  );
}

function RecentMainCard({ item, onPress }: { item: RecentWorkItem; onPress: () => void }) {
  const display = getStatusDisplay(item);
  const kindMeta = getKindMeta(item.kind);
  const isFailed = item.content_status === 'failed';
  const iconBg = isFailed ? '#FCEBEB' : item.content_status === 'processing' ? '#E6F1FB' : kindMeta.bg;
  const iconColor = isFailed ? '#A32D2D' : item.content_status === 'processing' ? '#185FA5' : kindMeta.color;

  return (
    <TouchableOpacity onPress={onPress} style={styles.mainCard}>
      <View style={[styles.mainCardIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={kindMeta.icon} size={20} color={iconColor} />
      </View>
      <View style={styles.mainCardBody}>
        <Text style={styles.mainCardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.mainCardDate}>{item.date}</Text>
        <View style={styles.mainCardBadgeRow}>
          <Badge info={display.content} />
          {display.index && <Badge info={display.index} />}
        </View>
        {display.content.showProgress && (
          <View style={styles.mainCardProgress}>
            <View style={{ height: 3, width: '60%', backgroundColor: '#378ADD', borderRadius: 2 }} />
          </View>
        )}
        {display.index?.showProgress && (
          <View style={styles.mainCardProgress}>
            <View style={{ height: 3, width: '40%', backgroundColor: '#7F77DD', borderRadius: 2 }} />
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textLight} style={styles.mainCardChevron} />
    </TouchableOpacity>
  );
}

function RecentSubCard({ item, onPress }: { item: RecentWorkItem; onPress: () => void }) {
  const display = getStatusDisplay(item);
  const kindMeta = getKindMeta(item.kind);

  return (
    <TouchableOpacity onPress={onPress} style={styles.subCard}>
      <View style={[styles.subCardIcon, { backgroundColor: kindMeta.bg }]}>
        <Ionicons name={kindMeta.icon} size={13} color={kindMeta.color} />
      </View>
      <View style={styles.subCardBody}>
        <Text style={styles.subCardTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.subCardBadge}>
          <Badge info={display.index ?? display.content} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [recentFiles, setRecentFiles] = useState<FileWorkItem[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState<string | null>(null);

  const loadRecentFiles = useCallback(async () => {
    setRecentLoading(true);
    setRecentError(null);
    try {
      const items = await listWorkItems();
      setRecentFiles(items.filter((item): item is FileWorkItem => item.type === 'file').slice(0, 3));
    } catch (error) {
      setRecentError(error instanceof Error ? error.message : '최근 작업을 불러오지 못했습니다.');
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadRecentFiles();
    }, [loadRecentFiles])
  );

  const recentItems = useMemo(() => recentFiles.map(toRecentWorkItem), [recentFiles]);
  const mainItem = recentItems[0];
  const subItems = recentItems.slice(1);

  const handleLogout = () => {
    logout().catch((error) => {
      console.warn('[Auth] logout failed:', error);
    });
  };

  const openRecentItem = (item: RecentWorkItem) => {
    const params = {
      transcriptId: item.id,
      status: item.status,
      title: item.title,
    };

    if (item.kind === 'audio') {
      router.push({ pathname: '/detail', params });
      return;
    }

    router.push({ pathname: '/pdf', params });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BrandMark size="compact" />
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={15} color="#D85A30" />
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarBtn}>
            <Ionicons name="person-outline" size={20} color={Colors.mint} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.sectionTitle, { marginBottom: 12, marginTop: 8 }]}>새 작업 시작</Text>
        <View style={styles.grid}>
          {GRID_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.gridItem}
              onPress={() => router.push(item.route as never)}
            >
              <View style={[styles.gridIcon, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={styles.gridLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>최근 작업</Text>
          {recentItems.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/my-work' as never)}>
              <Text style={styles.recentHeaderMore}>전체 보기</Text>
            </TouchableOpacity>
          )}
        </View>

        {recentLoading ? (
          <View style={styles.emptyBox}>
            <ActivityIndicator size="small" color={Colors.mint} />
            <Text style={styles.emptyTitle}>최근 작업을 불러오는 중입니다</Text>
          </View>
        ) : recentError ? (
          <View style={styles.emptyBox}>
            <Ionicons name="alert-circle-outline" size={30} color="#D85A30" />
            <Text style={styles.emptyTitle}>최근 작업을 불러오지 못했습니다</Text>
            <Text style={styles.emptyText}>{recentError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadRecentFiles}>
              <Text style={styles.retryText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : recentItems.length === 0 ? (
          <View style={styles.emptyBox}>
            <Image source={EMPTY_RECENT_GIF} style={styles.emptyGif} resizeMode="contain" />
            <Text style={styles.emptyTitle}>아직 작업이 없어요</Text>
            <Text style={styles.emptyText}>
              녹음을 시작하거나 파일을 업로드하면{'\n'}여기에 최근 작업이 표시돼요
            </Text>
          </View>
        ) : (
          <View style={styles.recentList}>
            <RecentMainCard item={mainItem} onPress={() => openRecentItem(mainItem)} />
            {subItems.length > 0 && (
              <View style={styles.subCardRow}>
                {subItems.slice(0, 2).map((item) => (
                  <RecentSubCard
                    key={item.id}
                    item={item}
                    onPress={() => openRecentItem(item)}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
