"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * 브라우저용 Supabase 클라이언트 (anon 키).
 *
 * 이 키는 브라우저에 노출되는 것을 전제로 발급된 키다.
 * RLS 정책상 anon이 할 수 있는 일은 딱 두 가지:
 *   1) status='open'인 topic 조회
 *   2) open 상태 topic에 대한 submission insert
 * 제출 내역 조회/수정/삭제는 전부 서버(service role)를 거친다.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
