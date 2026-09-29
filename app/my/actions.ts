"use server";

import { createAdminClient } from "@/lib/supabase/server";

export interface MySubmission {
  title: string;
  slug: string;
  token: string;
  createdAt: string;
  status: string;
}

export interface FindResult {
  error?: string;
  rows?: MySubmission[];
}

/**
 * 내 접수 찾기 — 성함+사번이 모두 일치하는 본인 제출 건의 접수증 링크를 돌려준다.
 * (접수증 링크 분실 시 자가 복구 수단. 익명 select는 RLS로 막혀 있어 서버에서만 조회)
 */
export async function findMySubmissions(
  _prev: FindResult,
  formData: FormData
): Promise<FindResult> {
  const name = formData.get("name");
  const code = formData.get("code");
  if (typeof name !== "string" || !name.trim()) return { error: "성함을 입력해주세요." };
  if (typeof code !== "string" || !code.trim()) return { error: "사번을 입력해주세요." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("submissions")
    .select("edit_token, created_at, submitter, topics!inner(title, slug, status)")
    .eq("submitter->>name", name.trim())
    .eq("submitter->>code", code.trim())
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return { error: "조회 중 문제가 생겼어요. 잠시 후 다시 시도해주세요." };

  const rows: MySubmission[] = (data ?? []).map((r) => {
    const t = r.topics as unknown as { title: string; slug: string; status: string };
    return {
      title: t.title,
      slug: t.slug,
      token: r.edit_token as string,
      createdAt: r.created_at as string,
      status: t.status,
    };
  });

  if (rows.length === 0)
    return { error: "일치하는 접수 내역이 없습니다. 성함과 사번을 신청서에 적은 그대로 입력했는지 확인해주세요." };

  return { rows };
}
