"use client";

import { useState } from "react";

/** 클립보드 복사 — 카카오 인앱 등 navigator.clipboard 미지원 환경 폴백 포함 */
export default function CopyLinkButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 구형 웹뷰 폴백
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="w-full rounded-xl border border-brand py-3 font-medium text-brand"
    >
      {copied ? "복사되었습니다 ✓" : label}
    </button>
  );
}
