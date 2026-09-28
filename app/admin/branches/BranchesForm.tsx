"use client";

import { useActionState } from "react";
import { saveBranches } from "../actions";

export default function BranchesForm() {
  const [state, formAction, pending] = useActionState(saveBranches, {});

  return (
    <section className="card">
      <h2 className="mb-1 text-sm font-bold text-brand-ink">지점 등록/수정</h2>
      <p className="mb-2 text-xs leading-relaxed text-gray-500">
        한 줄에 <b>지점명,설계사수</b> 형식으로 입력하세요. 이미 있는 지점은 설계사수가
        갱신됩니다. (엑셀 두 열을 복사해 붙여넣어도 돼요)
      </p>
      <form action={formAction}>
        <textarea
          name="rows"
          rows={6}
          className="field-input h-36 font-mono text-sm"
          placeholder={"호남,5\n광주,8\n전남,6\n전북,7"}
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
