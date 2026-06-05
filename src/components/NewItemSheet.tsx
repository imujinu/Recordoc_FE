import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AUDIO_EXTENSIONS,
  DOCUMENT_EXTENSIONS,
  createFolder as createRemoteFolder,
  isAllowedUploadFile,
  type UploadKind,
  uploadFile,
} from '@/api/files';
import { Colors } from '@/styles/theme';

type SheetContextValue = {
  openSheet: () => void;
  closeSheet: () => void;
  workItemsRevision: number;
};

type SheetOption = {
  label: string;
  subLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  route?: string;
  action?: 'create-folder' | 'upload-audio' | 'upload-document';
  disabled?: boolean;
};

const SheetContext = createContext<SheetContextValue | null>(null);

const UPLOAD_CONFIG: Record<UploadKind, { pickerTypes: string[]; allowedExtensions: readonly string[] }> = {
  audio: {
    pickerTypes: ['audio/*'],
    allowedExtensions: AUDIO_EXTENSIONS,
  },
  document: {
    pickerTypes: [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    allowedExtensions: DOCUMENT_EXTENSIONS,
  },
};

const OPTIONS: SheetOption[] = [
  {
    label: '음성 업로드',
    subLabel: 'mp3, m4a, wav',
    icon: 'cloud-upload-outline',
    color: '#7F77DD',
    bg: '#EEEDFE',
    action: 'upload-audio',
  },
  {
    label: '문서 업로드',
    subLabel: 'pdf, ppt, pptx',
    icon: 'document-text-outline',
    color: '#D85A30',
    bg: '#FAECE7',
    action: 'upload-document',
  },
  {
    label: '새 폴더',
    subLabel: '분류 만들기',
    icon: 'folder-outline',
    color: '#888780',
    bg: '#F1EFE8',
    action: 'create-folder',
  },
  {
    label: 'Google Drive',
    subLabel: '준비 중',
    icon: 'logo-google',
    color: Colors.textLight,
    bg: '#F5F5F5',
    disabled: true,
  },
];

export function NewItemSheetProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [folderName, setFolderName] = useState('새 폴더');
  const [uploading, setUploading] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [workItemsRevision, setWorkItemsRevision] = useState(0);
  const insets = useSafeAreaInsets();

  const value = useMemo(
    () => ({
      openSheet: () => setVisible(true),
      closeSheet: () => setVisible(false),
      workItemsRevision,
    }),
    [workItemsRevision]
  );

  const pickAndUpload = async (kind: UploadKind) => {
    const config = UPLOAD_CONFIG[kind];

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: config.pickerTypes,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      if (!isAllowedUploadFile(asset.name, kind)) {
        Alert.alert('지원하지 않는 파일', `${config.allowedExtensions.join(', ')} 파일만 업로드할 수 있어요.`);
        return;
      }

      setUploading(true);
      await uploadFile(asset);
      setWorkItemsRevision((prev) => prev + 1);
      Alert.alert('업로드 완료', `${asset.name} 파일이 내 작업에 추가되었습니다.`);
    } catch (error) {
      Alert.alert('업로드 실패', error instanceof Error ? error.message : '파일 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleOption = (option: SheetOption) => {
    if (option.disabled) return;

    setVisible(false);
    if (option.action === 'create-folder') {
      setFolderName('새 폴더');
      requestAnimationFrame(() => setFolderModalVisible(true));
      return;
    }
    if (option.action === 'upload-audio' || option.action === 'upload-document') {
      void pickAndUpload(option.action === 'upload-audio' ? 'audio' : 'document');
      return;
    }
    if (option.route) {
      requestAnimationFrame(() => router.push(option.route as never));
    }
  };

  const createFolder = async () => {
    const title = folderName.trim();
    if (!title) return;

    try {
      setCreatingFolder(true);
      await createRemoteFolder(title);
      setWorkItemsRevision((prev) => prev + 1);
      setFolderModalVisible(false);
      setFolderName('새 폴더');
    } catch (error) {
      Alert.alert('폴더 생성 실패', error instanceof Error ? error.message : '폴더 생성에 실패했습니다.');
    } finally {
      setCreatingFolder(false);
    }
  };

  return (
    <SheetContext.Provider value={value}>
      {children}
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 16, 44) }]}
          >
            <View style={styles.handle} />
            <Text style={styles.title}>무엇을 추가할까요?</Text>
            <View style={styles.options}>
              {OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.label}
                  style={[styles.option, option.disabled && styles.optionDisabled]}
                  onPress={() => handleOption(option)}
                  disabled={option.disabled}
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
      <Modal visible={uploading} transparent animationType="fade">
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadCard}>
            <ActivityIndicator size="small" color={Colors.mint} />
            <Text style={styles.uploadTitle}>업로드 및 인덱싱 중...</Text>
          </View>
        </View>
      </Modal>
      <Modal
        visible={folderModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFolderModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>새 폴더를 만들까요?</Text>
            <Text style={styles.modalSubtitle}>폴더 이름을 입력해주세요</Text>

            <Text style={styles.modalLabel}>폴더 이름</Text>
            <View style={styles.inputRow}>
              <Ionicons name="folder-outline" size={16} color={Colors.mint} />
              <TextInput
                style={styles.input}
                value={folderName}
                onChangeText={setFolderName}
                selectTextOnFocus
                autoFocus
                editable={!creatingFolder}
              />
              {folderName.length > 0 && !creatingFolder && (
                <TouchableOpacity onPress={() => setFolderName('')}>
                  <Ionicons name="close" size={16} color="#bbb" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setFolderModalVisible(false)}
                disabled={creatingFolder}
              >
                <Text style={styles.cancelModalText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveModalButton, (!folderName.trim() || creatingFolder) && styles.saveModalButtonDisabled]}
                onPress={createFolder}
                disabled={!folderName.trim() || creatingFolder}
              >
                {creatingFolder ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.saveModalText}>생성</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  optionDisabled: {
    opacity: 0.45,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: 300,
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 24,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: Colors.mint,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.textDark,
    padding: 0,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelModalButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelModalText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textMid,
  },
  saveModalButton: {
    flex: 2,
    minHeight: 44,
    paddingVertical: 12,
    backgroundColor: Colors.mint,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveModalButtonDisabled: {
    opacity: 0.4,
  },
  saveModalText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.white,
  },
  uploadOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadCard: {
    minWidth: 180,
    borderRadius: 16,
    backgroundColor: Colors.white,
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 10,
  },
  uploadTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textDark,
  },
});
