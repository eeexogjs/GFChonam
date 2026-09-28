"use client";

import { useActionState } from "react";
import { branchLogin } from "./actions";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(branchLogin, {});

  return (
    <div className="card mx-auto max-w-sm">
      <h2 className="text-center text-lg font-bold text-brand-ink">지점장 로그인</h2>
      <p className="mt-1 text-center text-xs text-gray-400">
        성함과 사번을 입력하면 우리 지점 현황이 열려요
      </p>
      <form action={formAction} className="mt-4 space-y-2.5">
        <input type="text" name="name" autoFocus placeholder="성함" className="field-input" />
        <input type="text" name="code" inputMode="numeric" placeholder="사번" className="field-input" />
        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{state.error}</p>
        )}
        <button disabled={pending} className="btn-primary w-full py-3">
          {pending ? "확인 중..." : "로그인"}
        </button>
      </form>
      <p className="mt-3 text-center text-[11px] leading-relaxed text-gray-400">
        로그인이 안 되면 관리자(운영마스터)에게 지점장 등록을 요청하세요.
      </p>
    </div>
  );
}
