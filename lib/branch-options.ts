import type { SupabaseClient } from "@supabase/supabase-js";
import type { FormSchema } from "./form-schema";

/**
 * 지점 관리 ↔ 신청 화면 연동.
 * role이 submitter.branch인 select의 선택지를 "등록된 지점 목록"으로 교체한다.
 * - 렌더링(신청/수정 화면)과 서버 검증(actions)이 같은 함수를 써서 어긋나지 않는다.
 * - 등록된 지점이 하나도 없으면 스키마에 적힌 원본 선택지를 그대로 둔다(신청 불능 방지).
 */
export function applyBranchOptions(schema: FormSchema, branchNames: string[]): FormSchema {
  if (branchNames.length === 0) return schema;
  return schema.map((f) =>
    f.block === "select" && f.role === "submitter.branch" ? { ...f, options: branchNames } : f
  ) as FormSchema;
}

/** 활성 지점명 목록 (가나다순) */
export async function fetchBranchNames(admin: SupabaseClient): Promise<string[]> {
  const { data } = await admin.from("branches").select("name").eq("active", true).order("name");
  return (data ?? []).map((b) => b.name as string);
}
