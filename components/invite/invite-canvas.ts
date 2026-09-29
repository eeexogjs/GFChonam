// 초대장 캔버스 렌더러 — InviteMaker(설계사)와 InvitePreview(관리자 빌더)가 공유한다.
import type { InviteSettings, InviteTemplate } from "@/lib/invite";

export const INVITE_W = 1080;
export const INVITE_H = 1350;



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
    [INVITE_W - inset, inset],
    [inset, INVITE_H - inset],
    [INVITE_W - inset, INVITE_H - inset],
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

export function renderInvite(
  canvas: HTMLCanvasElement,
  tpl: InviteTemplate,
  invite: InviteSettings,
  guestName: string,
  greeting: string
) {
  canvas.width = INVITE_W;
  canvas.height = INVITE_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 배경
  const bg = ctx.createLinearGradient(0, 0, 0, INVITE_H);
  bg.addColorStop(0, tpl.bgTop);
  bg.addColorStop(1, tpl.bgBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, INVITE_W, INVITE_H);

  // 이중 프레임 + 코너 장식
  ctx.strokeStyle = tpl.accent;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(42, 42, INVITE_W - 84, INVITE_H - 84);
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.7;
  ctx.strokeRect(60, 60, INVITE_W - 120, INVITE_H - 120);
  ctx.globalAlpha = 1;
  drawCornerDiamonds(ctx, 60, tpl.accent);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // INVITATION
  ctx.fillStyle = tpl.accent;
  ctx.font = `400 34px ${SERIF}`;
  drawLetterSpaced(ctx, "INVITATION", INVITE_W / 2, 212, 16);
  drawDivider(ctx, INVITE_W / 2, 268, tpl.accent, 90);

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
  titleLines.forEach((line, i) => ctx.fillText(line, INVITE_W / 2, titleTop + i * lineH));
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
  let x = INVITE_W / 2 - (wPre + wMid + wPost) / 2;
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
    lines.forEach((line, i) => ctx.fillText(line, INVITE_W / 2, y + i * 56));
    ctx.globalAlpha = 1;
  }

  // 일시 · 장소 (하단 고정 블록)
  const infoRows = [
    invite.dateText.trim() && { label: "일  시", value: invite.dateText.trim() },
    invite.placeText.trim() && { label: "장  소", value: invite.placeText.trim() },
  ].filter(Boolean) as { label: string; value: string }[];

  let iy = INVITE_H - 400;
  if (infoRows.length > 0) {
    drawDivider(ctx, INVITE_W / 2, iy - 60, tpl.accent, 110);
    ctx.textAlign = "center";
    for (const row of infoRows) {
      ctx.font = `600 26px ${SANS}`;
      ctx.fillStyle = tpl.accent;
      drawLetterSpaced(ctx, row.label, INVITE_W / 2, iy, 8);
      ctx.font = `500 37px ${SANS}`;
      ctx.fillStyle = tpl.text;
      const valueLines = wrapText(ctx, row.value, 820).slice(0, 2);
      valueLines.forEach((line, i) => ctx.fillText(line, INVITE_W / 2, iy + 52 + i * 48));
      iy += 52 + valueLines.length * 48 + 44;
    }
  }

  // 주최
  if (invite.host.trim()) {
    ctx.font = `500 29px ${SANS}`;
    ctx.fillStyle = tpl.sub;
    ctx.textAlign = "center";
    ctx.fillText(invite.host.trim(), INVITE_W / 2, INVITE_H - 128);
  }
}


/** 명조 폰트 로드 + 준비 대기 (실패해도 시스템 폰트로 대체 렌더) */
export async function ensureInviteFonts(): Promise<void> {
  const id = "font-noto-serif-kr";
  if (!document.getElementById(id)) {
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700&display=swap";
    document.head.appendChild(link);
  }
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load(`700 76px "Noto Serif KR"`, "초대"),
        document.fonts.load(`400 40px "Noto Serif KR"`, "초대"),
        document.fonts.load(`600 44px "Noto Serif KR"`, "초대"),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {
    /* noop */
  }
}
