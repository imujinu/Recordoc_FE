import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { login } from '@/api/auth';
import { BrandMark } from '@/components/BrandMark';

const MINT = '#22C9A0';
const MINT_LIGHT = '#E6F7F3';

export default function LandingScreen() {

  const handleEmail = () => {
    router.push('/login');
  };

  const handleTestLogin = async () => {
    try {
      await login('test@example.com', '1234');
      router.replace('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '로그인에 실패했습니다.';
      Alert.alert('로그인 실패', msg);
    }
  };

  const handleKakao = () => {
    Alert.alert('카카오 로그인', '카카오 로그인을 시작합니다.');
    // TODO: @react-native-seoul/kakao-login 연동
  };

  const handleNaver = () => {
    Alert.alert('네이버 로그인', '네이버 로그인을 시작합니다.');
    // TODO: @react-native-seoul/naver-login 연동
  };

  const handleGoogle = () => {
    Alert.alert('구글 로그인', '구글 로그인을 시작합니다.');
    // TODO: @react-native-google-signin/google-signin 연동
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        <View style={styles.brandHeader}>
          <BrandMark />
        </View>

        {/* 일러스트 */}
        <View style={styles.illust}>
          <Ionicons name="mic" size={52} color={MINT} />
        </View>

        {/* 헤드라인 */}
        <Text style={styles.headline}>
          말하는 순간,{'\n'}
          <Text style={styles.headlineAccent}>텍스트가 됩니다</Text>
        </Text>
        <Text style={styles.subtext}>회원가입 시 무료로 이용 가능합니다</Text>

        {/* 버튼 영역 */}
        <View style={styles.btnArea}>

          {/* 테스트 계정 로그인 */}
          <TouchableOpacity style={styles.btnTest} onPress={handleTestLogin}>
            <Ionicons name="flask-outline" size={18} color="#aaa" />
            <Text style={styles.btnTestTxt}>테스트 계정으로 로그인</Text>
          </TouchableOpacity>

          {/* 이메일로 시작하기 */}
          <TouchableOpacity style={styles.btnEmail} onPress={handleEmail}>
            <Ionicons name="mail-outline" size={18} color="#222" />
            <Text style={styles.btnEmailTxt}>이메일로 시작하기</Text>
          </TouchableOpacity>

          {/* 구분선 */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerTxt}>또는</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* 소셜 로그인 */}
          <View style={styles.socialRow}>
            <TouchableOpacity style={[styles.socialBtn, styles.kakaoBtn]} onPress={handleKakao}>
              <Text style={styles.kakaoTxt}>K</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialBtn, styles.naverBtn]} onPress={handleNaver}>
              <Text style={styles.naverTxt}>N</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialBtn, styles.googleBtn]} onPress={handleGoogle}>
              <Text style={styles.googleTxt}>G</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 무료 배지 */}
        <View style={styles.freeBadge}>
          <Text style={styles.freeTxt}>✦ 와브는 무료로 이용 가능합니다</Text>
        </View>

        {/* 문제 링크 */}
        <TouchableOpacity>
          <Text style={styles.troubleTxt}>로그인에 문제가 있으신가요?</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: {
    flex: 1, alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40,
  },
  brandHeader: {
    alignSelf: 'stretch',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  illust: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: MINT_LIGHT,
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  headline: {
    fontSize: 24, fontWeight: '700', color: '#222',
    textAlign: 'center', lineHeight: 34, marginBottom: 8,
  },
  headlineAccent: { color: MINT },
  subtext: { fontSize: 13, color: '#aaa', marginBottom: 36 },

  btnArea: { width: '100%', gap: 10, marginBottom: 24 },

  btnTest: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#f5f5f5',
  },
  btnTestTxt: { fontSize: 14, fontWeight: '500', color: '#888' },

  btnEmail: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#ddd',
  },
  btnEmailTxt: { fontSize: 14, fontWeight: '600', color: '#222' },

  dividerRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginVertical: 4,
  },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: '#eee' },
  dividerTxt: { fontSize: 12, color: '#ccc' },

  socialRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 14,
  },
  socialBtn: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
  },
  kakaoBtn: { backgroundColor: '#FEE500' },
  naverBtn: { backgroundColor: '#03C75A' },
  googleBtn: { backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#ddd' },
  kakaoTxt: { fontSize: 20, fontWeight: '700', color: '#3C1E1E' },
  naverTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
  googleTxt: { fontSize: 18, fontWeight: '700', color: '#4285F4' },

  freeBadge: {
    backgroundColor: MINT_LIGHT, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 6, marginBottom: 16,
  },
  freeTxt: { fontSize: 12, color: MINT, fontWeight: '500' },
  troubleTxt: { fontSize: 12, color: '#ccc' },
});
