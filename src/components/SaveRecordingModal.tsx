import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/styles/theme';

interface SaveRecordingModalProps {
  visible: boolean;
  defaultName: string;
  onCancel: () => void;
  onSave: (fileName: string) => void;
}

export default function SaveRecordingModal({
  visible,
  defaultName,
  onCancel,
  onSave,
}: SaveRecordingModalProps) {
  const [fileName, setFileName] = useState(defaultName);

  useEffect(() => {
    if (visible) {
      setFileName(defaultName);
    }
  }, [defaultName, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={s.card}>
          <Text style={s.title}>녹음을 저장할까요?</Text>
          <Text style={s.subtitle}>파일 이름을 입력해주세요</Text>

          <Text style={s.label}>파일 이름</Text>
          <View style={s.inputRow}>
            <Ionicons name="mic-outline" size={16} color={Colors.mint} />
            <TextInput
              style={s.input}
              value={fileName}
              onChangeText={setFileName}
              selectTextOnFocus
            />
            {fileName.length > 0 && (
              <TouchableOpacity onPress={() => setFileName('')}>
                <Ionicons name="close" size={16} color="#bbb" />
              </TouchableOpacity>
            )}
          </View>

          <View style={s.btnRow}>
            <TouchableOpacity style={s.btnCancel} onPress={onCancel}>
              <Text style={s.btnCancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btnSave, !fileName.trim() && s.btnSaveDisabled]}
              onPress={() => onSave(fileName.trim())}
              disabled={!fileName.trim()}
            >
              <Text style={s.btnSaveText}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: 300,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  label: {
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
    color: '#1a1a1a',
    padding: 0,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    alignItems: 'center',
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  btnSave: {
    flex: 2,
    paddingVertical: 12,
    backgroundColor: Colors.mint,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnSaveDisabled: {
    opacity: 0.4,
  },
  btnSaveText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
});
