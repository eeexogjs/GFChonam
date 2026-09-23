"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, computeSessionToken } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { deadlineToIso, validateTopicPayload } from "@/lib/topic-validation";
import type { SaveResult, TopicPayload } from "@/components/builder/TopicBuilder";

/** 로그인 — 성공 시 12시간짜리 httpOnly 세션 쿠키 발급 */
export async function loginAction(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const password = formData.get("password");
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    return { error: "서버에 ADMIN_PASSWORD가 설정되지 않았습니다. Vercel 환경변수를 확인하세요." };
  }
  if (typeof password !== "string" || password !== expected) {
    return { error: "비밀번호가 올바르지 않습니다." };
  }

  const token = await computeSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, token!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  redirect("/admin");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

/** 마감 ↔ 재개 토글 */
export async function toggleTopicStatus(slug: string) {
  const admin = createAdminClient();
  const { data: topic } = await admin
    .from("topics")
    .select("id, status")
    .eq("slug", slug)
    .single();
  if (!topic) return;

  await admin
    .from("topics")
    .update({ status: topic.status === "open" ? "closed" : "open" })
    .eq("id", topic.id);

  revalidatePath(`/admin/${slug}`);
  revalidatePath("/admin");
  revalidatePath(`/${slug}`);
}

/**
 * 주제 저장 — originalSlug가 null이면 신규 개설, 있으면 해당 주제 수정.
 * 클라이언트 빌더를 신뢰하지 않고 여기서 전체 재검증한다.
 */
export async function saveTopic(
  originalSlug: string | null,
  payload: TopicPayload
): Promise<SaveResult> {
  const error = validateTopicPayload(payload);
  if (error) return { ok: false, message: error };

  const admin = createAdminClient();
  const row = {
    title: payload.title.trim(),
    slug: payload.slug,
    type: payload.type,
    description: payload.description?.trim() || null,
    deadline: deadlineToIso(payload.deadline),
    per_person_limit: payload.perPersonLimit,
    form_schema: payload.schema,
  };

  if (originalSlug === null) {
    const { error: dbError } = await admin.from("topics").insert(row);
    if (dbError) {
      return {
        ok: false,
        message: dbError.code === "23505"
          ? `주소 "/${payload.slug}"는 이미 사용 중입니다. 다른 주소를 입력해주세요.`
          : "저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      };
    }
  } else {
    const { error: dbError } = await admin.from("topics").update(row).eq("slug", originalSlug);
    if (dbError) {
      return {
        ok: false,
        message: dbError.code === "23505"
          ? `주소 "/${payload.slug}"는 이미 사용 중입니다. 다른 주소를 입력해주세요.`
          : "저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      };
    }
  }

  revalidatePath("/admin");
  revalidatePath(`/${payload.slug}`);
  revalidatePath(`/admin/${payload.slug}`);
  return { ok: true, redirectTo: `/admin/${payload.slug}` };
}

/** 제출 건 소프트 삭제 — 행을 지우지 않고 deleted_at만 찍는다 (실수 복구 가능) */
export async function softDeleteSubmission(slug: string, submissionId: string) {
  const admin = createAdminClient();
  await admin
    .from("submissions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", submissionId);
  revalidatePath(`/admin/${slug}`);
}
