"use client";

import { useState } from "react";
import type {
  FieldBlock,
  RepeatGroupField,
  SelectField,
  SimpleField,
  TextField,
} from "@/lib/form-schema";

/** 관리자에게 보이는 블록 이름 — 개발 용어 대신 쓰임새로 표현 */
export const BLOCK_LABELS: Record<string, string> = {
  heading: "구역 제목",
  text: "글자 입력",
  select: "선택 목록",
  phone: "연락처",
  address: "주소",
  date: "날짜",
  checkbox: "체크 확인",
  repeat_group: "여러 명 입력",
};

export const BLOCK_ICONS: Record<string, string> = {
  heading: "🏷️",
  text: "✏️",
  select: "🔽",
  phone: "📞",
  address: "📍",
  date: "📅",
  checkbox: "✅",
  repeat_group: "👥",
};

const NUMERIC_PATTERN = "^[0-9]+$";

const smallInput =
  "w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand";

/** 접힌 상태에서 보여줄 한 줄 요약 */
function summaryOf(field: FieldBlock): string {
  switch (field.block) {
    case "select": {
      const o = (field as SelectField).options ?? [];
      return o.length
        ? `선택지: ${o.slice(0, 3).join(" · ")}${o.length > 3 ? ` 외 ${o.length - 3}개` : ""}`
        : "선택지가 비어 있어요";
    }
    case "repeat_group": {
      const rg = field as RepeatGroupField;
      return `${rg.itemLabel ?? "항목"} 최대 ${rg.maxItems ?? 3}명 · 한 명당 입력칸 ${rg.fields?.length ?? 0}개`;
    }
    case "text": {
      const tf = field as TextField;
      const parts: string[] = [];
      if (tf.pattern) parts.push("숫자만");
      if (tf.maxLength) parts.push(`최대 ${tf.maxLength}자`);
      return parts.join(" · ");
    }
    default:
      return "";
  }
}

