import type {
  Answers,
  AddressValue,
  FieldBlock,
  FormSchema,
  SimpleField,
} from "./form-schema";

/**
 * 스키마 기반 검증 — 클라이언트(즉시 피드백)와 서버 액션(최종 판정)이
 * 같은 함수를 쓴다. 순수 함수만 있을 것 (브라우저/서버 겸용 파일).
 * 에러 키(path): "gfc_code" 또는 "recipients.0.name" 형태.
 */

export type FieldErrors = Record<string, string>;

const PHONE_RE = /^010-\d{3,4}-\d{4}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateSimple(field: SimpleField, value: unknown, path: string, errors: FieldErrors) {
  const empty =
    value === null ||
    value === undefined ||
    value === "" ||
    (field.block === "address" && !(value as AddressValue)?.address);

  if (empty) {
    if (field.required) errors[path] = `${field.label.replace(/ ?\(선택\)/, "")}을(를) 입력해주세요.`;
    return;
  }

  switch (field.block) {
    case "text": {
      const s = String(value);
      if (field.maxLength && s.length > field.maxLength)
        errors[path] = `${field.maxLength}자 이내로 입력해주세요.`;
      else if (field.pattern && !new RegExp(field.pattern).test(s))
        errors[path] = field.patternMessage ?? "형식이 올바르지 않습니다.";
      break;
    }
    case "select": {
      if (!field.options.includes(String(value)))
        errors[path] = "목록에서 선택해주세요.";
      break;
    }
    case "phone": {
      if (!PHONE_RE.test(String(value)))
        errors[path] = "연락처를 정확히 입력해주세요. (예: 010-1234-5678)";
      break;
    }
    case "date": {
      if (!DATE_RE.test(String(value))) errors[path] = "날짜를 선택해주세요.";
      break;
    }
    case "address": {
      const v = value as AddressValue;
      if (!v.postcode || !v.address)
        errors[path] = "주소 검색 버튼으로 주소를 선택해주세요.";
      break;
    }
    case "checkbox":
      break;
  }
}

export function validateAnswers(schema: FormSchema, answers: Answers): FieldErrors {
  const errors: FieldErrors = {};

  for (const field of schema as FieldBlock[]) {
    if (field.block === "repeat_group") {
      const items = Array.isArray(answers[field.id])
        ? (answers[field.id] as Record<string, unknown>[])
        : [];
      const min = field.required ? Math.max(field.minItems ?? 1, 1) : field.minItems ?? 0;

      if (items.length < min) {
        errors[field.id] = `${field.itemLabel ?? field.label}을(를) ${min}건 이상 입력해주세요.`;
        continue;
      }
      if (field.maxItems && items.length > field.maxItems) {
        errors[field.id] = `${field.itemLabel ?? field.label}은(는) 최대 ${field.maxItems}건까지 가능합니다.`;
        continue;
      }
      items.forEach((item, i) => {
        for (const sub of field.fields) {
          validateSimple(sub, item?.[sub.id], `${field.id}.${i}.${sub.id}`, errors);
        }
      });
    } else {
      validateSimple(field, answers[field.id], field.id, errors);
    }
  }
  return errors;
}
