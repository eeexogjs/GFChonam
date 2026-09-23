"use client";

import { useState, useTransition } from "react";
import FormRenderer from "@/components/form/FormRenderer";
import FieldEditor, { BLOCK_LABELS } from "./FieldEditor";
import { suggestSlug } from "@/lib/slug";
import { TOPIC_TEMPLATES } from "@/lib/templates";
import type { FieldBlock, FormSchema } from "@/lib/form-schema";

export interface TopicPayload {
  title: string;
  slug: string;
  type: string;
  description: string;
  deadline: string; // "YYYY-MM-DDTHH:mm" (Asia/Seoul) 또는 ""
  perPersonLimit: number | null;
  schema: FormSchema;
}

export type SaveResult = { ok: true; redirectTo: string } | { ok: false; message: string };

let idSeq = 0;
const newId = () => `f${Date.now().toString(36)}${(idSeq++).toString(36)}`;

const TYPE_OPTIONS = [
  { value: "delivery", label: "택배" },
  { value: "seminar", label: "세미나" },
  { value: "jobfair", label: "잡설명회" },
  { value: "survey", label: "설문" },
  { value: "custom", label: "기타" },
];

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand";

/**
 * 폼 빌더 — 목표는 "마스터가 새 취합을 5분 안에 개설".
 * 미리보기는 실제 제출 화면과 같은 FormRenderer를 재사용한다.
 */
