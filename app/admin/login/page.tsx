"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, {});

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-center text-2xl font-bold text-brand-ink">관리자 로그인</h1>
      <p className="mb-6 text-center text-sm text-gray-500">등록된 관리자만 접근할 수 있어요</p>

      <form action={formAction} className="space-y-2.5">
        <input
          type="text"
          name="name"
          autoFocus
          placeholder="성함"
          className="field-input"
        />
        <input
          type="text"
          name="code"
          inputMode="numeric"
          placeholder="사번"
          className="field-input"
        />
        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="btn-primary w-full py-3.5"
        >
          {pending ? "확인 중..." : "로그인"}
        </button>
      </form>
    </main>
  );
}
