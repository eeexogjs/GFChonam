import {
  formatValue,
  type Answers,
  type FormSchema,
  type RepeatGroupField,
} from "@/lib/form-schema";

/**
 * 입력값 요약 — 제출 전 "입력 내용 확인" 시트에서 사용.
 * 서버/클라이언트 어디서든 렌더 가능한 순수 컴포넌트.
 */
export default function AnswersSummary({
  schema,
  answers,
}: {
  schema: FormSchema;
  answers: Answers;
}) {
  return (
    <dl className="space-y-2.5 text-sm">
      {schema.map((field) => {
        if (field.block === "heading") {
          return (
            <p key={field.id} className="pt-1 text-[13px] font-bold text-brand">
              {field.label}
            </p>
          );
        }
        if (field.block === "repeat_group") {
          const items = (answers[field.id] as Record<string, unknown>[]) ?? [];
          const rg = field as RepeatGroupField;
          return items.map((item, i) => (
            <div key={`${field.id}-${i}`} className="rounded-xl bg-gray-50 p-3">
              <p className="mb-1 text-[13px] font-bold text-brand-ink">
                {rg.itemLabel ?? rg.label} {i + 1}
              </p>
              {rg.fields.map((sub) => {
                const v = formatValue(sub, item?.[sub.id] as Answers[string]);
                if (v === "-") return null;
                return (
                  <div key={sub.id} className="flex justify-between gap-3 py-0.5">
                    <dt className="shrink-0 text-gray-400">
                      {sub.label.replace(/ ?\(선택\)/, "")}
                    </dt>
                    <dd className="text-right font-medium">{v}</dd>
                  </div>
                );
              })}
            </div>
          ));
        }
        const v = formatValue(field, answers[field.id]);
        return (
          <div key={field.id} className="flex justify-between gap-3">
            <dt className="shrink-0 text-gray-400">{field.label.replace(/ ?\(선택\)/, "")}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        );
      })}
    </dl>
  );
}
