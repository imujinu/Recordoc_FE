import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { login } from '@/api/auth';
import { oauthProviders, type OAuthProviderId } from '@/auth/oauth';
import { BrandMark } from '@/components/BrandMark';
import { useOAuthLogin } from '@/hooks/useOAuthLogin';

const MINT = '#22C9A0';
const MINT_LIGHT = '#E6F7F3';

export default function LandingScreen() {
  const { loadingByProvider, loginWithProvider } = useOAuthLogin();

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.brandHeader}>
          <BrandMark />
        </View>

        <View style={styles.illust}>
          <Ionicons name="mic" size={52} color={MINT} />
        </View>

        <Text style={styles.headline}>
          말하는 시간,{'\n'}
          <Text style={styles.headlineAccent}>텍스트가 됩니다</Text>
        </Text>
        <Text style={styles.subtext}>회원가입 후 무료로 이용 가능합니다</Text>

        <View style={styles.btnArea}>
          <TouchableOpacity style={styles.btnTest} onPress={handleTestLogin}>
            <Ionicons name="flask-outline" size={18} color="#aaa" />
            <Text style={styles.btnTestTxt}>테스트 계정으로 로그인</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnEmail} onPress={handleEmail}>
            <Ionicons name="mail-outline" size={18} color="#222" />
            <Text style={styles.btnEmailTxt}>이메일로 시작하기</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerTxt}>또는</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            {oauthProviders.map((provider) => {
              const loading = Boolean(loadingByProvider[provider.id]);
              return (
                <TouchableOpacity
                  key={provider.id}
                  style={[styles.socialBtn, getSocialButtonStyle(provider.id), loading && styles.socialBtnDisabled]}
                  onPress={() => loginWithProvider(provider.id)}
                  disabled={loading}
                  accessibilityLabel={provider.buttonText}
                >
                  <Text style={getSocialTextStyle(provider.id)}>{loading ? '...' : provider.shortLabel}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.freeBadge}>
          <Text style={styles.freeTxt}>웨이브는 무료로 이용 가능합니다</Text>
        </View>

        <TouchableOpacity>
          <Text style={styles.troubleTxt}>로그인에 문제가 있으신가요?</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function getSocialButtonStyle(providerId: OAuthProviderId) {
  if (providerId === 'kakao') return styles.kakaoBtn;
  if (providerId === 'naver') return styles.naverBtn;
  return styles.googleBtn;
}

function getSocialTextStyle(providerId: OAuthProviderId) {
  if (providerId === 'kakao') return styles.kakaoTxt;
  if (providerId === 'naver') return styles.naverTxt;
  return styles.googleTxt;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  brandHeader: {
    alignSelf: 'stretch',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  illust: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: MINT_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  headline: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 8,
  },
  headlineAccent: { color: MINT },
  subtext: { fontSize: 13, color: '#aaa', marginBottom: 36 },
  btnArea: { width: '100%', gap: 10, marginBottom: 24 },
  btnTest: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#f5f5f5',
  },
  btnTestTxt: { fontSize: 14, fontWeight: '500', color: '#888' },
  btnEmail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  btnEmailTxt: { fontSize: 14, fontWeight: '600', color: '#222' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: '#eee' },
  dividerTxt: { fontSize: 12, color: '#ccc' },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
  },
  socialBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialBtnDisabled: {
    opacity: 0.5,
  },
  kakaoBtn: { backgroundColor: '#FEE500' },
  naverBtn: { backgroundColor: '#03C75A' },
  googleBtn: { backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#ddd' },
  kakaoTxt: { fontSize: 20, fontWeight: '700', color: '#3C1E1E' },
  naverTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
  googleTxt: { fontSize: 18, fontWeight: '700', color: '#4285F4' },
  freeBadge: {
    backgroundColor: MINT_LIGHT,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 16,
  },
  freeTxt: { fontSize: 12, color: MINT, fontWeight: '500' },
  troubleTxt: { fontSize: 12, color: '#ccc' },
});
