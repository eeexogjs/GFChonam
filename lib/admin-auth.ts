/**
 * 관리자 세션 — DB 없이 HMAC 쿠키로 처리한다.
 * 쿠키 값 = HMAC-SHA256(key: ADMIN_PASSWORD, msg: 고정 문자열).
 * → 비밀번호를 바꾸면 모든 세션이 즉시 무효화된다 (유출 대응이 환경변수 교체 한 번).
 *
 * Web Crypto만 사용 — Node 서버 액션과 Edge 미들웨어 양쪽에서 동일하게 동작한다.
 * (이 파일은 middleware에서도 import되므로 "server-only"를 붙이지 않는다.
 *  단, ADMIN_PASSWORD는 NEXT_PUBLIC_ 접두사가 없어 클라이언트 번들에 절대 포함되지 않는다.)
 */

export const ADMIN_COOKIE = "chwihap_admin";
const SESSION_MESSAGE = "chwihap-on-admin-session-v1";

export async function computeSessionToken(): Promise<string | null> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(SESSION_MESSAGE));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function isValidSession(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  const expected = await computeSessionToken();
  return expected !== null && cookieValue === expected;
}

/* ── 지점장 세션 ──────────────────────────────────────────
 * 쿠키 값 = "지점명|HMAC(branch:지점명)". 관리자와 같은 키(ADMIN_PASSWORD)로
 * 서명하므로 별도 비밀 관리가 없고, 위조하면 서명이 맞지 않아 거부된다.
 */
export const BRANCH_COOKIE = "chwihap_branch";

async function hmacHex(message: string): Promise<string | null> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function computeBranchCookieValue(branch: string): Promise<string | null> {
  const sig = await hmacHex(`branch:${branch}`);
  return sig ? `${branch}|${sig}` : null;
}

/** 유효하면 지점명을, 아니면 null을 돌려준다 */
export async function readBranchSession(cookieValue: string | undefined): Promise<string | null> {
  if (!cookieValue) return null;
  const idx = cookieValue.lastIndexOf("|");
  if (idx <= 0) return null;
  const branch = cookieValue.slice(0, idx);
  const expected = await computeBranchCookieValue(branch);
  return expected !== null && cookieValue === expected ? branch : null;
}
