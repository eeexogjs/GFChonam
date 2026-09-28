"use client";

import { useState } from "react";
import type {
  FieldBlock,
  RepeatGroupField,
  SelectField,
  SimpleField,
  TextField,
} from "@/lib/form-schema";

export const BLOCK_LABELS: Record<string, string> = {
  heading: "섹션 제목",
  text: "텍스트",
  select: "선택목록",
  phone: "전화번호",
  address: "주소",
  date: "날짜",
  checkbox: "체크박스",
  repeat_group: "반복그룹",
};

const NUMERIC_PATTERN = "^[0-9]+$";

const smallInput =
  "w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand";

/** 필드 1개 편집 카드 — JSON은 절대 노출하지 않는다 */
export default function FieldEditor({
  field,
  index,
  total,
  hasSubmissions,
  onChange,
  onMove,
  onDelete,
  nested = false,
}: {
  field: FieldBlock;
  index: number;
  total: number;
  hasSubmissions: boolean;
  onChange: (f: FieldBlock) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  nested?: boolean;
}) {
  // 제출 데이터가 있는 주제는 실수 방지를 위해 2번 눌러야 삭제된다
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (patch: Partial<FieldBlock>) => onChange({ ...field, ...patch } as FieldBlock);

  const handleDelete = () => {
    if (hasSubmissions && !confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    onDelete();
  };

  return (
    <div className={`rounded-lg border ${nested ? "border-gray-200 bg-gray-50" : "border-gray-300 bg-white"} p-3`}>
      {/* 헤더: 타입 뱃지 + 순서/삭제 버튼 */}
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded bg-brand-light px-1.5 py-0.5 text-xs font-medium text-brand">
          {BLOCK_LABELS[field.block]}
        </span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0}
            className="rounded border border-gray-300 px-2 py-0.5 text-xs disabled:opacity-30">↑</button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1}
            className="rounded border border-gray-300 px-2 py-0.5 text-xs disabled:opacity-30">↓</button>
          <button type="button" onClick={handleDelete}
            className={`rounded px-2 py-0.5 text-xs ${confirmDelete ? "bg-red-600 text-white" : "border border-red-300 text-red-500"}`}>
            {confirmDelete ? "한 번 더 누르면 삭제" : "삭제"}
          </button>
        </div>
      </div>
      {confirmDelete && (
        <p className="mb-2 rounded bg-red-50 px-2 py-1 text-xs text-red-600">
          이미 제출된 내역이 있습니다. 이 항목을 삭제하면 기존 데이터의 해당 열이 엑셀에서 빠집니다.
        </p>
      )}

      {/* 공통: 라벨 + 필수 (섹션 제목은 필수 개념 없음) */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          className={smallInput}
          placeholder={field.block === "heading" ? "섹션 제목 (예: 발송인 정보)" : "항목 이름 (예: 발송인 이름)"}
          value={field.label}
          onChange={(e) => set({ label: e.target.value })}
        />
        {field.block !== "heading" && (
          <label className="flex shrink-0 items-center gap-1 text-xs text-gray-600">
            <input
              type="checkbox"
              className="accent-brand"
              checked={!!field.required}
              onChange={(e) => set({ required: e.target.checked })}
            />
            필수
          </label>
        )}
      </div>

      {/* 타입별 옵션 */}
      {field.block === "text" && (
        <div className="mt-2 flex items-center gap-3">
          <input
            type="text"
            className={smallInput}
            placeholder="입력 안내문 (선택)"
            value={(field as TextField).placeholder ?? ""}
            onChange={(e) => set({ placeholder: e.target.value || undefined })}
          />
          <label className="flex shrink-0 items-center gap-1 text-xs text-gray-600">
            <input
              type="checkbox"
              className="accent-brand"
              checked={(field as TextField).pattern === NUMERIC_PATTERN || /\[0-9\]/.test((field as TextField).pattern ?? "")}
              onChange={(e) =>
                set(
                  e.target.checked
                    ? { pattern: NUMERIC_PATTERN, patternMessage: "숫자만 입력해주세요." }
                    : { pattern: undefined, patternMessage: undefined }
                )
              }
            />
            숫자만
          </label>
          <label className="flex shrink-0 items-center gap-1 text-xs text-gray-600">
            최대
            <input
              type="number"
              min={1}
              max={200}
              className="w-16 rounded-md border border-gray-300 px-1.5 py-1 text-sm"
              value={(field as TextField).maxLength ?? ""}
              onChange={(e) => set({ maxLength: e.target.value ? Number(e.target.value) : undefined })}
            />
            자
          </label>
        </div>
      )}

      {field.block === "select" && (
        <textarea
          className={smallInput + " mt-2 h-20"}
          placeholder={"선택지를 한 줄에 하나씩 입력\n예)\n호남\n광주"}
          value={(field as SelectField).options?.join("\n") ?? ""}
          onChange={(e) => set({ options: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) } as Partial<SelectField>)}
        />
      )}

      {field.block === "repeat_group" && (
        <RepeatGroupEditor
          field={field as RepeatGroupField}
          hasSubmissions={hasSubmissions}
          onChange={(f) => onChange(f)}
        />
      )}
    </div>
  );
}

let subIdSeq = 0;
const newSubId = () => `s${Date.now().toString(36)}${(subIdSeq++).toString(36)}`;

function RepeatGroupEditor({
  field,
  hasSubmissions,
  onChange,
}: {
  field: RepeatGroupField;
  hasSubmissions: boolean;
  onChange: (f: RepeatGroupField) => void;
}) {
  const subs = field.fields ?? [];

  const setSub = (i: number, f: FieldBlock) =>
    onChange({ ...field, fields: subs.map((s, idx) => (idx === i ? (f as SimpleField) : s)) });
  const moveSub = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= subs.length) return;
    const next = [...subs];
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ ...field, fields: next });
  };
  const deleteSub = (i: number) =>
    onChange({ ...field, fields: subs.filter((_, idx) => idx !== i) });
  const addSub = (block: SimpleField["block"]) =>
    onChange({
      ...field,
      fields: [...subs, { id: newSubId(), block, label: "", required: false, ...(block === "select" ? { options: [] } : {}) } as SimpleField],
    });

  return (
    <div className="mt-2 rounded-md border border-dashed border-gray-300 p-2">
      <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-gray-600">
        <label className="flex items-center gap-1">
          항목 이름
          <input
            type="text"
            className="w-24 rounded-md border border-gray-300 px-1.5 py-1 text-sm"
            placeholder="예: 수신인"
            value={field.itemLabel ?? ""}
            onChange={(e) => onChange({ ...field, itemLabel: e.target.value || undefined })}
          />
        </label>
        <label className="flex items-center gap-1">
          최대
          <input
            type="number"
            min={1}
            max={20}
            className="w-14 rounded-md border border-gray-300 px-1.5 py-1 text-sm"
            value={field.maxItems ?? 3}
            onChange={(e) => onChange({ ...field, maxItems: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
          />
          건
        </label>
      </div>

      <div className="space-y-2">
        {subs.map((sub, i) => (
          <FieldEditor
            key={sub.id}
            field={sub}
            index={i}
            total={subs.length}
            hasSubmissions={hasSubmissions}
            nested
            onChange={(f) => setSub(i, f)}
            onMove={(dir) => moveSub(i, dir)}
            onDelete={() => deleteSub(i)}
          />
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {(["text", "select", "phone", "address", "date", "checkbox"] as const).map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => addSub(b)}
            className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:border-brand hover:text-brand"
          >
            + {BLOCK_LABELS[b]}
          </button>
        ))}
      </div>
    </div>
  );
}
