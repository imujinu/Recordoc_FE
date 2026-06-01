import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

const MINT = '#22C9A0';
const MINT_LIGHT = '#E6F7F3';
const BG = '#F7FAF9';

type Language = '한국어' | '영어' | '자동 감지';
type SpeakerSplit = '사용' | '사용 안함';

type SelectedFile = {
  name: string;
  size: string;
  duration: string;
  type: string;
};

const RECENT_FILES = [
  { name: '회의녹음_0601.m4a', duration: '42분', size: '23.4MB' },
  { name: '강의녹음_알고리즘.mp3', duration: '1시간 18분', size: '41.2MB' },
];

export default function UploadScreen() {
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [language, setLanguage] = useState<Language>('한국어');
  const [speakerSplit, setSpeakerSplit] = useState<SpeakerSplit>('사용');

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const sizeInMB = asset.size
          ? `${(asset.size / (1024 * 1024)).toFixed(1)}MB`
          : '알 수 없음';
        const ext = asset.name.split('.').pop()?.toUpperCase() ?? '';

        setSelectedFile({
          name: asset.name,
          size: sizeInMB,
          duration: '측정 중...',
          type: ext,
        });
      }
    } catch {
      Alert.alert('오류', '파일을 불러오는 중 문제가 발생했어요.');
    }
  };

  const selectRecentFile = (file: typeof RECENT_FILES[0]) => {
    const ext = file.name.split('.').pop()?.toUpperCase() ?? '';
    setSelectedFile({
      name: file.name,
      size: file.size,
      duration: file.duration,
      type: ext,
    });
  };

  const handleConvert = () => {
    Alert.alert('변환 시작', `${selectedFile?.name} 변환을 시작합니다.`);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 네비게이션 */}
      <View style={styles.nav}>
        <TouchableOpacity>
          <Ionicons name="arrow-back" size={20} color="#333" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>음성파일 업로드</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!selectedFile ? (
          /* ───── B: 소스 선택 화면 ───── */
          <>
            {/* 소스 선택 카드 */}
            <TouchableOpacity style={[styles.uploadCard, styles.uploadCardPrimary]} onPress={pickFile}>
              <View style={styles.cardIcon}>
                <Ionicons name="folder-open-outline" size={22} color={MINT} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>내 파일에서 선택</Text>
                <Text style={styles.cardSub}>mp3, m4a, wav, aac · 최대 500MB</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={MINT} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.uploadCard}>
              <View style={[styles.cardIcon, styles.cardIconGray]}>
                <Ionicons name="mic-outline" size={22} color="#aaa" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>녹음 앱에서 가져오기</Text>
                <Text style={styles.cardSub}>기기의 녹음 파일을 불러와요</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.uploadCard}>
              <View style={[styles.cardIcon, styles.cardIconGray]}>
                <Ionicons name="logo-google" size={22} color="#aaa" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>Google Drive</Text>
                <Text style={styles.cardSub}>드라이브에서 직접 불러오기</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ccc" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* 최근 파일 */}
            <Text style={styles.sectionTitle}>최근 파일</Text>
            {RECENT_FILES.map((file) => (
              <TouchableOpacity
                key={file.name}
                style={styles.recentItem}
                onPress={() => selectRecentFile(file)}
              >
                <View style={styles.recentIcon}>
                  <Ionicons name="musical-note-outline" size={16} color={MINT} />
                </View>
                <View style={styles.recentInfo}>
                  <Text style={styles.recentName} numberOfLines={1}>{file.name}</Text>
                  <Text style={styles.recentMeta}>{file.size} · {file.duration}</Text>
                </View>
                <Text style={styles.recentSelect}>선택</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          /* ───── C: 파일 선택 후 화면 ───── */
          <>
            {/* 업로드된 파일 카드 */}
            <View style={styles.uploadedCard}>
              <View style={styles.uploadedTop}>
                <View style={styles.uploadedIcon}>
                  <Ionicons name="musical-note-outline" size={24} color={MINT} />
                </View>
                <View style={styles.uploadedInfo}>
                  <Text style={styles.uploadedName} numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                  <Text style={styles.uploadedMeta}>
                    {selectedFile.size} · {selectedFile.duration} · {selectedFile.type}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedFile(null)}>
                  <Text style={styles.changeBtn}>변경</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.progBg}>
                <View style={styles.progFill} />
              </View>
              <View style={styles.uploadedDone}>
                <Ionicons name="checkmark-circle" size={14} color={MINT} />
                <Text style={styles.uploadedDoneTxt}>업로드 완료</Text>
              </View>
            </View>

            {/* 변환 언어 */}
            <View style={styles.optionSection}>
              <Text style={styles.optionTitle}>변환 언어</Text>
              <View style={styles.chipRow}>
                {(['한국어', '영어', '자동 감지'] as Language[]).map((lang) => (
                  <TouchableOpacity
                    key={lang}
                    style={[styles.chip, language === lang && styles.chipSel]}
                    onPress={() => setLanguage(lang)}
                  >
                    <Text style={[styles.chipTxt, language === lang && styles.chipTxtSel]}>
                      {lang}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 화자 분리 */}
            <View style={styles.optionSection}>
              <Text style={styles.optionTitle}>화자 분리</Text>
              <View style={styles.chipRow}>
                {(['사용', '사용 안함'] as SpeakerSplit[]).map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.chip, speakerSplit === opt && styles.chipSel]}
                    onPress={() => setSpeakerSplit(opt)}
                  >
                    <Text style={[styles.chipTxt, speakerSplit === opt && styles.chipTxtSel]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 변환 시작 버튼 */}
            <TouchableOpacity style={styles.convertBtn} onPress={handleConvert}>
              <Text style={styles.convertBtnTxt}>변환 시작하기</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  nav: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: '#eee',
  },
  navTitle: { fontSize: 15, fontWeight: '600', color: '#222' },
  content: { padding: 18, gap: 10 },

  // 소스 카드
  uploadCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14,
    borderWidth: 0.5, borderColor: '#eee', backgroundColor: BG,
  },
  uploadCardPrimary: { borderWidth: 1.5, borderColor: MINT },
  cardIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: MINT_LIGHT,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  cardIconGray: { backgroundColor: '#f5f5f5' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 13, fontWeight: '500', color: '#222', marginBottom: 2 },
  cardSub: { fontSize: 11, color: '#aaa' },

  // 최근 파일
  divider: { height: 0.5, backgroundColor: '#eee', marginVertical: 4 },
  sectionTitle: { fontSize: 12, fontWeight: '500', color: '#888', marginBottom: 4 },
  recentItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#f5f5f5',
  },
  recentIcon: {
    width: 34, height: 34, borderRadius: 9,
    backgroundColor: MINT_LIGHT,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  recentInfo: { flex: 1, minWidth: 0 },
  recentName: { fontSize: 12, fontWeight: '500', color: '#222' },
  recentMeta: { fontSize: 11, color: '#aaa', marginTop: 1 },
  recentSelect: { fontSize: 12, color: MINT, fontWeight: '500' },

  // 업로드 완료 카드
  uploadedCard: {
    borderRadius: 14, borderWidth: 1.5, borderColor: MINT,
    backgroundColor: BG, padding: 14, marginBottom: 6,
  },
  uploadedTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  uploadedIcon: {
    width: 42, height: 48, borderRadius: 8,
    backgroundColor: MINT_LIGHT, borderWidth: 0.5, borderColor: '#b8e8d8',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  uploadedInfo: { flex: 1, minWidth: 0 },
  uploadedName: { fontSize: 13, fontWeight: '500', color: MINT },
  uploadedMeta: { fontSize: 11, color: '#5DCAA5', marginTop: 2 },
  changeBtn: { fontSize: 12, color: '#aaa' },
  progBg: { height: 4, backgroundColor: '#d0f0e8', borderRadius: 4, marginBottom: 6 },
  progFill: { height: '100%', width: '100%', backgroundColor: MINT, borderRadius: 4 },
  uploadedDone: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  uploadedDoneTxt: { fontSize: 12, color: MINT, fontWeight: '500' },

  // 옵션
  optionSection: { marginBottom: 6 },
  optionTitle: { fontSize: 12, fontWeight: '500', color: '#888', marginBottom: 8 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 10, borderWidth: 0.5, borderColor: '#ddd',
    backgroundColor: BG,
  },
  chipSel: { borderColor: MINT, backgroundColor: MINT_LIGHT },
  chipTxt: { fontSize: 12, color: '#888' },
  chipTxtSel: { color: MINT, fontWeight: '500' },

  // 변환 버튼
  convertBtn: {
    backgroundColor: MINT, paddingVertical: 14,
    borderRadius: 12, alignItems: 'center', marginTop: 8,
  },
  convertBtnTxt: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
