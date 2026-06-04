import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/styles/theme';

type Props = {
  visible: boolean;
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void;
};

export default function StopRecordingModal({ visible, onCancel, onDiscard, onSave }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>녹음 화면을 나갈까요?</Text>
          <Text style={styles.desc}>저장하지 않으면 현재 녹음 내용은 사라집니다.</Text>
          <View style={styles.btns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.discardBtn} onPress={onDiscard}>
              <Text style={styles.discardText}>저장 안 함</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={onSave}>
              <Text style={styles.confirmText}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    width: '80%',
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
  },
  title: { fontSize: 17, fontWeight: '700', color: Colors.textDark, marginBottom: 8 },
  desc: { fontSize: 14, color: '#888', marginBottom: 24, textAlign: 'center' },
  btns: { flexDirection: 'row', gap: 8, width: '100%' },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  cancelText: { fontSize: 13, color: Colors.textMid, fontWeight: '500' },
  discardBtn: {
    flex: 1.25,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#FAECE7',
    alignItems: 'center',
  },
  discardText: { fontSize: 13, color: '#D85A30', fontWeight: '600' },
  confirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: Colors.mint,
    alignItems: 'center',
  },
  confirmText: { fontSize: 13, color: Colors.white, fontWeight: '600' },
});