/**
 * 필드 1개 편집 카드.
 * - 구역 제목은 "구분선" 모양으로 다르게 보여 신청서 구조가 한눈에 들어온다
 * - 나머지 블록은 접힌 요약 줄이 기본, 누르면 펼쳐져 수정
 */
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
  // 새로 추가한 블록(이름 없음)은 펼친 채로 시작
  const [expanded, setExpanded] = useState(!field.label);
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

  const controls = (
    <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => onMove(-1)} disabled={index === 0}
        title="위로" className="rounded border border-gray-300 px-2 py-0.5 text-xs disabled:opacity-30">↑</button>
      <button type="button" onClick={() => onMove(1)} disabled={index === total - 1}
        title="아래로" className="rounded border border-gray-300 px-2 py-0.5 text-xs disabled:opacity-30">↓</button>
      <button type="button" onClick={handleDelete}
        className={`rounded px-2 py-0.5 text-xs ${confirmDelete ? "bg-red-600 text-white" : "border border-red-300 text-red-500"}`}>
        {confirmDelete ? "한 번 더" : "삭제"}
      </button>
    </div>
  );

  // ── 구역 제목: 카드가 아니라 "구분선"으로 표현 ─────────────
  if (field.block === "heading") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-brand/25 bg-brand-light/60 px-3 py-2">
        <span aria-hidden>{BLOCK_ICONS.heading}</span>
        <input
          type="text"
          className="w-full bg-transparent text-sm font-bold text-brand-ink outline-none placeholder:font-normal placeholder:text-brand/40"
          placeholder="구역 제목 (예: ② 수신인 정보)"
          value={field.label}
          onChange={(e) => set({ label: e.target.value })}
        />
        <span className="shrink-0 text-[11px] text-brand/50">구역 제목</span>
        {controls}
      </div>
    );
  }

  const summary = summaryOf(field);

  return (
    <div className={`rounded-lg border ${nested ? "border-gray-200 bg-gray-50" : "border-gray-300 bg-white"}`}>
      {/* 요약 줄 — 누르면 펼침/접힘 */}
      <div
        className="flex cursor-pointer items-center gap-2 p-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="shrink-0" aria-hidden>{BLOCK_ICONS[field.block]}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">
            {field.label ? (
              <b className="text-gray-800">{field.label}</b>
            ) : (
              <span className="text-gray-400">이름을 입력하세요</span>
            )}
            {field.required && <span className="ml-0.5 text-brand">*</span>}
            <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">
              {BLOCK_LABELS[field.block]}
            </span>
            {field.role && (
              <span
                className="ml-1 rounded bg-sky-50 px-1.5 py-0.5 text-[11px] text-sky-600"
                title="이 항목은 지점장 현황·엑셀 요약에 연결돼 있어요. 삭제하면 집계가 빠집니다."
              >
                집계 연결
              </span>
            )}
          </p>
          {summary && !expanded && (
            <p className="mt-0.5 truncate text-xs text-gray-400">{summary}</p>
          )}
        </div>
        {controls}
        <span className="shrink-0 text-xs text-gray-400">{expanded ? "접기 ▲" : "수정 ▼"}</span>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-3 pt-2.5">
          {confirmDelete && (
            <p className="mb-2 rounded bg-red-50 px-2 py-1 text-xs text-red-600">
              이미 제출된 내역이 있습니다. 이 항목을 삭제하면 기존 데이터의 해당 열이 엑셀에서 빠집니다.
            </p>
          )}

          {/* 공통: 라벨 + 필수 */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              className={smallInput}
              placeholder="항목 이름 (예: 발송인 이름)"
              value={field.label}
              onChange={(e) => set({ label: e.target.value })}
            />
            <label className="flex shrink-0 items-center gap-1 text-xs text-gray-600">
              <input
                type="checkbox"
                className="accent-brand"
                checked={!!field.required}
                onChange={(e) => set({ required: e.target.checked })}
              />
              필수
            </label>
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
            <>
              <textarea
                className={smallInput + " mt-2 h-20"}
                placeholder={"선택지를 한 줄에 하나씩 입력\n예)\n광주법인\n호남법인"}
                value={(field as SelectField).options?.join("\n") ?? ""}
                onChange={(e) => set({ options: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) } as Partial<SelectField>)}
              />
              {field.role === "submitter.branch" && (
                <p className="mt-1 text-[11px] text-gray-400">
                  ※ 지점 관리에 등록된 지점이 있으면 실제 화면에서는 그 목록이 우선 적용돼요.
                </p>
              )}
            </>
          )}

          {field.block === "repeat_group" && (
            <RepeatGroupEditor
              field={field as RepeatGroupField}
              hasSubmissions={hasSubmissions}
              onChange={(f) => onChange(f)}
            />
          )}
        </div>
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
      <p className="mb-2 text-[11px] leading-relaxed text-gray-400">
        신청자가 [추가하기]를 눌러 여러 명을 입력하는 구역이에요. 아래는 <b>한 명당</b> 채우는 입력칸입니다.
      </p>
      <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-gray-600">
        <label className="flex items-center gap-1">
          한 명을 부르는 말
          <input
            type="text"
            className="w-24 rounded-md border border-gray-300 px-1.5 py-1 text-sm"
            placeholder="예: 수신인"
            value={field.itemLabel ?? ""}
            onChange={(e) => onChange({ ...field, itemLabel: e.target.value || undefined })}
          />
        </label>
        <label className="flex items-center gap-1">
          한 번에 최대
          <input
            type="number"
            min={1}
            max={20}
            className="w-14 rounded-md border border-gray-300 px-1.5 py-1 text-sm"
            value={field.maxItems ?? 3}
            onChange={(e) => onChange({ ...field, maxItems: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
          />
          명
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

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <span className="mr-1 text-[11px] text-gray-400">입력칸 추가:</span>
        {(["text", "select", "phone", "address", "date", "checkbox"] as const).map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => addSub(b)}
            className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:border-brand hover:text-brand"
          >
            {BLOCK_ICONS[b]} {BLOCK_LABELS[b]}
          </button>
        ))}
      </div>
    </div>
  );
}
