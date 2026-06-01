import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { styles } from './TabBar.styles';
import { Colors } from '@/styles/theme';

const TABS = [
  { name: 'index', label: '홈', icon: 'home', iconOutline: 'home-outline' },
  { name: 'my-work', label: '내 작업', icon: 'layers', iconOutline: 'layers-outline' },
  { name: 'chat', label: '업로드', icon: 'cloud-upload', iconOutline: 'cloud-upload-outline' },
  { name: 'more', label: '더보기', icon: 'ellipsis-horizontal', iconOutline: 'ellipsis-horizontal' },
];

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();

  return (
    <View style={styles.tabBar}>
      {TABS.slice(0, 2).map((tab, index) => {
        const isActive = state.index === index;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            onPress={() => navigation.navigate(tab.name)}
          >
            <Ionicons
              name={(isActive ? tab.icon : tab.iconOutline) as any}
              size={24}
              color={isActive ? Colors.mint : Colors.textLight}
            />
            <Text style={isActive ? styles.tabLabelActive : styles.tabLabel}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}

      {/* 중앙 mic FAB — 탭 라우트 아님, RecordingScreen 모달 진입점 */}
      <TouchableOpacity style={styles.recButton} onPress={() => router.push('/recording')}>
        <Ionicons name="mic" size={26} color={Colors.white} />
      </TouchableOpacity>

      {TABS.slice(2).map((tab, index) => {
        const actualIndex = index + 2;
        const isActive = state.index === actualIndex;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            onPress={() => navigation.navigate(tab.name)}
          >
            <Ionicons
              name={(isActive ? tab.icon : tab.iconOutline) as any}
              size={24}
              color={isActive ? Colors.mint : Colors.textLight}
            />
            <Text style={isActive ? styles.tabLabelActive : styles.tabLabel}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
