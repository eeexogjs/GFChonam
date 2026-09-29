"use client";

import { useEffect, useRef, useState } from "react";
import type {
  AddressValue,
  SelectField,
  SimpleField,
  TextField,
} from "@/lib/form-schema";

/** 공통 래퍼 — path는 에러 스크롤 앵커(id="f-{path}")로 쓰인다 */
export function FieldShell({
  path,
  label,
  required,
  error,
  hint,
  children,
}: {
  path: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div id={`f-${path}`} className="mb-4 scroll-mt-28">
      <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">
        {label}
        {required && <span className="ml-0.5 text-brand">*</span>}
      </label>
      {children}
      {hint && !error && <div className="mt-1.5 text-xs">{hint}</div>}
      {error && (
        <p className="mt-1.5 flex items-start gap-1 text-xs font-medium text-red-500">
          <span aria-hidden>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

const inputCls = (error?: string) =>
  `field-input ${error ? "field-input-error" : ""}`;

export function TextInput({
  field,
  path,
  value,
  error,
  hint,
  onChange,
  onBlur,
  sameAsChecked,
  onToggleSameAs,
}: {
  field: TextField;
  path: string;
  value: string;
  error?: string;
  hint?: React.ReactNode;
  onChange: (v: string) => void;
  onBlur?: (v: string) => void;
  /** "신청자와 같습니다" 체크 상태 (sameAsRole 필드에만 전달됨) */
  sameAsChecked?: boolean;
  onToggleSameAs?: (checked: boolean) => void;
}) {
  const numeric = field.pattern?.includes("[0-9]") || field.pattern?.includes("\\d");
  return (
    <FieldShell path={path} label={field.label} required={field.required} error={error} hint={hint}>
      {onToggleSameAs && (
        <label className="mb-1.5 flex items-center gap-1.5 text-[13px] text-gray-600">
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand"
            checked={!!sameAsChecked}
            onChange={(e) => onToggleSameAs(e.target.checked)}
          />
          {field.sameAsLabel ?? "신청자와 같습니다"}
        </label>
      )}
      <input
        type="text"
        inputMode={numeric ? "numeric" : "text"}
        className={inputCls(error) + (sameAsChecked ? " bg-gray-50 text-gray-500" : "")}
        placeholder={field.placeholder}
        maxLength={field.maxLength}
        value={value ?? ""}
        readOnly={!!sameAsChecked}
        onChange={(e) =>
          onChange(numeric ? e.target.value.replace(/[^0-9]/g, "") : e.target.value)
        }
        onBlur={(e) => onBlur?.(e.target.value)}
      />
    </FieldShell>
  );
}

export function SelectInput({
  field,
  path,
  value,
  error,
  onChange,
}: {
  field: SelectField;
  path: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  return (
    <FieldShell path={path} label={field.label} required={field.required} error={error}>
      <select
        className={inputCls(error) + (value ? "" : " text-gray-400")}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">선택해주세요</option>
        {field.options.map((o) => (
          <option key={o} value={o} className="text-gray-900">
            {o}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

/**
 * 연락처 — 휴대전화(010)와 지역번호(02, 062 등)를 모두 받는 단일 입력.
 * 숫자만 입력하면 하이픈이 자동으로 들어간다. 값은 "010-1234-5678" 형태로 저장.
 */
export function formatPhone(raw: string): string {
  const d = raw.replace(/[^0-9]/g, "").slice(0, 11);
  if (d.startsWith("02")) {
    // 서울 국번: 02 + 3~4자리 + 4자리
    if (d.length <= 2) return d;
    if (d.length <= 5) return `02-${d.slice(2)}`;
    if (d.length <= 9) return `02-${d.slice(2, 5)}-${d.slice(5, 9)}`;
    return `02-${d.slice(2, 6)}-${d.slice(6, 10)}`;
  }
  // 그 외: 3자리 식별번호 + 3~4자리 + 4자리
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 10)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`;
}

export function PhoneInput({
  field,
  path,
  value,
  error,
  onChange,
}: {
  field: SimpleField;
  path: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  return (
    <FieldShell path={path} label={field.label} required={field.required} error={error}>
      <input
        type="tel"
        inputMode="numeric"
        className={inputCls(error)}
        placeholder="010-1234-5678 (지역번호 가능)"
        value={value ?? ""}
        onChange={(e) => onChange(formatPhone(e.target.value))}
      />
    </FieldShell>
  );
}

export function DateInput({
  field,
  path,
  value,
  error,
  onChange,
}: {
  field: SimpleField;
  path: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  return (
    <FieldShell path={path} label={field.label} required={field.required} error={error}>
      <input
        type="date"
        className={inputCls(error)}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldShell>
  );
}

export function CheckboxInput({
  field,
  path,
  value,
  error,
  onChange,
}: {
  field: SimpleField;
  path: string;
  value: boolean;
  error?: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <div id={`f-${path}`} className="mb-4 scroll-mt-28">
      <label className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3.5 py-3">
        <input
          type="checkbox"
          className="h-5 w-5 accent-brand"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="text-[15px] text-gray-700">
          {field.label}
          {field.required && <span className="ml-0.5 text-brand">*</span>}
        </span>
      </label>
      {error && (
        <p className="mt-1.5 flex items-start gap-1 text-xs font-medium text-red-500">
          <span aria-hidden>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

/**
 * 다음(카카오) 우편번호 검색 — 팝업이 아닌 "임베드 모드".
 * 카카오톡 인앱브라우저는 window.open 팝업이 차단/이탈되는 경우가 있어
 * 페이지 안에 검색 레이어를 펼치는 방식이 안전하다.
 */
declare global {
  interface Window {
    daum?: {
      Postcode: new (opts: {
        oncomplete: (data: { zonecode: string; roadAddress: string; jibunAddress: string }) => void;
        width: string;
        height: string;
      }) => { embed: (el: HTMLElement) => void };
    };
  }
}

const POSTCODE_SRC = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

function loadPostcodeScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.daum?.Postcode) return resolve();
    const existing = document.querySelector(`script[src="${POSTCODE_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const s = document.createElement("script");
    s.src = POSTCODE_SRC;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("주소 검색을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."));
    document.head.appendChild(s);
  });
}

export function AddressInput({
  field,
  path,
  value,
  error,
  onChange,
}: {
  field: SimpleField;
  path: string;
  value: AddressValue | undefined;
  error?: string;
  onChange: (v: AddressValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const embedRef = useRef<HTMLDivElement>(null);
  const v = value ?? { postcode: "", address: "", detail: "" };

  // 검색 레이어가 열린 동안 뒤 페이지 스크롤 잠금 (모바일 전체화면 UX)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !embedRef.current) return;
    let cancelled = false;
    loadPostcodeScript()
      .then(() => {
        if (cancelled || !embedRef.current || !window.daum) return;
        embedRef.current.innerHTML = "";
        new window.daum.Postcode({
          width: "100%",
          height: "100%",
          oncomplete: (data) => {
            onChange({
              postcode: data.zonecode,
              address: data.roadAddress || data.jibunAddress,
              detail: v.detail,
            });
            setOpen(false);
          },
        }).embed(embedRef.current);
      })
      .catch((e) => setLoadError(e.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <FieldShell path={path} label={field.label} required={field.required} error={error ?? loadError}>
      <div className="flex gap-2">
        <input
          type="text"
          readOnly
          className={inputCls(error) + " flex-1 cursor-pointer bg-gray-50"}
          placeholder="주소 검색을 눌러주세요"
          value={v.address ? `${v.address} (${v.postcode})` : ""}
          onClick={() => setOpen(true)}
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-xl bg-brand-ink px-4 py-3 text-sm font-medium text-white"
        >
          주소 검색
        </button>
      </div>
      {/* 주소 검색 — 모바일은 전체화면, PC는 중앙 모달 (좁은 카드 안 이중 스크롤 방지) */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/45 sm:items-center sm:justify-center sm:p-6">
          <div className="flex h-full w-full flex-col overflow-hidden bg-white sm:h-[600px] sm:max-w-lg sm:rounded-2xl sm:shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-bold text-brand-ink">주소 검색</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-gray-200 px-3.5 py-1.5 text-sm font-medium text-gray-600"
              >
                닫기
              </button>
            </div>
            <div ref={embedRef} className="min-h-0 w-full flex-1" />
          </div>
        </div>
      )}
      <input
        type="text"
        className={inputCls(undefined) + " mt-2"}
        placeholder="상세주소 (동·호수 등)"
        value={v.detail}
        onChange={(e) => onChange({ ...v, detail: e.target.value })}
      />
    </FieldShell>
  );
}
