import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/styles/theme';

export default function GraphScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>그래프</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.graphCard}>
          <View style={styles.nodeMain}>
            <Ionicons name="git-network-outline" size={28} color={Colors.mint} />
          </View>
          <View style={styles.branchRow}>
            <View style={styles.node} />
            <View style={styles.line} />
            <View style={[styles.node, styles.nodePurple]} />
            <View style={styles.line} />
            <View style={[styles.node, styles.nodeCoral]} />
          </View>
          <Text style={styles.emptyTitle}>지식 그래프 준비 중</Text>
          <Text style={styles.emptyText}>작업 파일과 폴더의 연결 관계를 이 탭에서 확인할 수 있게 연결할 예정입니다.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    backgroundColor: Colors.white,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  graphCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    paddingVertical: 34,
    paddingHorizontal: 18,
  },
  nodeMain: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: Colors.mintLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  branchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  node: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.mint,
  },
  nodePurple: {
    backgroundColor: '#7F77DD',
  },
  nodeCoral: {
    backgroundColor: '#D85A30',
  },
  line: {
    width: 38,
    height: 1,
    backgroundColor: '#d8eee8',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
  },
});
