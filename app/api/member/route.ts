import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 코드 → 성함·지점 조회 (자동입력용).
 * - 정확히 일치하는 코드만 응답 (목록 열람 불가)
 * - members 테이블이 비어 있으면 registered:false — 명단 미등록 운영 상태로,
 *   클라이언트와 서버 모두 검증을 건너뛴다 (명단 없이도 플랫폼 사용 가능)
 */
export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code")?.trim();
  if (!code || !/^[0-9]{1,10}$/.test(code)) {
    return NextResponse.json({ found: false });
  }

  const admin = createAdminClient();

  const { count } = await admin
    .from("members")
    .select("code", { count: "exact", head: true });
  if (!count) return NextResponse.json({ registered: false });

  const { data } = await admin
    .from("members")
    .select("name, branch")
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();

  if (!data) return NextResponse.json({ found: false });
  return NextResponse.json({ found: true, name: data.name, branch: data.branch });
}
