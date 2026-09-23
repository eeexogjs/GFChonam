/** slug 규칙 한 곳 관리 — 클라이언트(안내)와 서버(최종 검증)가 공유 */

export const SLUG_RE = /^[a-z0-9-]{2,40}$/;

/** 라우트와 충돌하는 예약어 — 주제 slug로 쓸 수 없다 */
export const RESERVED_SLUGS = ["admin", "login", "new", "edit", "done", "api", "export"];

/** 제목에서 slug 초안 생성 — 영문/숫자만 남기고, 한글뿐이면 유형+날짜로 대체 */
export function suggestSlug(title: string, type: string): string {
  const ascii = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
  if (ascii.length >= 2) return ascii;

  const d = new Date();
  const mmdd = `${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `${type}-${mmdd}`;
}

export function validateSlug(slug: string): string | null {
  if (!SLUG_RE.test(slug))
    return "주소는 영문 소문자·숫자·하이픈 2~40자로 입력해주세요.";
  if (RESERVED_SLUGS.includes(slug))
    return `"${slug}"은(는) 시스템 예약어라 사용할 수 없습니다.`;
  return null;
}
