import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { router } from 'expo-router';
import { Colors } from '@/styles/theme';
import { useMoreSheet } from './MoreSheet';
import { styles } from './TabBar.styles';

const TABS = [
  { name: 'index', label: '홈', icon: 'home-outline', iconSet: 'ionicons' },
  { name: 'my-work', label: '내 작업', icon: 'folder-outline', iconSet: 'ionicons' },
  { name: 'graph', label: '그래프', icon: 'source-branch', iconSet: 'material-community' },
  { name: 'more', label: '더보기', icon: 'ellipsis-horizontal', iconSet: 'ionicons' },
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
        {tab.iconSet === 'material-community' ? (
          <MaterialCommunityIcons
            name={tab.icon as keyof typeof MaterialCommunityIcons.glyphMap}
            size={22}
            color={isActive ? Colors.mint : Colors.textLight}
          />
        ) : (
          <Ionicons
            name={tab.icon as keyof typeof Ionicons.glyphMap}
            size={22}
            color={isActive ? Colors.mint : Colors.textLight}
          />
        )}
        <Text style={isActive ? styles.tabLabelActive : styles.tabLabel}>{tab.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.tabBar}>
      {TABS.slice(0, 2).map((tab, index) => renderTab(tab, index))}
      <TouchableOpacity style={styles.recButton} onPress={() => router.push('/recording')} accessibilityLabel="녹음 시작">
        <Ionicons name="mic" size={27} color={Colors.white} />
      </TouchableOpacity>
      {TABS.slice(2).map((tab, index) => renderTab(tab, index + 2))}
    </View>
  );
}
