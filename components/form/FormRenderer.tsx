"use client";

import { useState, useTransition } from "react";
import type {
  AddressValue,
  Answers,
  FormSchema,
  RepeatGroupField,
  SimpleField,
} from "@/lib/form-schema";
import { validateAnswers, type FieldErrors } from "@/lib/validation";
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

/**
 * form_schema JSON → 폼 렌더링.
 * 하드코딩 금지 원칙의 실체 — 제출 화면(신규)과 수정 화면이 이 컴포넌트 하나를 공유하고,
 * 4단계 폼 빌더의 "미리보기"도 이 컴포넌트를 재사용한다.
 */
export default function FormRenderer({
  schema,
  initialAnswers,
  submitLabel,
  action,
}: {
  schema: FormSchema;
  initialAnswers?: Answers;
  submitLabel: string;
  action: (answers: Answers) => Promise<SubmitResult>;
}) {
  const [answers, setAnswers] = useState<Answers>(() => {
    const init: Answers = { ...(initialAnswers ?? {}) };
    // required repeat_group은 최소 1건이 펼쳐진 상태로 시작
    for (const f of schema) {
      if (f.block === "repeat_group" && !Array.isArray(init[f.id])) {
        init[f.id] = f.required ? [{}] : [];
      }
    }
    return init;
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverMessage, setServerMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  const set = (id: string, v: Answers[string]) =>
    setAnswers((a) => ({ ...a, [id]: v }));

  const scrollToFirstError = (errs: FieldErrors) => {
    const first = Object.keys(errs)[0];
    if (first) {
      document.getElementById(`f-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleSubmit = () => {
    const errs = validateAnswers(schema, answers);
    setErrors(errs);
    setServerMessage(undefined);
    if (Object.keys(errs).length > 0) {
      scrollToFirstError(errs);
      return;
    }
    startTransition(async () => {
      const result = await action(answers);
      if (result.ok) {
        window.location.assign(result.redirectTo);
      } else {
        if (result.errors) {
          setErrors(result.errors);
          scrollToFirstError(result.errors);
        }
        setServerMessage(result.message ?? (result.errors ? undefined : "제출에 실패했습니다. 잠시 후 다시 시도해주세요."));
      }
    });
  };

  const renderSimple = (field: SimpleField, path: string, value: Answers[string], onChange: (v: Answers[string]) => void) => {
    const error = errors[path];
    switch (field.block) {
      case "text":
        return <TextInput key={path} field={field} path={path} value={(value as string) ?? ""} error={error} onChange={onChange} />;
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
      <div key={field.id} id={`f-${field.id}`} className="mb-6 scroll-mt-24">
        {errors[field.id] && (
          <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errors[field.id]}</p>
        )}
        {items.map((item, i) => (
          <div key={i} className="mb-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="font-semibold text-brand">
                {label} {i + 1}
                {i >= min && <span className="ml-1 text-xs font-normal text-gray-400">(선택)</span>}
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
            onClick={() => set(field.id, [...items, {}] as Answers[string])}
            className="w-full rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm text-gray-500"
          >
            + {label} 추가 ({items.length}/{max})
          </button>
        )}
      </div>
    );
  };

  return (
    <div>
      {schema.map((field) =>
        field.block === "repeat_group"
          ? renderRepeatGroup(field)
          : renderSimple(field, field.id, answers[field.id], (v) => set(field.id, v))
      )}

      {serverMessage && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {serverMessage}
        </p>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={handleSubmit}
        className="w-full rounded-xl bg-brand py-3.5 font-semibold text-white disabled:opacity-50"
      >
        {pending ? "처리 중..." : submitLabel}
      </button>
    </div>
  );
}
