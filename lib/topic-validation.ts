import type { FormSchema, RepeatGroupField, SelectField } from "./form-schema";
import { validateSlug } from "./slug";
import type { TopicPayload } from "@/components/builder/TopicBuilder";

/** 빌더 저장 전 최종 검증 — 서버 액션에서 호출 (클라이언트를 신뢰하지 않는다) */
export function validateTopicPayload(p: TopicPayload): string | null {
  if (!p.title?.trim()) return "취합 제목을 입력해주세요.";
  if (p.title.length > 100) return "제목은 100자 이내로 입력해주세요.";

  const slugError = validateSlug(p.slug);
  if (slugError) return slugError;

  if (p.deadline && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(p.deadline))
    return "마감일시 형식이 올바르지 않습니다.";
  if (p.perPersonLimit !== null && (p.perPersonLimit < 1 || p.perPersonLimit > 99))
    return "인당 접수 한도는 1~99 사이로 입력해주세요.";
  if (p.capacity !== null && (p.capacity < 1 || p.capacity > 10000))
    return "정원은 1~10,000 사이로 입력해주세요.";

  if (Array.isArray(p.info)) {
    if (p.info.length > 12) return "안내 정보는 12줄까지 등록할 수 있어요.";
    for (const r of p.info) {
      if ((r.label ?? "").length > 20) return "안내 정보 항목명은 20자 이내로 입력해주세요.";
      if ((r.value ?? "").length > 200) return "안내 정보 내용은 200자 이내로 입력해주세요.";
    }
  }

  if (p.invite?.enabled) {
    if (!p.invite.eventName?.trim()) return "초대장을 켰다면 행사명을 입력해주세요.";
    if (p.invite.eventName.length > 40) return "초대장 행사명은 40자 이내로 입력해주세요.";
    if ((p.invite.greeting ?? "").length > 300) return "초대장 인사말은 300자 이내로 입력해주세요.";
  }

  const schema = p.schema as FormSchema;
  if (!Array.isArray(schema) || schema.length === 0)
    return "입력 항목을 1개 이상 추가해주세요.";
  if (schema.length > 50) return "입력 항목은 최대 50개까지 가능합니다.";

  const ids = new Set<string>();
  for (const [i, field] of schema.entries()) {
    const pos = `${i + 1}번째 항목`;
    if (!field.id || ids.has(field.id)) return `${pos}: 내부 ID 충돌 — 항목을 삭제 후 다시 추가해주세요.`;
    ids.add(field.id);
    if (!field.label?.trim()) return `${pos}: 항목 이름을 입력해주세요.`;

    if (field.block === "select") {
      if (!(field as SelectField).options?.length)
        return `"${field.label}": 선택지를 1개 이상 입력해주세요.`;
    }
    if (field.block === "repeat_group") {
      const rg = field as RepeatGroupField;
      if (!rg.fields?.length) return `"${field.label}": 반복그룹 안에 하위 항목을 1개 이상 추가해주세요.`;
      if ((rg.maxItems ?? 3) < 1 || (rg.maxItems ?? 3) > 20)
        return `"${field.label}": 최대 건수는 1~20 사이여야 합니다.`;
      const subIds = new Set<string>();
      for (const sub of rg.fields) {
        if (!sub.id || subIds.has(sub.id)) return `"${field.label}": 하위 항목을 삭제 후 다시 추가해주세요.`;
        subIds.add(sub.id);
        if (!sub.label?.trim()) return `"${field.label}": 하위 항목 이름을 입력해주세요.`;
        if (sub.block === "select" && !(sub as SelectField).options?.length)
          return `"${field.label} > ${sub.label || "선택목록"}": 선택지를 입력해주세요.`;
        if ((sub.block as string) === "repeat_group")
          return "반복그룹 안에 반복그룹은 넣을 수 없습니다.";
      }
    }
  }
  return null;
}

/** datetime-local(서울 기준) → ISO. 빈 값은 null */
export function deadlineToIso(deadline: string): string | null {
  if (!deadline) return null;
  return new Date(`${deadline}:00+09:00`).toISOString();
}

/** ISO → datetime-local(서울 기준). 빌더 초기값용 */
export function isoToDeadlineInput(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso)
    .toLocaleString("sv-SE", { timeZone: "Asia/Seoul" })
    .slice(0, 16)
    .replace(" ", "T");
}
