"use client";

import { useTransition } from "react";
import { deleteBranch } from "../actions";

/**
 * 지점 삭제 버튼 — 실수 방지를 위해 한 번 확인을 거친다.
 * 지점을 지우면 해당 지점장 로그인도 함께 막히므로 안내 문구에 명시한다.
 */
export default function DeleteBranchButton({ name }: { name: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`'${name}' 지점을 삭제할까요?\n해당 지점장 로그인도 함께 사용할 수 없게 됩니다.\n(제출된 신청 데이터는 삭제되지 않아요)`)) return;
        startTransition(() => deleteBranch(name));
      }}
      className="rounded-lg px-2 py-1 text-xs font-semibold text-red-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
    >
      {pending ? "삭제 중" : "삭제"}
    </button>
  );
}
