import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/styles/theme';
import {
  AUDIO_EXTENSIONS,
  DOCUMENT_EXTENSIONS,
  getFileExtension,
  inferMimeType,
  isAllowedUploadFile,
  type FileUploadResponse,
  type UploadKind,
  uploadFile,
} from '@/api/files';

type SelectedFile = {
  asset: DocumentPicker.DocumentPickerAsset;
  extension: string;
  sizeText: string;
};

type UploadModeConfig = {
  title: string;
  cardTitle: string;
  cardSub: string;
  selectedLabel: string;
  completeTitle: string;
  pickerTypes: string[];
  icon: keyof typeof Ionicons.glyphMap;
};

const MODE_CONFIG: Record<UploadKind, UploadModeConfig> = {
  audio: {
    title: '음성 파일 업로드',
    cardTitle: '음성 파일 선택',
    cardSub: 'mp3, m4a, wav, webm',
    selectedLabel: '선택한 음성 파일',
    completeTitle: '전사와 인덱싱이 완료되었습니다',
    pickerTypes: ['audio/*'],
    icon: 'musical-note-outline',
  },
  document: {
    title: '문서 업로드',
    cardTitle: '문서 파일 선택',
    cardSub: 'pdf, ppt, pptx',
    selectedLabel: '선택한 문서 파일',
    completeTitle: '텍스트 추출과 인덱싱이 완료되었습니다',
    pickerTypes: [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    icon: 'document-text-outline',
  },
};

function normalizeKind(value: unknown): UploadKind {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'document' ? 'document' : 'audio';
}

function formatSize(size?: number): string {
  if (!size) return '알 수 없음';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))}KB`;
  return `${(size / (1024 * 1024)).toFixed(1)}MB`;
}

function statusLabel(status?: string): string {
  if (!status) return '완료';
  if (status === 'completed' || status === 'done') return '완료';
  if (status === 'failed') return '실패';
  if (status === 'processing') return '처리 중';
  return status;
}

function errorTitle(error: unknown): string {
  return error instanceof Error ? error.message : '파일 업로드에 실패했습니다.';
}

export default function UploadScreen() {
  const params = useLocalSearchParams();
  const kind = normalizeKind(params.kind);
  const config = MODE_CONFIG[kind];
  const allowedExtensions = useMemo(
    () => (kind === 'audio' ? AUDIO_EXTENSIONS : DOCUMENT_EXTENSIONS),
    [kind]
  );
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<FileUploadResponse | null>(null);

  useEffect(() => {
    setSelectedFile(null);
    setUploadResult(null);
    setUploading(false);
  }, [kind]);

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: config.pickerTypes,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      if (!isAllowedUploadFile(asset.name, kind)) {
        Alert.alert('지원하지 않는 파일', `${allowedExtensions.join(', ')} 파일만 업로드할 수 있어요.`);
        return;
      }

      setSelectedFile({
        asset,
        extension: getFileExtension(asset.name).toUpperCase(),
        sizeText: formatSize(asset.size),
      });
      setUploadResult(null);
    } catch {
      Alert.alert('오류', '파일을 불러오는 중 문제가 발생했어요.');
    }
  };

  const submitUpload = async () => {
    if (!selectedFile || uploading) return;

    setUploading(true);
    try {
      const result = await uploadFile(selectedFile.asset);
      setUploadResult(result);
    } catch (error) {
      Alert.alert('업로드 실패', errorTitle(error));
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.nav}>
        <TouchableOpacity style={styles.navButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>{config.title}</Text>
        <View style={styles.navButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!selectedFile ? (
          <TouchableOpacity style={[styles.uploadCard, styles.uploadCardPrimary]} onPress={pickFile}>
            <View style={styles.cardIcon}>
              <Ionicons name="folder-open-outline" size={22} color={Colors.mint} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{config.cardTitle}</Text>
              <Text style={styles.cardSub}>{config.cardSub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.mint} />
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.uploadedCard}>
              <View style={styles.uploadedTop}>
                <View style={styles.uploadedIcon}>
                  <Ionicons name={config.icon} size={24} color={Colors.mint} />
                </View>
                <View style={styles.uploadedInfo}>
                  <Text style={styles.selectedLabel}>{config.selectedLabel}</Text>
                  <Text style={styles.uploadedName} numberOfLines={1}>
                    {selectedFile.asset.name}
                  </Text>
                  <Text style={styles.uploadedMeta}>
                    {selectedFile.sizeText} · {selectedFile.extension || inferMimeType(selectedFile.asset.name)}
                  </Text>
                </View>
                {!uploadResult && (
                  <TouchableOpacity onPress={() => setSelectedFile(null)} disabled={uploading}>
                    <Text style={[styles.changeBtn, uploading && styles.textDisabled]}>변경</Text>
                  </TouchableOpacity>
                )}
              </View>

              {uploading ? (
                <View style={styles.processingRow}>
                  <ActivityIndicator size="small" color={Colors.mint} />
                  <Text style={styles.processingText}>업로드 및 인덱싱 중...</Text>
                </View>
              ) : uploadResult ? (
                <View style={styles.resultBox}>
                  <View style={styles.resultTitleRow}>
                    <Ionicons name="checkmark-circle" size={15} color={Colors.mint} />
                    <Text style={styles.resultTitle}>{config.completeTitle}</Text>
                  </View>
                  <Text style={styles.resultMeta} numberOfLines={1}>
                    URI {uploadResult.file_uri}
                  </Text>
                  <Text style={styles.resultMeta}>
                    상태 {statusLabel(uploadResult.status)} · ID {uploadResult.transcript_id}
                  </Text>
                </View>
              ) : (
                <View style={styles.readyRow}>
                  <Ionicons name="checkmark-circle" size={14} color={Colors.mint} />
                  <Text style={styles.readyText}>업로드할 준비가 되었어요</Text>
                </View>
              )}
            </View>

            {uploadResult ? (
              <TouchableOpacity style={styles.convertBtn} onPress={() => router.replace('/my-work' as never)}>
                <Text style={styles.convertBtnTxt}>내 작업에서 보기</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.convertBtn, uploading && styles.convertBtnDisabled]}
                onPress={submitUpload}
                disabled={uploading}
              >
                <Text style={styles.convertBtnTxt}>{uploading ? '처리 중...' : '업로드 시작하기'}</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  navButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: { fontSize: 15, fontWeight: '600', color: Colors.textDark },
  content: { padding: 18, gap: 10 },
  uploadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  uploadCardPrimary: { borderWidth: 1.5, borderColor: Colors.mint },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.mintLight,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 13, fontWeight: '500', color: Colors.textDark, marginBottom: 2 },
  cardSub: { fontSize: 11, color: Colors.textLight },
  uploadedCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.mint,
    backgroundColor: Colors.bg,
    padding: 14,
    marginBottom: 6,
  },
  uploadedTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  uploadedIcon: {
    width: 42,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.mintLight,
    borderWidth: 0.5,
    borderColor: '#b8e8d8',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  uploadedInfo: { flex: 1, minWidth: 0 },
  selectedLabel: { fontSize: 11, color: Colors.textLight, marginBottom: 2 },
  uploadedName: { fontSize: 13, fontWeight: '500', color: Colors.mint },
  uploadedMeta: { fontSize: 11, color: '#5DCAA5', marginTop: 2 },
  changeBtn: { fontSize: 12, color: Colors.textLight },
  textDisabled: { opacity: 0.4 },
  readyRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  readyText: { fontSize: 12, color: Colors.mint, fontWeight: '500' },
  processingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  processingText: { fontSize: 12, color: Colors.mint, fontWeight: '500' },
  resultBox: {
    borderRadius: 10,
    backgroundColor: Colors.white,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
    padding: 10,
    gap: 4,
  },
  resultTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  resultTitle: { fontSize: 12, color: Colors.mint, fontWeight: '600' },
  resultMeta: { fontSize: 10, color: Colors.textMid },
  convertBtn: {
    backgroundColor: Colors.mint,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  convertBtnDisabled: {
    opacity: 0.7,
  },
  convertBtnTxt: { fontSize: 14, fontWeight: '600', color: Colors.white },
});
