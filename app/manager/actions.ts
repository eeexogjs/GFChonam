"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BRANCH_COOKIE, computeBranchCookieValue } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * 지점장 로그인 — 성함 + 사번.
 * 지점 관리에 등록된 지점장 정보와 일치하면 그 지점으로 자동 로그인된다.
 */
export async function branchLogin(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const name = formData.get("name");
  const code = formData.get("code");
  if (typeof name !== "string" || !name.trim()) return { error: "성함을 입력해주세요." };
  if (typeof code !== "string" || !code.trim()) return { error: "사번을 입력해주세요." };

  const admin = createAdminClient();
  const { data } = await admin
    .from("branches")
    .select("name")
    .eq("manager_name", name.trim())
    .eq("manager_code", code.trim())
    .eq("active", true)
    .maybeSingle();

  if (!data)
    return { error: "등록된 지점장 정보와 일치하지 않습니다. 관리자에게 지점 관리 등록을 확인해주세요." };

  const value = await computeBranchCookieValue(data.name);
  if (!value) return { error: "서버 설정 오류입니다. 관리자에게 문의해주세요." };

  const cookieStore = await cookies();
  cookieStore.set(BRANCH_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  redirect("/manager");
}

export async function branchLogout() {
  const cookieStore = await cookies();
  cookieStore.delete(BRANCH_COOKIE);
  redirect("/manager");
}
