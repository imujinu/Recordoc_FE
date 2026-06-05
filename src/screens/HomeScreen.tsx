import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BrandMark } from '@/components/BrandMark';
import { logout } from '@/api/auth';
import { styles } from '@/styles/HomeScreen.styles';
import { Colors } from '@/styles/theme';

const recentItems: {
  id: number;
  type: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [];

const EMPTY_RECENT_GIF = require('../../assets/swim.gif');

const GRID_ITEMS = [
  { label: '녹음', icon: 'mic-outline', route: '/recording', bg: '#E6F7F3', color: '#22C9A0' },
  { label: '내 작업', icon: 'folder-outline', route: '/my-work', bg: '#EEEDFE', color: '#7F77DD' },
  { label: '그래프', icon: 'git-network-outline', route: '/graph', bg: '#E6F1FB', color: '#378ADD' },
  { label: '퀴즈', icon: 'bulb-outline', route: '/quiz', bg: '#FAECE7', color: '#D85A30' },
];

export default function HomeScreen() {
  const router = useRouter();
  const handleLogout = () => {
    logout().catch((error) => {
      console.warn('[Auth] logout failed:', error);
    });
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
        <Text style={styles.sectionTitle}>새 작업 시작</Text>
        <View style={styles.grid}>
          {GRID_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.gridItem}
              onPress={() => item.route && router.push(item.route as any)}
            >
              <View style={[styles.gridIcon, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={styles.gridLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>최근 작업</Text>
        {recentItems.length === 0 ? (
          <View style={styles.emptyBox}>
            <Image source={EMPTY_RECENT_GIF} style={styles.emptyGif} resizeMode="contain" />
            <Text style={styles.emptyTitle}>아직 작업이 없어요</Text>
            <Text style={styles.emptyText}>
              녹음을 시작하거나 파일을 업로드하면{'\n'}여기에 최근 작업이 표시돼요
            </Text>
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
