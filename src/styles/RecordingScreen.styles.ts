import { Dimensions, StyleSheet } from 'react-native';
import { Colors } from './theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  inner: { flex: 1 },

  // 타이머
  timerSection: { alignItems: 'center', paddingTop: 16, paddingBottom: 8 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ccc' },
  recDotActive: { backgroundColor: Colors.mint },
  timerText: { fontSize: 32, fontWeight: '500', letterSpacing: 2, color: '#1A1A1A' },
  recDate: { fontSize: 12, color: '#999', marginTop: 2 },
  pausedBadge: {
    marginTop: 6,
    fontSize: 11,
    color: Colors.textLight,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },

  // 파형
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 6,
    height: 36,
  },
  waveformPaused: { opacity: 0.25 },
  waveBar: { width: 2, backgroundColor: Colors.mint, borderRadius: 2, opacity: 0.45 },

  // 하이라이트
  highlightBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
  },
  highlightText: { fontSize: 13, color: Colors.mint },
  disabledText: { color: '#ccc' },

  // 스크립트
  scriptArea: {
    marginHorizontal: 16,
    borderWidth: 0.5,
    borderColor: '#E5E5E5',
    borderRadius: 14,
    flexGrow: 0,
    maxHeight: 300,
  },

  // 요약 청크
  chunkSummarized: {
    padding: 12,
    backgroundColor: Colors.mintSummaryBg,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.mintSummaryBorder,
  },
  chunkTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  chunkTimeText: { fontSize: 10, color: Colors.mint, fontWeight: '600' },
  summaryText: { fontSize: 12, color: Colors.textMid, lineHeight: 18 },
  keywordRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 7 },
  keyword: {
    borderWidth: 0.5,
    borderColor: Colors.mint,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: Colors.white,
  },
  keywordActive: { backgroundColor: Colors.mint },
  keywordText: { fontSize: 10, color: Colors.mint },
  keywordTextActive: { color: Colors.white },

  // 실시간 청크
  chunkLive: { padding: 12, backgroundColor: Colors.white },
  chunkLiveTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  liveIndicator: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.mint },
  liveIndicatorPaused: { backgroundColor: '#ccc' },
  chunkLiveTimeText: { fontSize: 10, color: '#999' },
  liveText: { fontSize: 12, color: '#1A1A1A', lineHeight: 20 },
  cursor: { color: Colors.mint, fontWeight: 'bold' },

  // 안내
  notice: {
    textAlign: 'center',
    fontSize: 11,
    color: Colors.textLight,
    lineHeight: 17,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },

  // 하단 컨트롤
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 20,
    paddingTop: 8,
  },
  ctrlLabel: { fontSize: 11, color: '#888', marginTop: 4, textAlign: 'center' },
  centerCol: { alignItems: 'center' },
  btnPause: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnStop: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 검색 팝업
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    width: Dimensions.get('window').width - 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  popupQueryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  popupWordBadge: {
    backgroundColor: Colors.mintBadge,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  popupWordText: { fontSize: 12, fontWeight: '600', color: '#1A1A1A' },
  popupQueryLabel: { fontSize: 12, color: '#666' },
  searchBtns: { flexDirection: 'row', gap: 6 },
  searchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
  },
  searchBtnPrimary: { backgroundColor: Colors.mint, borderColor: Colors.mint },
  searchBtnText: { fontSize: 11, fontWeight: '500', color: '#444' },
  searchBtnTextPrimary: { color: Colors.white },
});
