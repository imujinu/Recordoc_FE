import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { router } from 'expo-router';
import { Colors } from '@/styles/theme';
import { useMoreSheet } from './MoreSheet';
import { styles } from './TabBar.styles';

const TABS = [
  { name: 'index', label: '홈', icon: 'home', iconOutline: 'home-outline' },
  { name: 'my-work', label: '내 작업', icon: 'folder', iconOutline: 'folder-outline' },
  { name: 'graph', label: '그래프', icon: 'git-network', iconOutline: 'git-network-outline' },
  { name: 'more', label: '더보기', icon: 'ellipsis-horizontal', iconOutline: 'ellipsis-horizontal' },
];

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { openMoreSheet } = useMoreSheet();

  const renderTab = (tab: (typeof TABS)[number], index: number) => {
    const isActive = state.index === index;
    const handlePress = () => {
      if (tab.name === 'more') {
        openMoreSheet();
        return;
      }
      navigation.navigate(tab.name);
    };

    return (
      <TouchableOpacity key={tab.name} style={styles.tabItem} onPress={handlePress}>
        <Ionicons
          name={(isActive ? tab.icon : tab.iconOutline) as keyof typeof Ionicons.glyphMap}
          size={22}
          color={isActive ? Colors.mint : Colors.textLight}
        />
        <Text style={isActive ? styles.tabLabelActive : styles.tabLabel}>{tab.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.tabBar}>
      {TABS.slice(0, 2).map((tab, index) => renderTab(tab, index))}
      <TouchableOpacity style={styles.recButton} onPress={() => router.push('/recording')}>
        <Ionicons name="mic" size={26} color={Colors.white} />
      </TouchableOpacity>
      {TABS.slice(2).map((tab, index) => renderTab(tab, index + 2))}
    </View>
  );
}
