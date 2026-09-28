import {
  formatValue,
  type Answers,
  type FormSchema,
  type RepeatGroupField,
} from "./form-schema";

/**
 * form_schema → 표/엑셀 열 정의.
 * 관리자 테이블과 엑셀 다운로드가 같은 열 순서를 쓰도록 한 곳에서 정의한다.
 * repeat_group은 "수신인1_이름, 수신인1_주소, ... 수신인2_이름" 식으로 가로 전개.
 */

export interface ExportColumn {
  header: string;
  getValue: (answers: Answers) => string;
}

export function buildColumns(schema: FormSchema, rows: Answers[]): ExportColumn[] {
  const columns: ExportColumn[] = [];

  for (const field of schema) {
    if (field.block === "heading") continue; // 표시 전용 — 열 없음
    if (field.block === "repeat_group") {
      const rg = field as RepeatGroupField;
      const label = rg.itemLabel ?? rg.label;
      // 열 개수 = 스키마 maxItems와 실제 데이터 중 큰 쪽 (데이터 유실 방지)
      const dataMax = rows.reduce((m, r) => {
        const arr = r[rg.id];
        return Array.isArray(arr) ? Math.max(m, arr.length) : m;
      }, 0);
      const count = Math.max(rg.maxItems ?? 0, dataMax, 1);

      for (let i = 0; i < count; i++) {
        for (const sub of rg.fields) {
          columns.push({
            header: `${label}${i + 1}_${sub.label.replace(/ ?\(선택\)/, "")}`,
            getValue: (answers) => {
              const arr = answers[rg.id];
              const item = Array.isArray(arr) ? (arr[i] as Record<string, unknown>) : undefined;
              if (!item) return "";
              const v = formatValue(sub, item[sub.id] as Answers[string]);
              return v === "-" ? "" : v;
            },
          });
        }
      }
    } else {
      columns.push({
        header: field.label.replace(/ ?\(선택\)/, ""),
        getValue: (answers) => {
          const v = formatValue(field, answers[field.id]);
          return v === "-" ? "" : v;
        },
      });
    }
  }
  return columns;
}

export function formatSeoulTime(iso: string): string {
  return new Date(iso).toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }).slice(0, 16);
}
