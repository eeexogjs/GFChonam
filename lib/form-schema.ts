/**
 * 취합ON 폼 스키마 타입 정의.
 * topics.form_schema(jsonb)에 저장되는 구조 — 이 타입이 곧 플랫폼의 계약이다.
 * 4단계 폼 빌더도 이 타입을 그대로 편집하게 된다.
 */

export type FieldBlockType =
  | "text"
  | "select"
  | "phone"
  | "address"
  | "date"
  | "checkbox"
  | "repeat_group";

interface BaseField {
  /** answers JSON의 키. 주제 안에서 유일해야 한다 */
  id: string;
  block: FieldBlockType;
  label: string;
  required?: boolean;
  placeholder?: string;
  /** 제출자 통계 컬럼 매핑 (submissions.submitter로 추출됨) */
  role?: "submitter.branch" | "submitter.name" | "submitter.code" | "submitter.phone";
}

export interface TextField extends BaseField {
  block: "text";
  /** 정규식 문자열 (예: 숫자만) */
  pattern?: string;
  patternMessage?: string;
  maxLength?: number;
}

export interface SelectField extends BaseField {
  block: "select";
  options: string[];
}

export interface PhoneField extends BaseField {
  block: "phone"; // 010 고정 3분할 → 값은 "010-1234-5678" 문자열
}

export interface AddressField extends BaseField {
  block: "address"; // 값은 { postcode, address, detail }
}

export interface DateField extends BaseField {
  block: "date"; // 값은 "YYYY-MM-DD"
}

export interface CheckboxField extends BaseField {
  block: "checkbox"; // 값은 boolean
}

export interface RepeatGroupField extends BaseField {
  block: "repeat_group"; // 값은 Record<string, unknown>[] (하위 필드 id → 값)
  fields: SimpleField[]; // 중첩 반복은 허용하지 않는다 (복잡도 통제)
  minItems?: number; // required=true면 기본 1
  maxItems?: number;
  /** 항목 이름 (예: "수신인" → "수신인 1", "수신인 2"로 표시) */
  itemLabel?: string;
}

export type SimpleField =
  | TextField
  | SelectField
  | PhoneField
  | AddressField
  | DateField
  | CheckboxField;

export type FieldBlock = SimpleField | RepeatGroupField;

export type FormSchema = FieldBlock[];

export interface AddressValue {
  postcode: string;
  address: string;
  detail: string;
}

export type AnswerValue =
  | string
  | boolean
  | AddressValue
  | Record<string, unknown>[]
  | null
  | undefined;

export type Answers = Record<string, AnswerValue>;

/** answers에서 submitter 컬럼({branch,name,code,phone})을 추출 */
export function extractSubmitter(schema: FormSchema, answers: Answers) {
  const submitter: Record<string, string> = {};
  for (const field of schema) {
    if (field.role && typeof answers[field.id] === "string") {
      const key = field.role.split(".")[1];
      submitter[key] = answers[field.id] as string;
    }
  }
  return submitter;
}

/** 값을 사람이 읽는 한 줄 문자열로 (완료 화면·엑셀에서 공용) */
export function formatValue(field: FieldBlock, value: AnswerValue): string {
  if (value === null || value === undefined || value === "") return "-";
  if (field.block === "address") {
    const v = value as AddressValue;
    return [v.address, v.detail].filter(Boolean).join(", ") + (v.postcode ? ` (${v.postcode})` : "");
  }
  if (field.block === "checkbox") return value ? "예" : "아니오";
  if (field.block === "repeat_group") return `${(value as unknown[]).length}건`;
  return String(value);
}
