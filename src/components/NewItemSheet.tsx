import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/styles/theme';

type SheetContextValue = {
  openSheet: () => void;
  closeSheet: () => void;
};

type SheetOption = {
  label: string;
  subLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  route?: string;
};

const SheetContext = createContext<SheetContextValue | null>(null);

const OPTIONS: SheetOption[] = [
  {
    label: '녹음 시작',
    subLabel: '실시간 녹음',
    icon: 'mic-outline',
    color: Colors.mint,
    bg: Colors.mintLight,
    route: '/recording',
  },
  {
    label: '파일 업로드',
    subLabel: 'mp3, m4a, wav',
    icon: 'cloud-upload-outline',
    color: '#7F77DD',
    bg: '#EEEDFE',
    route: '/upload',
  },
  {
    label: 'PDF 업로드',
    subLabel: '문서 자료',
    icon: 'document-text-outline',
    color: '#D85A30',
    bg: '#FAECE7',
    route: '/pdf',
  },
  {
    label: '새 폴더',
    subLabel: '분류 만들기',
    icon: 'folder-open-outline',
    color: '#888780',
    bg: '#F1EFE8',
    route: '/folder',
  },
  {
    label: 'Google Drive',
    subLabel: '드라이브 연동',
    icon: 'logo-google',
    color: Colors.mint,
    bg: Colors.mintLight,
  },
];

export function NewItemSheetProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  const value = useMemo(
    () => ({
      openSheet: () => setVisible(true),
      closeSheet: () => setVisible(false),
    }),
    []
  );

  const handleOption = (option: SheetOption) => {
    setVisible(false);
    if (option.route) {
      requestAnimationFrame(() => router.push(option.route as never));
    }
  };

  return (
    <SheetContext.Provider value={value}>
      {children}
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.title}>무엇을 추가할까요?</Text>
            <View style={styles.options}>
              {OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.label}
                  style={styles.option}
                  onPress={() => handleOption(option)}
                >
                  <View style={[styles.optionIcon, { backgroundColor: option.bg }]}>
                    <Ionicons name={option.icon} size={22} color={option.color} />
                  </View>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  <Text style={styles.optionSub}>{option.subLabel}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setVisible(false)}>
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SheetContext.Provider>
  );
}

export function useNewItemSheet() {
  const context = useContext(SheetContext);
  if (!context) {
    throw new Error('useNewItemSheet must be used inside NewItemSheetProvider');
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
    paddingBottom: 30,
  },
  handle: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: 14,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  option: {
    width: '31.8%',
    minHeight: 98,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#e0f0eb',
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  optionLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.textDark,
    textAlign: 'center',
  },
  optionSub: {
    fontSize: 9,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 2,
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 11,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    marginTop: 4,
  },
  cancelText: {
    fontSize: 13,
    color: Colors.textMid,
    fontWeight: '500',
  },
});
