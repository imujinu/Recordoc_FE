import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MINT = '#22C9A0';
const MINT_LIGHT = '#E6F7F3';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    Alert.alert('로그인', '로그인을 시도합니다.');
    // TODO: 백엔드 로그인 API 연동
  };

  const handleSignup = () => {
    Alert.alert('회원가입', '회원가입 화면으로 이동합니다.');
    // TODO: 회원가입 화면으로 네비게이션
  };

  const handleFindPassword = () => {
    Alert.alert('비밀번호 찾기', '비밀번호 찾기 화면으로 이동합니다.');
    // TODO: 비밀번호 찾기 화면으로 네비게이션
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 네비게이션 */}
      <View style={styles.nav}>
        <TouchableOpacity>
          <Ionicons name="arrow-back" size={20} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>로그인</Text>
        <Text style={styles.subtitle}>이메일과 비밀번호를 입력해주세요</Text>

        {/* 입력 필드 */}
        <View style={styles.inputGroup}>
          <View style={[styles.inputBox, emailFocused && styles.inputBoxFocused]}>
            <Ionicons
              name="mail-outline"
              size={18}
              color={emailFocused ? MINT : '#bbb'}
            />
            <TextInput
              style={styles.input}
              placeholder="이메일을 입력해주세요"
              placeholderTextColor="#bbb"
              value={email}
              onChangeText={setEmail}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={[styles.inputBox, passwordFocused && styles.inputBoxFocused]}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={passwordFocused ? MINT : '#bbb'}
            />
            <TextInput
              style={styles.input}
              placeholder="비밀번호를 입력해주세요"
              placeholderTextColor="#bbb"
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={18}
                color="#bbb"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* 회원가입 | 비밀번호 찾기 */}
        <View style={styles.linkRow}>
          <TouchableOpacity onPress={handleSignup}>
            <Text style={styles.linkTxt}>회원가입</Text>
          </TouchableOpacity>
          <Text style={styles.linkDiv}>|</Text>
          <TouchableOpacity onPress={handleFindPassword}>
            <Text style={styles.linkTxt}>비밀번호 찾기</Text>
          </TouchableOpacity>
        </View>

        {/* 로그인 버튼 */}
        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
          <Text style={styles.loginBtnTxt}>로그인</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  nav: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  content: { padding: 24, paddingTop: 32 },
  title: { fontSize: 24, fontWeight: '700', color: '#222', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#aaa', marginBottom: 32 },
  inputGroup: { gap: 10, marginBottom: 16 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#eee', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    backgroundColor: '#fafafa',
  },
  inputBoxFocused: { borderColor: MINT, backgroundColor: MINT_LIGHT },
  input: { flex: 1, fontSize: 14, color: '#222' },
  linkRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, marginBottom: 24,
  },
  linkTxt: { fontSize: 12, color: '#aaa' },
  linkDiv: { fontSize: 12, color: '#ddd' },
  loginBtn: {
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd',
    alignItems: 'center',
  },
  loginBtnTxt: { fontSize: 15, fontWeight: '600', color: '#222' },
});
