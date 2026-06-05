import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/styles/theme';
import { useMoreSheet } from './MoreSheet';

type ActiveTab = 'home' | 'work' | 'graph' | 'more';

const ITEMS: {
  key: ActiveTab;
  label: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconSet?: 'ionicons' | 'material-community';
}[] = [
  { key: 'home', label: '홈', route: '/', icon: 'home-outline' },
  { key: 'work', label: '내 작업', route: '/my-work', icon: 'folder-outline' },
  { key: 'graph', label: '그래프', route: '/graph', icon: 'source-branch' as keyof typeof Ionicons.glyphMap, iconSet: 'material-community' },
  { key: 'more', label: '더보기', route: '/more', icon: 'ellipsis-horizontal' },
];

export function AppBottomBar({ active = 'work' }: { active?: ActiveTab }) {
  const { openMoreSheet } = useMoreSheet();

  const renderItem = (item: (typeof ITEMS)[number]) => {
    const isActive = active === item.key;
    const handlePress = () => {
      if (item.key === 'more') {
        openMoreSheet();
        return;
      }
      router.push(item.route as never);
    };

    return (
      <TouchableOpacity key={item.key} style={styles.tabItem} onPress={handlePress}>
        {item.iconSet === 'material-community' ? (
          <MaterialCommunityIcons
            name="source-branch"
            size={22}
            color={isActive ? Colors.mint : Colors.textLight}
          />
        ) : (
          <Ionicons
            name={item.icon}
            size={22}
            color={isActive ? Colors.mint : Colors.textLight}
          />
        )}
        <Text style={isActive ? styles.tabLabelActive : styles.tabLabel}>{item.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.tabBar}>
      {ITEMS.slice(0, 2).map(renderItem)}
      <TouchableOpacity style={styles.recButton} onPress={() => router.push('/recording')} accessibilityLabel="녹음 시작">
        <Ionicons name="mic" size={27} color={Colors.white} />
      </TouchableOpacity>
      {ITEMS.slice(2).map(renderItem)}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    paddingBottom: 18,
    paddingTop: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    width: 58,
    alignItems: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 9,
    color: Colors.textLight,
  },
  tabLabelActive: {
    fontSize: 9,
    color: Colors.mint,
    fontWeight: '500',
  },
  recButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -14,
  },
});
