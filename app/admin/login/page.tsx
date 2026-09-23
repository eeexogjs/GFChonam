"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, {});

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-center text-2xl font-bold text-brand">취합ON 관리자</h1>
      <p className="mb-6 text-center text-sm text-gray-500">마스터 비밀번호를 입력하세요</p>

      <form action={formAction} className="space-y-3">
        <input
          type="password"
          name="password"
          autoFocus
          placeholder="비밀번호"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-brand"
        />
        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-brand py-3 font-semibold text-white disabled:opacity-50"
        >
          {pending ? "확인 중..." : "로그인"}
        </button>
      </form>
    </main>
  );
}
