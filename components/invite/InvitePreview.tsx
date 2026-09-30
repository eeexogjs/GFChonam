"use client";

import { useEffect, useRef, useState } from "react";
import { INVITE_TEMPLATES, type InviteSettings } from "@/lib/invite";
import { ensureInviteFonts, renderInvite } from "./invite-canvas";

/**
 * 관리자 빌더용 초대장 실시간 미리보기 — 입력하는 대로 다시 그린다.
 * 고객명은 예시("홍길동")로 채워 보여준다.
 */
export default function InvitePreview({ invite }: { invite: InviteSettings }) {
  const [imgUrl, setImgUrl] = useState<string>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvasRef.current = canvas;
      await ensureInviteFonts();
      const tpl =
        INVITE_TEMPLATES.find((x) => x.key === invite.template) ?? INVITE_TEMPLATES[0];
      renderInvite(canvas, tpl, invite, "홍길동", invite.greeting);
      setImgUrl(canvas.toDataURL("image/png"));
    }, 400);
    return () => clearTimeout(t);
  }, [invite]);

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-gray-500">
        미리보기 <span className="text-gray-400">(고객명 예시: 홍길동 — 설계사가 실제 고객명으로 바꿔 만듭니다)</span>
      </p>
      {imgUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imgUrl} alt="초대장 미리보기" className="w-full max-w-[300px] rounded-xl border border-gray-200 shadow-sm" />
      ) : (
        <div className="flex aspect-[1080/1350] w-full max-w-[300px] items-center justify-center rounded-xl bg-gray-50 text-xs text-gray-400">
          미리보기 준비 중...
        </div>
      )}
    </div>
  );
}
