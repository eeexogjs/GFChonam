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
  children,
}: {
  path: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div id={`f-${path}`} className="mb-4 scroll-mt-24">
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

const inputCls = (error?: string) =>
  `w-full rounded-lg border bg-white px-3 py-2.5 outline-none transition-colors focus:border-brand ${
    error ? "border-red-400" : "border-gray-300"
  }`;

export function TextInput({
  field,
  path,
  value,
  error,
  onChange,
}: {
  field: TextField;
  path: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  const numeric = field.pattern?.includes("[0-9]") || field.pattern?.includes("\\d");
  return (
    <FieldShell path={path} label={field.label} required={field.required} error={error}>
      <input
        type="text"
        inputMode={numeric ? "numeric" : "text"}
        className={inputCls(error)}
        placeholder={field.placeholder}
        maxLength={field.maxLength}
        value={value ?? ""}
        onChange={(e) =>
          onChange(numeric ? e.target.value.replace(/[^0-9]/g, "") : e.target.value)
        }
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
        className={inputCls(error)}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">-- 선택 --</option>
        {field.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

/** 010 고정 3분할 — 값은 "010-1234-5678" 문자열로 합쳐서 저장 */
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
  const [, mid = "", last = ""] = (value ?? "").split("-");
  const lastRef = useRef<HTMLInputElement>(null);

  const set = (m: string, l: string) => {
    onChange(m || l ? `010-${m}-${l}` : "");
  };

  return (
    <FieldShell path={path} label={field.label} required={field.required} error={error}>
      <div className="flex items-center gap-2">
        <span className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-2.5 text-gray-600">
          010
        </span>
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          className={inputCls(error) + " text-center"}
          value={mid}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9]/g, "");
            set(v, last);
            if (v.length === 4) lastRef.current?.focus();
          }}
        />
        <span className="text-gray-400">-</span>
        <input
          ref={lastRef}
          type="text"
          inputMode="numeric"
          maxLength={4}
          className={inputCls(error) + " text-center"}
          value={last}
          onChange={(e) => set(mid, e.target.value.replace(/[^0-9]/g, ""))}
        />
      </div>
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
    <div id={`f-${path}`} className="mb-4 scroll-mt-24">
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          className="h-4 w-4 accent-brand"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
        {field.label}
        {field.required && <span className="text-red-500">*</span>}
      </label>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/**
 * 다음(카카오) 우편번호 검색 — 팝업이 아닌 "임베드 모드"를 쓴다.
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
    s.onerror = () => reject(new Error("우편번호 서비스를 불러오지 못했습니다."));
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
          className={inputCls(error) + " flex-1 bg-gray-50"}
          placeholder="주소 검색을 눌러주세요"
          value={v.address ? `${v.address} (${v.postcode})` : ""}
          onClick={() => setOpen(true)}
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 rounded-lg bg-gray-800 px-4 py-2.5 text-sm text-white"
        >
          {open ? "닫기" : "검색"}
        </button>
      </div>
      {open && (
        <div
          ref={embedRef}
          className="mt-2 h-[420px] w-full overflow-hidden rounded-lg border border-gray-300"
        />
      )}
      <input
        type="text"
        className={inputCls(undefined) + " mt-2"}
        placeholder="상세주소 입력"
        value={v.detail}
        onChange={(e) => onChange({ ...v, detail: e.target.value })}
      />
    </FieldShell>
  );
}
