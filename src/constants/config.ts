// 실기기 테스트 시 개발 PC의 LAN IP로 변경 (예: http://192.168.x.x:8000)
// Android 에뮬레이터: 10.0.2.2 | iOS 시뮬레이터: localhost
export const API_BASE_URL = 'http://localhost:8000';
export const WS_BASE_URL = 'ws://localhost:8000';

// Deepgram 요구 사항에 맞춘 녹음 옵션: linear16 PCM, 16kHz, mono
// HIGH_QUALITY 프리셋은 플랫폼마다 m4a/aac를 내보내 raw PCM이 아님.
import { Audio } from 'expo-av';

export const DEEPGRAM_RECORDING_OPTIONS: Audio.RecordingOptions = {
  android: {
    extension: '.wav',
    outputFormat: Audio.AndroidOutputFormat.DEFAULT,
    audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
  },
  ios: {
    extension: '.wav',
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    audioQuality: Audio.IOSAudioQuality.MAX,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: 'audio/wav', bitsPerSecond: 256000 },
};

// 250ms: Deepgram에 자주 보낼수록 interim 응답이 빠름.
// 너무 짧으면(< 100ms) 파일 I/O 오버헤드가 커지므로 250ms가 적절한 균형점.
export const CHUNK_INTERVAL_MS = 250;
