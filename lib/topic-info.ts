/**
 * 안내 정보 — topics.info(jsonb)에 [{label, value}] 배열로 저장.
 * 세미나의 일시·장소·강사, 택배의 발송일·택배사, 비용 안내 등
 * 신청 화면 상단 "안내" 카드에 표 형태로 노출된다.
 */
export interface InfoItem {
  label: string;
  value: string;
}

/** 유형별 추천 항목 — 빌더에서 버튼으로 눌러 빠르게 추가 */
export const INFO_SUGGESTIONS: Record<string, string[]> = {
  seminar: ["일시", "장소", "강사", "참가 비용", "식사/선물 안내", "문의"],
  jobfair: ["일시", "장소", "진행 방식", "문의"],
  delivery: ["발송 예정일", "택배사", "택배비 안내", "문의"],
  survey: ["목적", "소요 시간", "문의"],
  custom: ["일시", "장소", "비용 안내", "문의"],
};
