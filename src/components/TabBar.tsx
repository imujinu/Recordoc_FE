import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Colors } from '@/styles/theme';
import { useNewItemSheet } from './NewItemSheet';
import { styles } from './TabBar.styles';

const TABS = [
  { name: 'index', label: '홈', icon: 'home', iconOutline: 'home-outline' },
  { name: 'my-work', label: '내 작업', icon: 'folder', iconOutline: 'folder-outline' },
  { name: 'graph', label: '그래프', icon: 'git-network', iconOutline: 'git-network-outline' },
  { name: 'more', label: '더보기', icon: 'ellipsis-horizontal', iconOutline: 'ellipsis-horizontal' },
];

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { openSheet } = useNewItemSheet();

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
              name={(isActive ? tab.icon : tab.iconOutline) as keyof typeof Ionicons.glyphMap}
              size={22}
              color={isActive ? Colors.mint : Colors.textLight}
            />
            <Text style={isActive ? styles.tabLabelActive : styles.tabLabel}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity style={styles.recButton} onPress={openSheet}>
        <Ionicons name="add" size={28} color={Colors.white} />
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
              name={(isActive ? tab.icon : tab.iconOutline) as keyof typeof Ionicons.glyphMap}
              size={22}
              color={isActive ? Colors.mint : Colors.textLight}
            />
            <Text style={isActive ? styles.tabLabelActive : styles.tabLabel}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
