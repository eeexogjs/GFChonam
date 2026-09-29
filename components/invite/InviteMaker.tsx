"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { INVITE_TEMPLATES, type InviteSettings, type InviteTemplate } from "@/lib/invite";

/**
 * 초대장 생성기 — 접수 완료 화면에서 설계사가 고객명·인사말만 바꿔
 * 초대장 "이미지"를 만들어 카톡으로 보낸다.
 * 렌더링은 캔버스 직접 드로잉: 외부 라이브러리 없이 카톡 인앱 브라우저에서도
 * 동일한 결과가 나오고, 미리보기 = 최종 이미지라서 그대로 길게 눌러 저장하면 된다.
 */

const W = 1080;
const H = 1350;

// ── 캔버스 유틸 ──────────────────────────────────────────
function drawLetterSpaced(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  spacing: number
) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let x = cx - total / 2;
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, x, y);
    x += widths[i] + spacing;
  });
}

/** \n을 존중하며 최대 폭 기준으로 줄바꿈 (한국어: 글자 단위) */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    if (!para.trim()) continue;
    let line = "";
    for (const ch of para) {
      if (ctx.measureText(line + ch).width > maxWidth && line) {
        lines.push(line.trimEnd());
        line = ch === " " ? "" : ch;
      } else {
        line += ch;
      }
    }
    if (line.trim()) lines.push(line.trimEnd());
  }
  return lines;
}

function drawDivider(ctx: CanvasRenderingContext2D, cx: number, y: number, color: string, half = 110) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(cx - half, y);
  ctx.lineTo(cx - 22, y);
  ctx.moveTo(cx + 22, y);
  ctx.lineTo(cx + half, y);
  ctx.stroke();
  // 중앙 다이아
  ctx.fillStyle = color;
  ctx.save();
  ctx.translate(cx, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-6, -6, 12, 12);
  ctx.restore();
}

function drawCornerDiamonds(ctx: CanvasRenderingContext2D, inset: number, color: string) {
  ctx.fillStyle = color;
  for (const [x, y] of [
    [inset, inset],
    [W - inset, inset],
    [inset, H - inset],
    [W - inset, H - inset],
  ]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-7, -7, 14, 14);
    ctx.restore();
  }
}

const SERIF = '"Noto Serif KR", "Nanum Myeongjo", serif';
const SANS = 'Pretendard, "Apple SD Gothic Neo", sans-serif';

function render(
  canvas: HTMLCanvasElement,
  tpl: InviteTemplate,
  invite: InviteSettings,
  guestName: string,
  greeting: string
) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 배경
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, tpl.bgTop);
  bg.addColorStop(1, tpl.bgBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 이중 프레임 + 코너 장식
  ctx.strokeStyle = tpl.accent;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(42, 42, W - 84, H - 84);
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.7;
  ctx.strokeRect(60, 60, W - 120, H - 120);
  ctx.globalAlpha = 1;
  drawCornerDiamonds(ctx, 60, tpl.accent);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // INVITATION
  ctx.fillStyle = tpl.accent;
  ctx.font = `400 34px ${SERIF}`;
  drawLetterSpaced(ctx, "INVITATION", W / 2, 212, 16);
  drawDivider(ctx, W / 2, 268, tpl.accent, 90);

  // 행사명 (길면 자동 축소)
  let titleSize = 76;
  let lineH = 102;
  ctx.font = `700 ${titleSize}px ${SERIF}`;
  let titleLines = wrapText(ctx, invite.eventName || "행사명", 860);
  if (titleLines.length > 2) {
    titleSize = 58;
    lineH = 80;
    ctx.font = `700 ${titleSize}px ${SERIF}`;
    titleLines = wrapText(ctx, invite.eventName, 880).slice(0, 3);
  }
  ctx.fillStyle = tpl.title;
  ctx.textAlign = "center";
  const titleTop = 396;
  titleLines.forEach((line, i) => ctx.fillText(line, W / 2, titleTop + i * lineH));
  let y = titleTop + (titleLines.length - 1) * lineH + 92;

  // "소중한 ○○○ 님을 초대합니다" — 이름만 강조색
  const nm = guestName.trim() || "고객";
  ctx.textAlign = "left";
  const pre = "소중한 ";
  const mid = `${nm} 님`;
  const post = "을 초대합니다";
  ctx.font = `600 44px ${SERIF}`;
  const wMid = ctx.measureText(mid).width;
  ctx.font = `400 40px ${SERIF}`;
  const wPre = ctx.measureText(pre).width;
  const wPost = ctx.measureText(post).width;
  let x = W / 2 - (wPre + wMid + wPost) / 2;
  ctx.fillStyle = tpl.text;
  ctx.fillText(pre, x, y);
  x += wPre;
  ctx.font = `600 44px ${SERIF}`;
  ctx.fillStyle = tpl.accent;
  ctx.fillText(mid, x, y);
  x += wMid;
  ctx.font = `400 40px ${SERIF}`;
  ctx.fillStyle = tpl.text;
  ctx.fillText(post, x, y);
  y += 88;

  // 인사말
  if (greeting.trim()) {
    ctx.font = `400 33px ${SANS}`;
    ctx.fillStyle = tpl.text;
    ctx.textAlign = "center";
    ctx.globalAlpha = 0.92;
    const lines = wrapText(ctx, greeting, 780).slice(0, 8);
    lines.forEach((line, i) => ctx.fillText(line, W / 2, y + i * 56));
    ctx.globalAlpha = 1;
  }

  // 일시 · 장소 (하단 고정 블록)
  const infoRows = [
    invite.dateText.trim() && { label: "일  시", value: invite.dateText.trim() },
    invite.placeText.trim() && { label: "장  소", value: invite.placeText.trim() },
  ].filter(Boolean) as { label: string; value: string }[];

  let iy = H - 400;
  if (infoRows.length > 0) {
    drawDivider(ctx, W / 2, iy - 60, tpl.accent, 110);
    ctx.textAlign = "center";
    for (const row of infoRows) {
      ctx.font = `600 26px ${SANS}`;
      ctx.fillStyle = tpl.accent;
      drawLetterSpaced(ctx, row.label, W / 2, iy, 8);
      ctx.font = `500 37px ${SANS}`;
      ctx.fillStyle = tpl.text;
      const valueLines = wrapText(ctx, row.value, 820).slice(0, 2);
      valueLines.forEach((line, i) => ctx.fillText(line, W / 2, iy + 52 + i * 48));
      iy += 52 + valueLines.length * 48 + 44;
    }
  }

  // 주최
  if (invite.host.trim()) {
    ctx.font = `500 29px ${SANS}`;
    ctx.fillStyle = tpl.sub;
    ctx.textAlign = "center";
    ctx.fillText(invite.host.trim(), W / 2, H - 128);
  }
}

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

  // 명조 폰트 로드 (초대장 화면에서만)
  useEffect(() => {
    const id = "font-noto-serif-kr";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const generate = useCallback(async () => {
    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvasRef.current = canvas;
    try {
      // 폰트가 준비된 뒤 그린다 (실패해도 시스템 명조로 대체 렌더)
      await Promise.race([
        Promise.all([
          document.fonts.load(`700 76px "Noto Serif KR"`, "초대"),
          document.fonts.load(`400 40px "Noto Serif KR"`, "초대"),
        ]),
        new Promise((r) => setTimeout(r, 2500)),
      ]);
    } catch {
      /* noop */
    }
    render(canvas, tpl, invite, guestName, greeting);
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
