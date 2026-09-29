"use client";

import { useState, useTransition } from "react";
import FormRenderer from "@/components/form/FormRenderer";
import FieldEditor, { BLOCK_ICONS, BLOCK_LABELS } from "./FieldEditor";
import { suggestSlug } from "@/lib/slug";
import { TOPIC_TEMPLATES } from "@/lib/templates";
import { EMPTY_INVITE, INVITE_TEMPLATES, GREETING_PRESETS, type InviteSettings } from "@/lib/invite";
import InvitePreview from "@/components/invite/InvitePreview";
import { INFO_SUGGESTIONS, type InfoItem } from "@/lib/topic-info";
import type { FieldBlock, FormSchema } from "@/lib/form-schema";

export interface TopicPayload {
  title: string;
  slug: string;
  type: string;
  description: string;
  deadline: string; // "YYYY-MM-DDTHH:mm" (Asia/Seoul) 또는 ""
  perPersonLimit: number | null;
  capacity: number | null; // 정원 — 도달 시 자동 마감
  schema: FormSchema;
  invite: InviteSettings | null; // 초대장 설정 (없으면 기능 꺼짐)
  info: InfoItem[]; // 안내 정보 (일시/장소/강사/택배사/비용 안내 등)
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
      capacity: null,
      schema: [],
      invite: null,
      info: [],
    }
  );
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  const set = (patch: Partial<TopicPayload>) => setPayload((p) => ({ ...p, ...patch }));
  const setInvite = (patch: Partial<InviteSettings>) =>
    setPayload((p) => ({ ...p, invite: { ...(p.invite ?? EMPTY_INVITE), ...patch } }));

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
        capacity: null,
        schema,
        invite: null,
        // 유형별 추천 안내 항목을 빈 값으로 미리 깔아 "채워야 할 정보"를 보여준다
        info: (INFO_SUGGESTIONS[t.type] ?? []).slice(0, 4).map((label) => ({ label, value: "" })),
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
            submitLabel="신청 접수하기"
            stickySubmit={false}
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
                <label className="mb-1 block text-xs font-medium text-gray-500">인당 접수 한도 (비우면 무제한)</label>
                <input type="number" min={1} className={inputCls} placeholder="예: 3"
                  value={payload.perPersonLimit ?? ""}
                  onChange={(e) => set({ perPersonLimit: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">정원 (도달 시 자동 마감, 비우면 무제한)</label>
                <input type="number" min={1} className={inputCls} placeholder="예: 100"
                  value={payload.capacity ?? ""}
                  onChange={(e) => set({ capacity: e.target.value ? Number(e.target.value) : null })} />
              </div>
            </div>
          </section>

          {/* 안내 정보 — 일시/장소/강사/택배사/비용 안내 등, 신청 화면 상단 정보 카드로 노출 */}
          <section className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700">📌 안내 정보</h2>
            <p className="mt-0.5 text-xs text-gray-400">
              신청 화면 상단에 표로 보여요. 세미나라면 일시·장소·강사, 택배라면 발송일·택배사,
              그리고 비용(택배비·식비 등) 안내를 여기에 적어주세요. 값이 비어 있는 줄은 표시되지 않아요.
            </p>
            <div className="mt-3 space-y-2">
              {payload.info.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    className={inputCls + " w-32 shrink-0"}
                    placeholder="항목 (예: 일시)"
                    value={row.label}
                    onChange={(e) =>
                      set({ info: payload.info.map((r, idx) => (idx === i ? { ...r, label: e.target.value } : r)) })
                    }
                  />
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="내용 (예: 10월 16일(목) 오후 2시)"
                    value={row.value}
                    onChange={(e) =>
                      set({ info: payload.info.map((r, idx) => (idx === i ? { ...r, value: e.target.value } : r)) })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => set({ info: payload.info.filter((_, idx) => idx !== i) })}
                    className="shrink-0 rounded px-1.5 py-1 text-xs text-gray-400 hover:text-red-500"
                    aria-label="줄 삭제"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-gray-400">추가:</span>
              {(INFO_SUGGESTIONS[payload.type] ?? INFO_SUGGESTIONS.custom)
                .filter((s) => !payload.info.some((r) => r.label === s))
                .map((s) => (
                  <button key={s} type="button"
                    onClick={() => set({ info: [...payload.info, { label: s, value: "" }] })}
                    className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:border-brand hover:text-brand">
                    + {s}
                  </button>
                ))}
              <button type="button"
                onClick={() => set({ info: [...payload.info, { label: "", value: "" }] })}
                className="rounded-lg border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-500 hover:border-brand hover:text-brand">
                + 직접 입력
              </button>
            </div>
          </section>

          {/* 초대장 설정 — 켜면 접수 완료 화면에서 설계사가 고객별 초대장 이미지를 만들 수 있다 */}
          <section className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <label className="flex cursor-pointer items-center justify-between">
              <span>
                <span className="text-sm font-semibold text-gray-700">🎫 초대장 만들기 제공</span>
                <span className="mt-0.5 block text-xs text-gray-400">
                  켜면 신청 완료 화면에서 고객별 초대장 이미지를 만들어 카톡으로 보낼 수 있어요
                </span>
              </span>
              <input
                type="checkbox"
                className="h-5 w-5 accent-brand"
                checked={payload.invite?.enabled ?? false}
                onChange={(e) => setInvite({ enabled: e.target.checked })}
              />
            </label>

            {payload.invite?.enabled && (
              <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">디자인 템플릿</label>
                  <div className="flex flex-wrap gap-1.5">
                    {INVITE_TEMPLATES.map((t) => (
                      <button key={t.key} type="button" onClick={() => setInvite({ template: t.key })}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
                          (payload.invite?.template ?? "green") === t.key
                            ? "border-brand bg-brand-light font-semibold text-brand"
                            : "border-gray-300 text-gray-600"
                        }`}>
                        <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: `linear-gradient(160deg, ${t.bgTop}, ${t.bgBottom})` }} />
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">행사명 (초대장에 크게 표시) *</label>
                  <input type="text" className={inputCls} placeholder="예: VIP 자산관리 세미나"
                    value={payload.invite.eventName}
                    onChange={(e) => setInvite({ eventName: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">일시 (자유 서식)</label>
                    <input type="text" className={inputCls} placeholder="10월 16일(목) 오후 2시"
                      value={payload.invite.dateText}
                      onChange={(e) => setInvite({ dateText: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">장소</label>
                    <input type="text" className={inputCls} placeholder="삼성생명 광주사옥 3층 대강당"
                      value={payload.invite.placeText}
                      onChange={(e) => setInvite({ placeText: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">기본 인사말 (설계사가 고객별로 수정 가능)</label>
                  <textarea className={inputCls + " h-20"} value={payload.invite.greeting}
                    onChange={(e) => setInvite({ greeting: e.target.value })} />
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {GREETING_PRESETS.map((g, i) => (
                      <button key={i} type="button" onClick={() => setInvite({ greeting: g })}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:border-brand hover:text-brand">
                        추천 문구 {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">주최 표기 (하단)</label>
                  <input type="text" className={inputCls} value={payload.invite.host}
                    onChange={(e) => setInvite({ host: e.target.value })} />
                </div>
                {/* 입력하는 대로 갱신되는 실시간 미리보기 */}
                <div className="border-t border-gray-100 pt-3">
                  <InvitePreview invite={payload.invite} />
                </div>
              </div>
            )}
          </section>

          {/* 필드 목록 */}
          <section className="space-y-2">
            <div>
              <h2 className="text-sm font-semibold text-gray-600">📝 신청서 양식 구성</h2>
              <p className="mt-0.5 text-xs text-gray-400">
                설계사가 보는 신청서가 아래 순서 그대로 만들어져요. 항목을 누르면 펼쳐져 수정할 수
                있고, 우측 상단 [미리보기]로 실제 화면을 확인하세요.
              </p>
            </div>
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
            <div className="pt-1">
              <p className="mb-1.5 text-[11px] text-gray-400">블록 추가:</p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(BLOCK_LABELS) as FieldBlock["block"][]).map((b) => (
                  <button key={b} type="button" onClick={() => addField(b)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 hover:border-brand hover:text-brand">
                    {BLOCK_ICONS[b]} {BLOCK_LABELS[b]}
                  </button>
                ))}
              </div>
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
