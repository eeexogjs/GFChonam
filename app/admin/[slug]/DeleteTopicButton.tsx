"use client";

import { useTransition } from "react";
import { deleteTopic } from "../actions";

/**
 * 취합 삭제 버튼 — 마감/초안 상태에서만 노출된다 (공개 중에는 먼저 마감).
 * 응답 데이터까지 완전히 사라지므로 제목을 직접 입력해야 지워진다.
 */
export default function DeleteTopicButton({
  slug,
  title,
  count,
}: {
  slug: string;
  title: string;
  count: number;
}) {
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    const typed = window.prompt(
      `'${title}' 취합을 완전히 삭제합니다.\n` +
        `응답 ${count}건도 함께 삭제되며 복구할 수 없어요.\n\n` +
        `삭제하려면 취합 제목을 그대로 입력하세요:`
    );
    if (typed === null) return;
    if (typed.trim() !== title.trim()) {
      window.alert("제목이 일치하지 않아 삭제하지 않았어요.");
      return;
    }
    startTransition(() => deleteTopic(slug));
  };

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleClick}
      className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-50 disabled:opacity-40"
    >
      {pending ? "삭제 중..." : "삭제"}
    </button>
  );
}
