import type { FormSchema } from "./form-schema";

/**
 * 주제 템플릿 프리셋 — 선택하면 스키마가 채워지고, 빌더에서 자유롭게 수정한다.
 * 신청자 공통부(지점·이름·사번)에 role을 달아 지점별 통계와
 * 엑셀 요약, 명단 검증·자동입력이 자동으로 따라오게 한다.
 */

export interface TopicTemplate {
  key: string;
  name: string;
  description: string;
  type: string;
  defaultTitle: string;
  perPersonLimit: number | null;
  notice: string;
  schema: FormSchema;
}

/** ① 신청자 정보 공통부 (지점·이름·사번) */
const applicantFields = (headingId: string): FormSchema => [
  { id: headingId, block: "heading", label: "① 신청자 정보" },
  {
    id: "branch",
    block: "select",
    label: "지점",
    required: true,
    role: "submitter.branch",
    options: ["호남", "광주", "전남", "전북"],
  },
  { id: "gfc_name", block: "text", label: "이름", required: true, role: "submitter.name", maxLength: 20 },
  {
    id: "gfc_code",
    block: "text",
    label: "사번",
    required: true,
    role: "submitter.code",
    placeholder: "숫자만 입력",
    pattern: "^[0-9]{1,10}$",
    patternMessage: "사번은 숫자만 10자리 이내로 입력해주세요.",
    maxLength: 10,
  },
];

export const TOPIC_TEMPLATES: TopicTemplate[] = [
  {
    key: "delivery",
    name: "택배 발송",
    description: "신청자 → 발송인 → 수신인(이름/주소/연락처) 순서 입력",
    type: "delivery",
    defaultTitle: "택배발송 신청",
    perPersonLimit: 3,
    notice: "· 받는 분 주소는 [주소 검색] 버튼으로 선택해주세요\n· 접수 후에도 접수증 링크에서 수정할 수 있어요",
    schema: [
      ...applicantFields("h_applicant"),
      { id: "h_sender", block: "heading", label: "② 발송인 정보" },
      {
        id: "sender_name",
        block: "text",
        label: "발송인 이름",
        required: true,
        maxLength: 20,
        sameAsRole: "submitter.name",
        sameAsLabel: "발송인 이름이 신청자와 같습니다",
      },
      { id: "sender_phone", block: "phone", label: "발송인 연락처", required: true, role: "submitter.phone" },
      { id: "h_recipients", block: "heading", label: "③ 수신인 정보" },
      {
        id: "recipients",
        block: "repeat_group",
        label: "수신인",
        itemLabel: "수신인",
        required: true,
        minItems: 1,
        maxItems: 3,
        fields: [
          { id: "name", block: "text", label: "수신인 이름", required: true, maxLength: 20 },
          { id: "address", block: "address", label: "수신인 주소", required: true },
          { id: "phone", block: "phone", label: "수신인 연락처", required: true },
          { id: "company", block: "text", label: "수신인 업체명 (선택)", required: false, maxLength: 40 },
        ],
      },
    ],
  },
  {
    key: "seminar",
    name: "세미나 신청",
    description: "신청자 정보 + 참석 고객(이름/연락처) 명단",
    type: "seminar",
    defaultTitle: "세미나 참석 신청",
    perPersonLimit: null,
    notice: "· 좌석 한정으로 조기 마감될 수 있어요\n· 참석 고객 정보를 정확히 입력해주세요",
    schema: [
      ...applicantFields("h_applicant"),
      { id: "gfc_phone", block: "phone", label: "신청자 연락처", required: true, role: "submitter.phone" },
      { id: "h_guests", block: "heading", label: "② 참석 고객 명단" },
      {
        id: "guests",
        block: "repeat_group",
        label: "참석 고객",
        itemLabel: "고객",
        required: true,
        minItems: 1,
        maxItems: 5,
        fields: [
          { id: "name", block: "text", label: "고객 성함", required: true, maxLength: 20 },
          { id: "phone", block: "phone", label: "고객 연락처", required: true },
          { id: "memo", block: "text", label: "메모 (선택)", required: false, maxLength: 50 },
        ],
      },
    ],
  },
  {
    key: "jobfair",
    name: "잡설명회 후보자",
    description: "추천인 정보 + 참석 후보자 명단",
    type: "jobfair",
    defaultTitle: "잡설명회 참석 신청",
    perPersonLimit: null,
    notice: "· 후보자에게 사전 안내 후 등록해주세요",
    schema: [
      ...applicantFields("h_applicant"),
      { id: "gfc_phone", block: "phone", label: "신청자 연락처", required: true, role: "submitter.phone" },
      { id: "h_candidates", block: "heading", label: "② 참석 후보자 명단" },
      {
        id: "candidates",
        block: "repeat_group",
        label: "참석 후보자",
        itemLabel: "후보자",
        required: true,
        minItems: 1,
        maxItems: 5,
        fields: [
          { id: "name", block: "text", label: "후보자 성함", required: true, maxLength: 20 },
          { id: "phone", block: "phone", label: "후보자 연락처", required: true },
          { id: "note", block: "text", label: "특이사항 (선택)", required: false, maxLength: 50 },
        ],
      },
    ],
  },
];
