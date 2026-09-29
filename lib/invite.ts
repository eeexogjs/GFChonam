import type { Answers, FormSchema, RepeatGroupField } from "./form-schema";

/**
 * 초대장 설정 — topics.invite(jsonb)에 저장된다.
 * 관리자가 취합 편집 화면에서 기본값을 정하고,
 * 설계사는 접수 완료 화면에서 고객명·인사말만 바꿔 이미지를 만든다.
 */
export interface InviteSettings {
  enabled: boolean;
  template: string; // INVITE_TEMPLATES key
  eventName: string; // 초대장에 크게 들어갈 행사명 (취합 제목과 다르게 쓸 수 있음)
  dateText: string; // 자유 서식: "10월 16일(목) 오후 2시"
  placeText: string;
  greeting: string; // 기본 인사말 (설계사가 자유 수정)
  host: string; // 하단 주최 표기: "삼성생명 호남법인지역단"
}

export const EMPTY_INVITE: InviteSettings = {
  enabled: false,
  template: "green",
  eventName: "",
  dateText: "",
  placeText: "",
  greeting: "",
  host: "삼성생명 호남법인지역단",
};

/** 초대장 색 구성 — 캔버스 렌더러가 그대로 사용 */
export interface InviteTemplate {
  key: string;
  name: string;
  bgTop: string;
  bgBottom: string;
  accent: string; // 골드 라인·라벨
  title: string; // 행사명
  text: string; // 본문
  sub: string; // 보조(일시·장소 값, 주최)
}

export const INVITE_TEMPLATES: InviteTemplate[] = [
  {
    key: "green",
    name: "딥그린 포멀",
    bgTop: "#11482E",
    bgBottom: "#0B2E1D",
    accent: "#D8B368",
    title: "#FFFFFF",
    text: "#EAE4D2",
    sub: "rgba(255,255,255,0.62)",
  },
  {
    key: "ivory",
    name: "아이보리 클래식",
    bgTop: "#FBF8F1",
    bgBottom: "#F3ECDC",
    accent: "#B08D3E",
    title: "#14532D",
    text: "#4A4437",
    sub: "#8A8270",
  },
  {
    key: "night",
    name: "미드나잇 골드",
    bgTop: "#152036",
    bgBottom: "#0B1220",
    accent: "#D4AF6A",
    title: "#F5EFE3",
    text: "#CFD6E2",
    sub: "rgba(255,255,255,0.55)",
  },
];

/** 추천 인사말 프리셋 — 설계사 화면에서 골라 쓰고 자유 수정 */
export const GREETING_PRESETS: string[] = [
  "귀한 걸음 하시어 자리를 빛내 주시면 감사하겠습니다.\n뜻깊고 유익한 시간이 되도록 정성껏 준비하겠습니다.",
  "평소 베풀어 주신 성원에 감사드리며,\n소중한 분을 모시고 특별한 자리를 마련했습니다.\n부디 참석하시어 자리를 빛내 주시기 바랍니다.",
  "고객님께 도움이 될 알찬 내용으로 준비했습니다.\n편안한 마음으로 오셔서 좋은 시간 보내시길 바랍니다.",
];

/**
 * 제출 답변에서 초대장에 넣을 고객 이름 후보를 뽑는다.
 * 반복그룹 안에서 라벨에 "성함/이름"이 들어간 text 항목(없으면 첫 text 항목)의 값을 모은다.
 */
export function extractGuestNames(schema: FormSchema, answers: Answers): string[] {
  const names: string[] = [];
  for (const field of schema) {
    if (field.block !== "repeat_group") continue;
    const rg = field as RepeatGroupField;
    const nameField =
      rg.fields.find((f) => f.block === "text" && /성함|이름/.test(f.label)) ??
      rg.fields.find((f) => f.block === "text");
    if (!nameField) continue;
    const items = Array.isArray(answers[rg.id])
      ? (answers[rg.id] as Record<string, unknown>[])
      : [];
    for (const item of items) {
      const v = item?.[nameField.id];
      if (typeof v === "string" && v.trim()) names.push(v.trim());
    }
  }
  return [...new Set(names)];
}
