import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/styles/theme';

export default function MoreScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>더보기</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  text: { fontSize: 18, color: Colors.textLight },
});
