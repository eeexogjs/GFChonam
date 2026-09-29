"use client";

import { useActionState } from "react";
import Link from "next/link";
import { findMySubmissions, type FindResult } from "./actions";

export default function FindForm() {
  const [state, formAction, pending] = useActionState<FindResult, FormData>(findMySubmissions, {});

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  return (
    <>
      <section className="card">
        <form action={formAction} className="space-y-2.5">
          <input type="text" name="name" autoFocus placeholder="성함" className="field-input" />
          <input type="text" name="code" inputMode="numeric" placeholder="사번" className="field-input" />
          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{state.error}</p>
          )}
          <button disabled={pending} className="btn-primary w-full py-3.5">
            {pending ? "조회 중..." : "내 접수 조회하기"}
          </button>
        </form>
        <p className="mt-3 text-center text-[11px] leading-relaxed text-gray-400">
          신청서에 입력한 성함·사번 그대로 조회됩니다.
          <br />
          조회가 안 되면 담당자에게 문의해주세요.
        </p>
      </section>

      {state.rows && (
        <section className="mt-4 space-y-2.5">
          <h2 className="text-sm font-bold text-brand-ink">
            내 접수 내역 <span className="text-brand">{state.rows.length}건</span>
          </h2>
          {state.rows.map((r) => (
            <Link
              key={r.token}
              href={`/${r.slug}/done/${r.token}`}
              className="card block transition-all hover:border-brand/40"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-bold text-brand-ink">{r.title}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    r.status === "open"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {r.status === "open" ? "수정 가능" : "마감됨"}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-gray-400">접수 {fmt(r.createdAt)}</p>
              <p className="mt-2 text-sm font-semibold text-brand">내역 확인 · 수정하기 →</p>
            </Link>
          ))}
        </section>
      )}
    </>
  );
}