export default function TopicBuilder({
  mode,
  initial,
  submissionCount,
  action,
}: {
  mode: "create" | "edit";
  initial?: TopicPayload;
  submissionCount: number;
  action: (payload: TopicPayload) => Promise<SaveResult>;
}) {
  const [step, setStep] = useState<"template" | "edit">(mode === "create" ? "template" : "edit");
  const [payload, setPayload] = useState<TopicPayload>(
    initial ?? {
      title: "",
      slug: "",
      type: "custom",
      description: "",
      deadline: "",
      perPersonLimit: null,
      schema: [],
    }
  );
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  const set = (patch: Partial<TopicPayload>) => setPayload((p) => ({ ...p, ...patch }));

  const setTitle = (title: string) => {
    set({ title, ...(slugTouched ? {} : { slug: suggestSlug(title, payload.type) }) });
  };

  const applyTemplate = (key: string | null) => {
    if (key) {
      const t = TOPIC_TEMPLATES.find((x) => x.key === key)!;
      // 템플릿 스키마는 깊은 복사 — 편집이 프리셋 원본을 오염시키지 않게
      const schema = JSON.parse(JSON.stringify(t.schema)) as FormSchema;
      setPayload({
        title: t.defaultTitle,
        slug: suggestSlug(t.defaultTitle, t.type),
        type: t.type,
        description: t.notice,
        deadline: "",
        perPersonLimit: t.perPersonLimit,
        schema,
      });
    }
    setStep("edit");
  };

  // ── 필드 조작 ──────────────────────────────────────────
  const schema = payload.schema;
  const setField = (i: number, f: FieldBlock) =>
    set({ schema: schema.map((s, idx) => (idx === i ? f : s)) });
  const moveField = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= schema.length) return;
    const next = [...schema];
    [next[i], next[j]] = [next[j], next[i]];
    set({ schema: next });
  };
  const deleteField = (i: number) => set({ schema: schema.filter((_, idx) => idx !== i) });
  const addField = (block: FieldBlock["block"]) => {
    const base = { id: newId(), block, label: "", required: false } as FieldBlock;
    if (block === "select") (base as { options: string[] }).options = [];
    if (block === "repeat_group") {
      const rg = base as FieldBlock & { fields: FieldBlock[]; maxItems: number };
      rg.fields = [];
      rg.maxItems = 3;
    }
    set({ schema: [...schema, base] });
  };

  const save = () => {
    setMessage(undefined);
    startTransition(async () => {
      const result = await action(payload);
      if (result.ok) window.location.assign(result.redirectTo);
      else setMessage(result.message);
    });
  };

  // ── 1단계: 템플릿 선택 (생성 모드만) ─────────────────────
  if (step === "template") {
    return (
      <main>
        <h1 className="mb-1 text-lg font-bold">새 취합 만들기</h1>
        <p className="mb-4 text-sm text-gray-500">템플릿을 고르면 양식이 채워집니다. 이후 자유롭게 수정하세요.</p>
        <div className="space-y-3">
          {TOPIC_TEMPLATES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => applyTemplate(t.key)}
              className="block w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm hover:border-brand"
            >
              <p className="font-semibold">{t.name}</p>
              <p className="mt-0.5 text-sm text-gray-500">{t.description}</p>
            </button>
          ))}
          <button
            type="button"
            onClick={() => applyTemplate(null)}
            className="block w-full rounded-xl border-2 border-dashed border-gray-300 p-4 text-center text-sm text-gray-500 hover:border-brand hover:text-brand"
          >
            빈 양식으로 시작
          </button>
        </div>
      </main>
    );
  }

  // ── 2단계: 편집 + 미리보기 ───────────────────────────────
  return (
    <main className="pb-24">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">{mode === "create" ? "새 취합 만들기" : "양식 수정"}</h1>
        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${preview ? "bg-brand text-white" : "border border-brand text-brand"}`}
        >
          {preview ? "편집으로 돌아가기" : "미리보기"}
        </button>
      </div>

      {mode === "edit" && submissionCount > 0 && (
        <p className="mb-4 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
          이미 <b>{submissionCount}건</b>이 제출된 주제입니다. 항목 삭제 시 기존 데이터의 해당 열이 엑셀에서 제외되니 주의하세요.
        </p>
      )}

      {preview ? (
        <div className="rounded-xl border-2 border-brand bg-gray-50 p-4">
          <p className="mb-3 text-center text-xs font-medium text-brand">
            — 미리보기: 제출자에게 보이는 실제 화면입니다 —
          </p>
          <h2 className="mb-2 text-xl font-bold text-brand">{payload.title || "(제목 없음)"}</h2>
          {payload.description && (
            <div className="mb-4 whitespace-pre-wrap rounded-lg border-l-4 border-red-300 bg-red-50 px-3 py-2.5 text-sm text-gray-700">
              {payload.description}
            </div>
          )}
          <FormRenderer
            schema={schema}
            submitLabel="제 출 하 기"
            action={async () => ({ ok: false as const, message: "미리보기 모드입니다 — 실제로 제출되지 않습니다." })}
          />
        </div>
      ) : (
        <>
          {/* 기본 정보 */}
          <section className="mb-5 space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">취합 제목 *</label>
              <input type="text" className={inputCls} placeholder="예: 10월 잡설명회 참석 취합"
                value={payload.title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">유형</label>
                <select className={inputCls} value={payload.type} onChange={(e) => set({ type: e.target.value })}>
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  주소 (영문/숫자/하이픈) *{mode === "edit" && <span className="ml-1 text-orange-500">변경 시 기존 공유 링크 무효</span>}
                </label>
                <input type="text" className={inputCls + " font-mono"} placeholder="oct-jobfair"
                  value={payload.slug}
                  onChange={(e) => { setSlugTouched(true); set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }); }} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">안내문 (상단 빨간 박스)</label>
              <textarea className={inputCls + " h-20"} placeholder="※ 작성 전 확인사항 등"
                value={payload.description} onChange={(e) => set({ description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">마감일시 (비우면 무기한)</label>
                <input type="datetime-local" className={inputCls}
                  value={payload.deadline} onChange={(e) => set({ deadline: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">인당 한도 (비우면 무제한)</label>
                <input type="number" min={1} className={inputCls} placeholder="예: 3"
                  value={payload.perPersonLimit ?? ""}
                  onChange={(e) => set({ perPersonLimit: e.target.value ? Number(e.target.value) : null })} />
              </div>
            </div>
          </section>

          {/* 필드 목록 */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-600">입력 항목 ({schema.length}개)</h2>
            {schema.length === 0 && (
              <p className="rounded-xl border border-dashed border-gray-300 p-5 text-center text-sm text-gray-400">
                아래 버튼으로 입력 항목을 추가하세요
              </p>
            )}
            {schema.map((field, i) => (
              <FieldEditor
                key={field.id}
                field={field}
                index={i}
                total={schema.length}
                hasSubmissions={submissionCount > 0}
                onChange={(f) => setField(i, f)}
                onMove={(dir) => moveField(i, dir)}
                onDelete={() => deleteField(i)}
              />
            ))}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(Object.keys(BLOCK_LABELS) as FieldBlock["block"][]).map((b) => (
                <button key={b} type="button" onClick={() => addField(b)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 hover:border-brand hover:text-brand">
                  + {BLOCK_LABELS[b]}
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {/* 저장 바 */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white p-3">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          {message && <p className="flex-1 text-sm text-red-600">{message}</p>}
          {!message && (
            <p className="flex-1 text-xs text-gray-400">
              공유 주소: <span className="font-mono">/{payload.slug || "..."}</span>
            </p>
          )}
          <button type="button" onClick={save} disabled={pending}
            className="rounded-xl bg-brand px-8 py-3 font-semibold text-white disabled:opacity-50">
            {pending ? "저장 중..." : mode === "create" ? "개설하기" : "저장하기"}
          </button>
        </div>
      </div>
    </main>
  );
}
