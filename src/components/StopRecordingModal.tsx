import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/styles/theme';

type Props = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function StopRecordingModal({ visible, onCancel, onConfirm }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>녹음을 종료할까요?</Text>
          <Text style={styles.desc}>녹음이 종료되면 받아쓰기가 시작됩니다</Text>
          <View style={styles.btns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>아니오</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
              <Text style={styles.confirmText}>녹음 종료</Text>
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
  btns: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, color: Colors.textMid, fontWeight: '500' },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.mint,
    alignItems: 'center',
  },
  confirmText: { fontSize: 15, color: Colors.white, fontWeight: '600' },
});
