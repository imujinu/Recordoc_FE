import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BrandMark } from '@/components/BrandMark';
import { styles } from '@/styles/HomeScreen.styles';
import { Colors } from '@/styles/theme';

const recentItems = [
  { id: 1, type: '녹음', title: '3월 마케팅 팀 회의록', icon: 'mic-outline' },
  { id: 2, type: 'PDF', title: '알고리즘 강의 요약본', icon: 'document-text-outline' },
  { id: 3, type: '음성파일', title: '기획 미팅 녹취본', icon: 'folder-outline' },
];

const GRID_ITEMS = [
  { label: '녹음', icon: 'mic-outline', route: '/recording' },
  { label: '음성파일', icon: 'folder-outline', route: null },
  { label: 'PDF', icon: 'document-text-outline', route: null },
  { label: '채팅 (AI)', icon: 'chatbubble-outline', route: null },
];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BrandMark size="compact" />
        <TouchableOpacity style={styles.avatarBtn}>
          <Ionicons name="person-outline" size={20} color={Colors.mint} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>새 작업 시작</Text>
        <View style={styles.grid}>
          {GRID_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.gridItem}
              onPress={() => item.route && router.push(item.route as any)}
            >
              <View style={styles.gridIcon}>
                <Ionicons name={item.icon as any} size={22} color={Colors.mint} />
              </View>
              <Text style={styles.gridLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>최근 작업</Text>
        {recentItems.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>아직 작업한 내역이 없습니다{'\n'}(ㅠ^ㅠ)</Text>
          </View>
        ) : (
          recentItems.map((item) => (
            <TouchableOpacity key={item.id} style={styles.workItem}>
              <View style={styles.workIcon}>
                <Ionicons name={item.icon as any} size={22} color={Colors.mint} />
              </View>
              <View>
                <Text style={styles.workType}>{item.type}</Text>
                <Text style={styles.workTitle}>{item.title}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
