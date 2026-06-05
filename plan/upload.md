# File Upload Work Page Plan

## Summary

- `POST /files/upload`는 클라이언트 입력 `file_uri`를 사용하지 않고, 서버가 저장 후 생성한 `file_uri`만 응답/목록에 반영한다.
- 프론트는 음성 업로드와 문서 업로드 UX를 분리하되 내부 업로드 API는 `/files/upload` 하나로 통합한다.
- `내 작업` 페이지는 더미 데이터 없이 `GET /files` 배열 응답을 기준으로 인증 사용자 저장 목록을 표시한다.
- 사용자 요청은 타당하다. 백엔드가 원본 파일 저장과 사용자별 목록 조회를 책임지므로 프론트도 서버 목록을 단일 진실 공급원으로 사용한다.

## Step Plan

1. `POST /files/upload` 계약 갱신
   - 이유: 클라이언트가 파일 경로를 주입하지 않아야 경로 위조와 기기별 로컬 URI 불일치를 피할 수 있다.
   - 작업: `src/api/files.ts`의 `uploadFile()`은 FormData에 `file`, 선택 `file_name`만 담는다.
   - 작업: `file_uri`는 요청에 넣지 않고, 응답의 서버 생성 `file_uri`를 완료 화면과 목록 데이터로만 사용한다.

2. `GET /files` 목록 계약 반영
   - 이유: 백엔드 응답은 래퍼 객체가 아니라 배열이므로 프론트도 `FileListItem[]`를 직접 처리해야 한다.
   - 작업: `listFiles()`는 `GET /files` 응답 배열을 반환한다.
   - 작업: `FileListItem` 필드는 `transcript_id`, `title`, `file_uri`, `original_filename`, `mime_type`, `status`, `created_at`로 고정한다.
   - 작업: 최신순 정렬은 서버의 `created_at DESC` 결과를 그대로 사용한다.

3. 업로드 화면 수정
   - 이유: 백엔드가 언어 선택 없이 기본 전사 동작을 사용하고 범용 파일 업로드를 제공하므로, 프론트 옵션도 단순해야 한다.
   - 작업: `UploadScreen`은 `kind=audio | document` 라우트 파라미터로 제목, 설명, 허용 확장자를 분기한다.
   - 작업: 음성은 `.m4a`, `.mp3`, `.wav`, `.webm`, 문서는 `.pdf`, `.ppt`, `.pptx`를 1차 허용한다.
   - 작업: 변환 언어, 화자 분리, 최근 파일 더미 목록은 제거한다.
   - 설정: 프론트 확장자 검증은 빠른 사용자 피드백용이며, 최종 판정은 서버 `400/422` 응답을 따른다.

4. 내 작업 페이지 수정
   - 이유: 업로드 후 앱을 다시 열어도 서버에 저장된 실제 목록을 보여줘야 한다.
   - 작업: `WorkListScreen`은 화면 포커스마다 `GET /files`를 호출한다.
   - 작업: 카드 제목은 `title`을 우선 사용하고, 없으면 `original_filename`을 사용한다.
   - 작업: 아이콘과 라벨은 `mime_type`과 파일 확장자를 기준으로 audio/pdf/ppt/document를 판별한다.
   - 작업: 카드 탭 시 audio는 `/detail?transcriptId=...`, document는 `/pdf?transcriptId=...`로 이동한다.

## Resulting Service Flow

1. 사용자가 내 작업에서 새 파일을 누른다.
2. 하단 시트에서 음성 업로드 또는 문서 업로드를 선택한다.
3. `UploadScreen`이 파일 선택기를 열고 확장자를 1차 검증한다.
4. 프론트가 `POST /files/upload`에 `file`, 선택 `file_name`만 담아 전송한다.
5. 서버가 원본 파일을 저장하고 생성한 `file_uri`를 DB와 응답에 기록한다.
6. 업로드 성공 후 사용자는 `/my-work`로 돌아간다.
7. `WorkListScreen`이 `GET /files`를 호출해 인증 사용자 저장 목록을 최신순으로 표시한다.

## Test Plan

- `npm.cmd exec tsc -- --noEmit`
- `UploadScreen`
  - audio 모드에서 `.m4a`, `.mp3`, `.wav`, `.webm` 선택 가능.
  - document 모드에서 `.pdf`, `.ppt`, `.pptx` 선택 가능.
  - FormData에 `file_uri`가 포함되지 않는다.
  - 성공 응답의 `file_uri`와 `transcript_id`를 읽고 완료 상태를 표시한다.
  - `400`, `422`, 네트워크 오류 메시지를 사용자에게 표시한다.
- `WorkListScreen`
  - `GET /files` 배열 응답을 카드 목록으로 표시한다.
  - 빈 배열이면 빈 상태를 표시한다.
  - 검색은 로드된 목록의 `title/original_filename` 기준으로 동작한다.
  - 더미 파일명, 최근 파일 더미, mock progress 카드가 남지 않는다.
- 회귀 확인
  - 새 파일 하단 시트의 safe-area 하단 여백은 유지된다.
  - 기존 녹음 시작 라우트는 그대로 동작한다.

## Assumptions

- `GET /files`는 페이지네이션 없이 배열 전체를 반환한다.
- `file_uri`는 클라이언트가 전송하지 않고 서버 응답/목록 표시용으로만 사용한다.
- 문서 상세/PDF 실제 렌더링과 음성 상세 실제 데이터 연동은 후속 작업으로 분리한다.
- 업로드는 동기 완료 방식으로 보고 별도 polling은 만들지 않는다.
