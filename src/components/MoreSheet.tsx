import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/styles/theme';

type MoreSheetContextValue = {
  openMoreSheet: () => void;
  closeMoreSheet: () => void;
};

const MoreSheetContext = createContext<MoreSheetContextValue | null>(null);

const MENU_ITEMS: {
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  color: string;
  route?: string;
}[] = [
  {
    label: '퀴즈',
    description: '노드 기반 학습 퀴즈',
    icon: 'bulb-outline',
    bg: Colors.mintLight,
    color: Colors.mint,
    route: '/quiz',
  },
  {
    label: '설정',
    description: '알림, 계정, 앱 설정',
    icon: 'settings-outline',
    bg: '#EEEDFE',
    color: '#7F77DD',
  },
  {
    label: '도움말',
    description: '사용 가이드',
    icon: 'help-circle-outline',
    bg: '#FAECE7',
    color: '#D85A30',
  },
];

export function MoreSheetProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  const value = useMemo(
    () => ({
      openMoreSheet: () => setVisible(true),
      closeMoreSheet: () => setVisible(false),
    }),
    []
  );

  const selectMenu = (route?: string) => {
    setVisible(false);
    if (route) {
      requestAnimationFrame(() => router.push(route as never));
    }
  };

  return (
    <MoreSheetContext.Provider value={value}>
      {children}
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.handle} />
            {MENU_ITEMS.map((item) => (
              <TouchableOpacity key={item.label} style={styles.menuItem} onPress={() => selectMenu(item.route)}>
                <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon} size={21} color={item.color} />
                </View>
                <View style={styles.menuText}>
                  <Text style={styles.menuName}>{item.label}</Text>
                  <Text style={styles.menuDescription}>{item.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </MoreSheetContext.Provider>
  );
}

export function useMoreSheet() {
  const context = useContext(MoreSheetContext);
  if (!context) {
    throw new Error('useMoreSheet must be used inside MoreSheetProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  handle: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
    marginBottom: 14,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f5f5f5',
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  menuText: {
    flex: 1,
  },
  menuName: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textDark,
  },
  menuDescription: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 1,
  },
});
