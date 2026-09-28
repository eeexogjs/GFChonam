"use client";

import { useActionState } from "react";
import { registerMembers } from "../actions";

export default function MembersForm() {
  const [state, formAction, pending] = useActionState(registerMembers, {});

  return (
    <section className="card">
      <h2 className="mb-1 text-sm font-bold text-brand-ink">명단 등록/갱신</h2>
      <p className="mb-2 text-xs leading-relaxed text-gray-500">
        엑셀에서 <b>코드·성함·지점</b> 세 열을 복사해 그대로 붙여넣으세요 (한 줄에 한 명).
        이미 있는 코드는 이름·지점이 갱신됩니다.
      </p>
      <form action={formAction}>
        <textarea
          name="rows"
          rows={8}
          className="field-input h-44 font-mono text-sm"
          placeholder={"1027490,김종수,호남\n3333333,박지민,광주"}
        />
        {state.error && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{state.error}</p>
        )}
        {state.message && (
          <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{state.message}</p>
        )}
        <button disabled={pending} className="btn-primary mt-3 w-full py-3">
          {pending ? "등록 중..." : "명단 등록하기"}
        </button>
      </form>
    </section>
  );
}
