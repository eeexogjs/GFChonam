import type { FormSchema, RepeatGroupField } from "@/lib/form-schema";

/**
 * 접수 규칙 요약 — 화면에 고정 숫자를 쓰지 않고 관리자 설정(topic)과
 * 양식 구성(schema)에서 그때그때 계산해 보여준다.
 *
 * 규칙 구분:
 * - 접수 기간   : topics.deadline (마감 시각. 시작 시각 개념은 현재 없음 → 게시 즉시 접수)
 * - 신청 횟수   : topics.per_person_limit (사번 기준 "제출 횟수" 제한)
 * - 1회 입력 인원: 양식의 반복그룹 maxItems (예: 수신인 최대 N명)
 * - 전체 정원   : topics.capacity (도달 시 자동 마감)
 */
export interface TopicRules {
  deadline: string | null;
  per_person_limit: number | null;
  capacity: number | null;
}

export function buildRules(topic: TopicRules, schema: FormSchema) {
  const rg = schema.find((f) => f.block === "repeat_group") as RepeatGroupField | undefined;
  const rules: { label: string; value: string }[] = [];

  rules.push({
    label: "접수 기간",
    value: topic.deadline
      ? `${new Date(topic.deadline).toLocaleString("ko-KR", {
          timeZone: "Asia/Seoul",
          month: "long",
          day: "numeric",
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
        })} 마감`
      : "마감일 미정 (마감 시 별도 공지)",
  });
  rules.push({
    label: "신청 횟수",
    value: topic.per_person_limit ? `1인(사번) ${topic.per_person_limit}회까지` : "제한 없음",
  });
  // 1회 입력 인원 — 시스템 입력 상한(20)에 걸어둔 경우는 운영 규칙이 아니므로 표시하지 않는다
  if (rg && (rg.maxItems ?? 1) < 20) {
    rules.push({
      label: `1회 ${rg.itemLabel ?? "항목"} 입력`,
      value: `최대 ${rg.maxItems ?? 1}명`,
    });
    // 횟수 × 1회 인원의 총량을 명시해 "몇 명까지 가능한지" 오해가 없게 한다
    if (topic.per_person_limit && rg.maxItems) {
      rules.push({
        label: "1인 최대 인원",
        value: `총 ${topic.per_person_limit * rg.maxItems}명까지 (${topic.per_person_limit}회 × ${rg.maxItems}명)`,
      });
    }
  }
  if (topic.capacity) {
    rules.push({ label: "전체 정원", value: `선착순 ${topic.capacity}건 (마감 시 자동 종료)` });
  }
  return rules;
}

export default function RulesSummary({
  topic,
  schema,
  variant = "card",
}: {
  topic: TopicRules;
  schema: FormSchema;
  variant?: "card" | "inline";
}) {
  const rules = buildRules(topic, schema);

  if (variant === "inline") {
    // 모바일: 제목 아래 컴팩트 박스
    return (
      <div className="mt-4 rounded-2xl border border-brand/15 bg-brand-light/60 px-4 py-3">
        <dl className="space-y-1 text-[13px]">
          {rules.map((r) => (
            <div key={r.label} className="flex gap-2">
              <dt className="w-24 shrink-0 font-semibold text-brand">{r.label}</dt>
              <dd className="text-gray-700">{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  // PC: 우측 고정 패널
  return (
    <div className="card">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-brand-ink">
        <span className="h-4 w-1 rounded-full bg-brand" aria-hidden />
        접수 규칙
      </h2>
      <dl className="space-y-2.5 text-sm">
        {rules.map((r) => (
          <div key={r.label}>
            <dt className="text-xs font-semibold text-brand">{r.label}</dt>
            <dd className="mt-0.5 text-gray-700">{r.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 border-t border-gray-100 pt-3 text-xs leading-relaxed text-gray-400">
        접수 후에는 접수증 링크에서 마감 전까지 직접 수정할 수 있어요.
      </p>
    </div>
  );
}
