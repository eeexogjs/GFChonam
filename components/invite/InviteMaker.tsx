"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { INVITE_TEMPLATES, type InviteSettings } from "@/lib/invite";
import { ensureInviteFonts, renderInvite } from "./invite-canvas";

/**
 * 초대장 생성기 — 접수 완료 화면에서 설계사가 고객명·인사말만 바꿔
 * 초대장 "이미지"를 만들어 카톡으로 보낸다.
 * 렌더링은 캔버스 직접 드로잉: 외부 라이브러리 없이 카톡 인앱 브라우저에서도
 * 동일한 결과가 나오고, 미리보기 = 최종 이미지라서 그대로 길게 눌러 저장하면 된다.
 */
// ── 컴포넌트 ────────────────────────────────────────────
export default function InviteMaker({
  invite,
  guestNames,
}: {
  invite: InviteSettings;
  guestNames: string[];
}) {
  const [tplKey, setTplKey] = useState(invite.template || "green");
  const [nameChoice, setNameChoice] = useState(guestNames[0] ?? "__custom__");
  const [customName, setCustomName] = useState("");
  const [greeting, setGreeting] = useState(invite.greeting);
  const [imgUrl, setImgUrl] = useState<string>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const guestName = nameChoice === "__custom__" ? customName : nameChoice;
  const tpl = INVITE_TEMPLATES.find((t) => t.key === tplKey) ?? INVITE_TEMPLATES[0];

  const generate = useCallback(async () => {
    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvasRef.current = canvas;
    await ensureInviteFonts();
    renderInvite(canvas, tpl, invite, guestName, greeting);
    setImgUrl(canvas.toDataURL("image/png"));
  }, [tpl, invite, guestName, greeting]);

  // 입력이 바뀌면 잠시 후 자동 재생성 (미리보기 = 최종 이미지)
  useEffect(() => {
    const t = setTimeout(generate, 350);
    return () => clearTimeout(t);
  }, [generate]);

  return (
    <section className="card mt-5">
      <h2 className="text-sm font-bold text-brand-ink">🎫 초대장 만들기</h2>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">
        고객명과 인사말을 확인한 뒤, 아래 초대장 이미지를 <b>길게 눌러 저장</b>해 카톡으로 보내세요.
      </p>

      {/* 템플릿 */}
      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {INVITE_TEMPLATES.map((t) => (
          <button key={t.key} type="button" onClick={() => setTplKey(t.key)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
              tplKey === t.key ? "border-brand bg-brand-light text-brand" : "border-gray-200 text-gray-500"
            }`}>
            <span className="h-3.5 w-3.5 rounded-full border border-black/10"
              style={{ background: `linear-gradient(160deg, ${t.bgTop}, ${t.bgBottom})` }} />
            {t.name}
          </button>
        ))}
      </div>

      {/* 고객명 */}
      <div className="mt-3">
        <label className="mb-1 block text-xs font-medium text-gray-500">고객명</label>
        {guestNames.length > 0 ? (
          <select className="field-input" value={nameChoice} onChange={(e) => setNameChoice(e.target.value)}>
            {guestNames.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
            <option value="__custom__">직접 입력...</option>
          </select>
        ) : null}
        {(guestNames.length === 0 || nameChoice === "__custom__") && (
          <input type="text" className="field-input mt-1.5" placeholder="고객 성함"
            value={customName} onChange={(e) => setCustomName(e.target.value)} maxLength={20} />
        )}
      </div>

      {/* 인사말 */}
      <div className="mt-3">
        <label className="mb-1 block text-xs font-medium text-gray-500">인사말 (자유롭게 수정하세요)</label>
        <textarea className="field-input h-24 text-sm" value={greeting}
          onChange={(e) => setGreeting(e.target.value)} maxLength={300} />
      </div>

      {/* 미리보기 = 최종 이미지 */}
      <div className="mt-4">
        {imgUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgUrl} alt={`${guestName || "고객"} 초대장`}
            className="w-full rounded-2xl shadow-card" />
        ) : (
          <div className="flex aspect-[1080/1350] w-full items-center justify-center rounded-2xl bg-gray-100 text-sm text-gray-400">
            초대장을 만들고 있어요...
          </div>
        )}
      </div>

      <div className="mt-3 space-y-2">
        <p className="rounded-xl bg-brand-light px-3.5 py-2.5 text-center text-[13px] font-medium text-brand">
          📱 위 이미지를 <b>길게 눌러 &lsquo;사진 저장&rsquo;</b> 후 카톡으로 전송하세요
        </p>
        {imgUrl && (
          <a href={imgUrl} download={`초대장_${(guestName || "고객").replace(/\s/g, "")}.png`}
            className="btn-ghost block w-full py-2.5 text-center text-sm">
            PC에서 이미지 다운로드
          </a>
        )}
      </div>
    </section>
  );
}
