import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * 서버 전용 Supabase 클라이언트 2종.
 * "server-only" import 덕분에 이 파일을 클라이언트 컴포넌트에서
 * 실수로 import하면 빌드가 실패한다 — service role 키 유출 방지 장치.
 */

/** 익명 권한 서버 클라이언트 — 공개 주제 조회 등 RLS를 그대로 따르는 읽기에 사용 */
export function createAnonServerClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * service role 클라이언트 — RLS를 우회한다.
 * 사용처: 관리자 화면 조회, edit_token 대조 후 본인 제출 수정,
 * 엑셀 다운로드, members 검증. 반드시 서버 액션/라우트 핸들러 안에서만 호출.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다. Vercel 환경변수를 확인하세요."
    );
  }
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false },
  });
}
