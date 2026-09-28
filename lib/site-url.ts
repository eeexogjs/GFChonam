import "server-only";
import { headers } from "next/headers";

/**
 * 배포 주소 결정 — NEXT_PUBLIC_SITE_URL이 설정돼 있으면 그 값을,
 * 없으면 현재 요청의 host를 사용한다. 환경변수 없이도
 * 접수증 링크 복사·카톡 공유 문구가 항상 올바른 주소를 갖게 하는 안전장치.
 */
export async function getSiteUrl(): Promise<string> {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "";
}
