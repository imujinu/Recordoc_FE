import { StyleSheet } from 'react-native';
import { Colors } from '@/styles/theme';

export const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    paddingBottom: 24,
    paddingTop: 10,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: { alignItems: 'center', gap: 3 },
  tabLabel: { fontSize: 10, color: Colors.textLight },
  tabLabelActive: { fontSize: 10, color: Colors.mint },
  recButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.mint,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -18,
  },
});
