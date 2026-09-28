"use client";

import { useActionState } from "react";
import { saveBranches } from "../actions";

export default function BranchesForm() {
  const [state, formAction, pending] = useActionState(saveBranches, {});

  return (
    <section className="card">
      <h2 className="mb-1 text-sm font-bold text-brand-ink">지점 등록/수정</h2>
      <p className="mb-2 text-xs leading-relaxed text-gray-500">
        한 줄에 <b>지점명,설계사수,지점장성함,지점장사번</b> 형식으로 입력하세요.
        지점장 성함/사번은 <b>지점장 모드 로그인</b>에 쓰이며, 생략하면 기존 값이 유지됩니다.
        (엑셀 열 복사 붙여넣기 가능)
      </p>
      <form action={formAction}>
        <textarea
          name="rows"
          rows={6}
          className="field-input h-36 font-mono text-sm"
          placeholder={"호남,5,윤지점,20001\n광주,8,김광주,20002\n전남,6\n전북,7"}
        />
        {state.error && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{state.error}</p>
        )}
        {state.message && (
          <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{state.message}</p>
        )}
        <button disabled={pending} className="btn-primary mt-3 w-full py-3">
          {pending ? "저장 중..." : "저장하기"}
        </button>
      </form>
    </section>
  );
}
