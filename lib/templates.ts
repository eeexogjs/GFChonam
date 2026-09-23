import type { FormSchema } from "./form-schema";

/**
 * 주제 템플릿 프리셋 — 선택하면 스키마가 채워지고, 빌더에서 자유롭게 수정한다.
 * 세 템플릿 모두 발송인/신청자 공통부(지점·성함·코드·연락처)에 role을 달아
 * 지점별 통계(5단계)와 엑셀 요약이 자동으로 따라오게 한다.
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

const submitterFields: FormSchema = [
  {
    id: "branch",
    block: "select",
    label: "신청 지점",
    required: true,
    role: "submitter.branch",
    options: ["호남", "광주", "전남", "전북"],
  },
  { id: "gfc_name", block: "text", label: "성함", required: true, role: "submitter.name", maxLength: 20 },
  {
    id: "gfc_code",
    block: "text",
    label: "코드",
    required: true,
    role: "submitter.code",
    placeholder: "숫자 10자리 이내",
    pattern: "^[0-9]{1,10}$",
    patternMessage: "숫자만 10자리 이내로 입력해주세요.",
    maxLength: 10,
  },
  { id: "gfc_phone", block: "phone", label: "연락처", required: true, role: "submitter.phone" },
];

export const TOPIC_TEMPLATES: TopicTemplate[] = [
  {
    key: "delivery",
    name: "택배 발송",
    description: "발송인 정보 + 수신인(이름/주소/연락처) 최대 3건",
    type: "delivery",
    defaultTitle: "택배발송 신청",
    perPersonLimit: 3,
    notice: "※ 작성 전 확인 및 안내사항\n· 인당 3개 한도\n· 수신인 주소는 [검색] 버튼으로 선택해주세요",
    schema: [
      ...submitterFields,
      { id: "sender_name", block: "text", label: "발송인 이름", required: true, maxLength: 20 },
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
    notice: "※ 좌석 한정으로 조기 마감될 수 있습니다\n· 참석 고객 정보를 정확히 입력해주세요",
    schema: [
      ...submitterFields,
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
    notice: "※ 후보자에게 사전 안내 후 등록해주세요",
    schema: [
      ...submitterFields,
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
