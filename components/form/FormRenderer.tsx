"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type {
  AddressValue,
  Answers,
  FieldBlock,
  FormSchema,
  RepeatGroupField,
  SimpleField,
  TextField,
} from "@/lib/form-schema";
import { validateAnswers, type FieldErrors } from "@/lib/validation";
import AnswersSummary from "./AnswersSummary";
import {
  AddressInput,
  CheckboxInput,
  DateInput,
  PhoneInput,
  SelectInput,
  TextInput,
} from "./fields";

export type SubmitResult =
  | { ok: true; redirectTo: string }
  | { ok: false; errors?: FieldErrors; message?: string };

type MemberCheck =
  | { state: "ok"; name: string; branch: string }
  | { state: "miss" }
  | { state: "idle" };

/**
 * form_schema JSON → 폼 렌더링.
 * 신규 제출·수정 화면·폼 빌더 미리보기가 이 컴포넌트 하나를 공유한다.
 */
export default function FormRenderer({
  schema,
  initialAnswers,
  submitLabel,
  action,
  stickySubmit = true,
}: {
  schema: FormSchema;
  initialAnswers?: Answers;
  submitLabel: string;
  action: (answers: Answers) => Promise<SubmitResult>;
  /** false면 하단 고정 대신 인라인 버튼 (빌더 미리보기용) */
  stickySubmit?: boolean;
}) {
  const [answers, setAnswers] = useState<Answers>(() => {
    const init: Answers = { ...(initialAnswers ?? {}) };
    for (const f of schema) {
      if (f.block === "repeat_group" && !Array.isArray(init[f.id])) {
        init[f.id] = f.required ? [{}] : [];
      }
    }
    return init;
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverMessage, setServerMessage] = useState<string>();
  const [member, setMember] = useState<MemberCheck>({ state: "idle" });
  const [showConfirm, setShowConfirm] = useState(false);
  const [sameAs, setSameAs] = useState<Record<string, boolean>>({});
  const [pending, startTransition] = useTransition();

  // 반복그룹 카드 추가 시 새 카드로 스크롤 + 첫 입력칸 포커스
  const focusTarget = useRef<string | null>(null);
  useEffect(() => {
    if (!focusTarget.current) return;
    const el = document.getElementById(focusTarget.current);
    focusTarget.current = null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const input = el.querySelector<HTMLElement>("input, select, textarea");
      setTimeout(() => input?.focus({ preventScroll: true }), 350);
    }
  }, [answers]);

  /** sameAsRole 필드의 원본 필드 id 찾기 (예: 발송인 이름 ← 신청자 이름) */
  const sourceIdOfRole = (role: string) =>
    schema.find((f) => f.role === role && f.block !== "heading")?.id;

  const set = (id: string, v: Answers[string]) =>
    setAnswers((a) => {
      const next = { ...a, [id]: v };
      // "신청자와 같습니다"가 체크된 필드는 원본이 바뀌면 함께 따라간다
      for (const f of schema) {
        if (
          f.block === "text" &&
          f.sameAsRole &&
          sameAs[f.id] &&
          sourceIdOfRole(f.sameAsRole) === id
        ) {
          next[f.id] = v;
        }
      }
      return next;
    });

  const toggleSameAs = (fieldId: string, role: string, checked: boolean) => {
    setSameAs((s) => ({ ...s, [fieldId]: checked }));
    if (checked) {
      const srcId = sourceIdOfRole(role);
      if (srcId) setAnswers((a) => ({ ...a, [fieldId]: a[srcId] ?? "" }));
    }
  };

  const scrollToFirstError = (errs: FieldErrors) => {
    const first = Object.keys(errs)[0];
    if (first) {
      document.getElementById(`f-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  /** 코드 필드 blur 시 명단 대조 → 성함·지점 자동 입력 */
  const checkMember = async (code: string) => {
    if (!code) return setMember({ state: "idle" });
    try {
      const res = await fetch(`/api/member?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (data?.found) {
        setMember({ state: "ok", name: data.name, branch: data.branch });
        setAnswers((a) => {
          const next = { ...a };
          for (const f of schema) {
            if (f.role === "submitter.name" && !next[f.id]) next[f.id] = data.name;
            if (f.role === "submitter.branch" && !next[f.id]) next[f.id] = data.branch;
          }
          return next;
        });
      } else if (data?.registered === false) {
        setMember({ state: "idle" }); // 명단 미등록 운영 상태 — 검증 안 함
      } else {
        setMember({ state: "miss" });
      }
    } catch {
      setMember({ state: "idle" });
    }
  };

  /** 1단계: 검증 통과 시 "입력 내용 확인" 시트를 연다 */
  const handleSubmit = () => {
    const errs = validateAnswers(schema, answers);
    setErrors(errs);
    setServerMessage(undefined);
    if (Object.keys(errs).length > 0) {
      scrollToFirstError(errs);
      setServerMessage(`입력하지 않았거나 잘못된 항목이 ${Object.keys(errs).length}개 있어요. 빨간 표시를 확인해주세요.`);
      return;
    }
    setShowConfirm(true);
  };

  /** 2단계: 확인 시트에서 최종 접수 — 실패해도 입력값은 그대로 유지된다 */
  const doSubmit = () => {
    startTransition(async () => {
      const result = await action(answers);
      if (result.ok) {
        window.location.assign(result.redirectTo);
      } else {
        setShowConfirm(false);
        if (result.errors) {
          setErrors(result.errors);
          scrollToFirstError(result.errors);
        }
        setServerMessage(result.message ?? (result.errors ? "입력 내용을 다시 확인해주세요." : "접수에 실패했어요. 입력 내용은 그대로 있으니 잠시 후 다시 시도해주세요."));
      }
    });
  };

  const memberHint =
    member.state === "ok" ? (
      <span className="font-medium text-emerald-600">✓ {member.branch} · {member.name}님 확인되었습니다</span>
    ) : member.state === "miss" ? (
      <span className="font-medium text-orange-500">등록되지 않은 코드예요. 코드를 다시 확인해주세요.</span>
    ) : undefined;

  const renderSimple = (
    field: SimpleField,
    path: string,
    value: Answers[string],
    onChange: (v: Answers[string]) => void
  ) => {
    const error = errors[path];
    switch (field.block) {
      case "text": {
        const tf = field as TextField;
        const isCode = field.role === "submitter.code";
        const hasSameAs = !!tf.sameAsRole && path === field.id; // 반복그룹 내부에서는 비활성
        return (
          <TextInput
            key={path}
            field={tf}
            path={path}
            value={(value as string) ?? ""}
            error={error}
            hint={isCode ? memberHint : undefined}
            onChange={onChange}
            onBlur={isCode ? checkMember : undefined}
            sameAsChecked={hasSameAs ? sameAs[field.id] : undefined}
            onToggleSameAs={
              hasSameAs ? (checked) => toggleSameAs(field.id, tf.sameAsRole!, checked) : undefined
            }
          />
        );
      }
      case "select":
        return <SelectInput key={path} field={field} path={path} value={(value as string) ?? ""} error={error} onChange={onChange} />;
      case "phone":
        return <PhoneInput key={path} field={field} path={path} value={(value as string) ?? ""} error={error} onChange={onChange} />;
      case "date":
        return <DateInput key={path} field={field} path={path} value={(value as string) ?? ""} error={error} onChange={onChange} />;
      case "checkbox":
        return <CheckboxInput key={path} field={field} path={path} value={!!value} error={error} onChange={onChange} />;
      case "address":
        return <AddressInput key={path} field={field} path={path} value={value as AddressValue | undefined} error={error} onChange={onChange} />;
    }
  };

  const renderRepeatGroup = (field: RepeatGroupField) => {
    const items = (answers[field.id] as Record<string, unknown>[]) ?? [];
    const label = field.itemLabel ?? field.label;
    const max = field.maxItems ?? 99;
    const min = field.required ? Math.max(field.minItems ?? 1, 1) : field.minItems ?? 0;

    const setItem = (i: number, subId: string, v: unknown) => {
      const next = items.map((it, idx) => (idx === i ? { ...it, [subId]: v } : it));
      set(field.id, next as Answers[string]);
    };

    return (
      <div key={field.id} id={`f-${field.id}`} className="mb-6 scroll-mt-28">
        {errors[field.id] && (
          <p className="mb-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
            {errors[field.id]}
          </p>
        )}
        {items.map((item, i) => (
          <div key={i} className="card mb-3">
            <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-2.5">
              <span className="flex items-center gap-2 font-bold text-brand-ink">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                  {i + 1}
                </span>
                {label} {i + 1}
                {i >= min && <span className="text-xs font-normal text-gray-400">(선택)</span>}
              </span>
              {items.length > min && (
                <button
                  type="button"
                  onClick={() => set(field.id, items.filter((_, idx) => idx !== i) as Answers[string])}
                  className="text-xs text-gray-400 underline"
                >
                  삭제
                </button>
              )}
            </div>
            {field.fields.map((sub) =>
              renderSimple(sub, `${field.id}.${i}.${sub.id}`, item?.[sub.id] as Answers[string], (v) => setItem(i, sub.id, v))
            )}
          </div>
        ))}
        {items.length < max && (
          <button
            type="button"
            onClick={() => {
              const firstSub = field.fields[0]?.id;
              if (firstSub) focusTarget.current = `f-${field.id}.${items.length}.${firstSub}`;
              set(field.id, [...items, {}] as Answers[string]);
            }}
            className="w-full rounded-2xl border-2 border-dashed border-brand/25 bg-brand-light/40 py-3.5 text-sm font-semibold text-brand"
          >
            + {label} 추가하기 ({items.length}/{max})
          </button>
        )}
      </div>
    );
  };

  const submitButton = (
    <>
      {serverMessage && (
        <p className="mb-2 text-center text-xs font-medium text-red-500">{serverMessage}</p>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={handleSubmit}
        className="btn-primary w-full py-4 text-base"
      >
        {pending ? "접수하고 있어요..." : submitLabel}
      </button>
    </>
  );

  // 모바일 하단 바에 "○○ N명 작성 중" 카운터 — 첫 반복그룹 기준
  const counterRg = schema.find((f) => f.block === "repeat_group") as RepeatGroupField | undefined;
  const counterCount = counterRg
    ? (Array.isArray(answers[counterRg.id]) ? (answers[counterRg.id] as unknown[]).length : 0)
    : 0;

  // PC에서는 이름·사번(신청자 정보)을 나란히 — 연속된 name/code 필드를 한 행으로 묶는다
  const chunks: (FieldBlock | [FieldBlock, FieldBlock])[] = [];
  for (let i = 0; i < schema.length; i++) {
    const f = schema[i] as FieldBlock;
    const n = schema[i + 1] as FieldBlock | undefined;
    if (n && f.role === "submitter.name" && n.role === "submitter.code") {
      chunks.push([f, n]);
      i++;
    } else {
      chunks.push(f);
    }
  }

  const renderTop = (field: FieldBlock) => {
    if (field.block === "heading") {
      return (
        <h2
          key={field.id}
          className="mb-3 mt-7 flex items-center gap-2 text-[15px] font-bold text-brand-ink first:mt-0"
        >
          <span className="h-4 w-1 rounded-full bg-brand" aria-hidden />
          {field.label}
        </h2>
      );
    }
    return field.block === "repeat_group"
      ? renderRepeatGroup(field)
      : renderSimple(field, field.id, answers[field.id], (v) => set(field.id, v));
  };

  return (
    <div className={stickySubmit ? "pb-28" : ""}>
      {chunks.map((chunk) =>
        Array.isArray(chunk) ? (
          <div key={chunk[0].id} className="lg:grid lg:grid-cols-2 lg:gap-x-4">
            {chunk.map((f) => renderTop(f))}
          </div>
        ) : (
          renderTop(chunk)
        )
      )}

      {stickySubmit ? (
        <>
          {/* 모바일: 하단 고정 바 — 작성 중 인원 카운터 + 제출 버튼 */}
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-100 bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 shadow-floatbar backdrop-blur lg:hidden">
            <div className="mx-auto max-w-md">
              {serverMessage && (
                <p className="mb-2 text-center text-xs font-medium text-red-500">{serverMessage}</p>
              )}
              <div className="flex items-center gap-3">
                {counterRg && (
                  <span className="shrink-0 text-[13px] font-semibold leading-tight text-gray-500">
                    {counterRg.itemLabel ?? counterRg.label}{" "}
                    <b className="text-base text-brand">{counterCount}</b>명
                    <span className="block text-[11px] font-normal text-gray-400">작성 중</span>
                  </span>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={handleSubmit}
                  className="btn-primary flex-1 py-4 text-base"
                >
                  {pending ? "접수하고 있어요..." : submitLabel}
                </button>
              </div>
            </div>
          </div>
          {/* PC: 폼 흐름 안 인라인 버튼 */}
          <div className="mt-6 hidden lg:block">{submitButton}</div>
        </>
      ) : (
        <div className="mt-6">{submitButton}</div>
      )}

      {/* 제출 전 "입력 내용 확인" 시트 */}
      {showConfirm && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
          <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl bg-white sm:rounded-3xl">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-lg font-bold text-brand-ink">입력 내용을 확인해주세요</h2>
              <p className="mt-0.5 text-xs text-gray-400">아래 내용으로 접수됩니다</p>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <AnswersSummary schema={schema} answers={answers} />
            </div>
            <div className="flex gap-2 border-t border-gray-100 px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-3">
              <button
                type="button"
                disabled={pending}
                onClick={() => setShowConfirm(false)}
                className="btn-ghost flex-1 py-3.5"
              >
                다시 수정하기
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={doSubmit}
                className="btn-primary flex-1 py-3.5"
              >
                {pending ? "접수 중..." : "이대로 접수하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
