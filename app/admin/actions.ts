"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, computeSessionToken } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { deadlineToIso, validateTopicPayload } from "@/lib/topic-validation";
import type { SaveResult, TopicPayload } from "@/components/builder/TopicBuilder";

/** 관리자 로그인 — 등록된 관리자(성함+사번)만 통과. 성공 시 12시간 httpOnly 세션 쿠키 */
export async function loginAction(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const name = formData.get("name");
  const code = formData.get("code");
  if (typeof name !== "string" || !name.trim()) return { error: "성함을 입력해주세요." };
  if (typeof code !== "string" || !code.trim()) return { error: "사번을 입력해주세요." };

  if (!process.env.ADMIN_PASSWORD) {
    return { error: "서버에 ADMIN_PASSWORD(세션 서명키)가 설정되지 않았습니다. Vercel 환경변수를 확인하세요." };
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("admins")
    .select("code")
    .eq("code", code.trim())
    .eq("name", name.trim())
    .eq("active", true)
    .maybeSingle();

  if (!data) return { error: "등록된 관리자 정보와 일치하지 않습니다." };

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

/** 상태 변경: 초안→공개(open), 공개→마감(closed), 마감→재개(open) */
export async function setTopicStatus(slug: string, status: "open" | "closed") {
  const admin = createAdminClient();
  await admin.from("topics").update({ status }).eq("slug", slug);
  revalidatePath(`/admin/${slug}`);
  revalidatePath("/admin");
  revalidatePath(`/${slug}`);
}

/** 취합 복제 — 양식·설정을 복사해 "초안"으로 생성 (응답은 복사하지 않음) */
export async function duplicateTopic(slug: string) {
  const admin = createAdminClient();
  const { data: src } = await admin
    .from("topics")
    .select("title, slug, type, description, form_schema, deadline, per_person_limit, capacity")
    .eq("slug", slug)
    .single();
  if (!src) return;

  // 겹치지 않는 slug 찾기: {원본}-copy, -copy2, ...
  let newSlug = `${src.slug}-copy`;
  for (let i = 2; i < 50; i++) {
    const { data: exists } = await admin.from("topics").select("id").eq("slug", newSlug).maybeSingle();
    if (!exists) break;
    newSlug = `${src.slug}-copy${i}`;
  }

  const { error } = await admin.from("topics").insert({
    title: `${src.title} (복사본)`,
    slug: newSlug,
    type: src.type,
    description: src.description,
    form_schema: src.form_schema,
    deadline: null, // 마감일은 회차마다 다르므로 비워서 생성
    per_person_limit: src.per_person_limit,
    capacity: src.capacity,
    status: "draft",
  });
  if (error) return;

  revalidatePath("/admin");
  redirect(`/admin/${newSlug}/edit`);
}

/** 지점 등록/갱신 — "지점명,설계사수" 줄 텍스트 일괄 반영 (지점장 모드 제출률의 분모) */
export async function saveBranches(
  _prev: { message?: string; error?: string },
  formData: FormData
): Promise<{ message?: string; error?: string }> {
  const raw = formData.get("rows");
  if (typeof raw !== "string" || !raw.trim()) return { error: "입력된 내용이 없습니다." };

  const parsed: { name: string; headcount: number; managerName?: string; managerCode?: string }[] = [];
  const bad: number[] = [];
  raw.split("\n").forEach((line, i) => {
    const t = line.trim();
    if (!t) return;
    const [name, cnt, mName, mCode] = t.split(/[,\t]/).map((s) => s.trim());
    const headcount = Number(cnt);
    if (!name || !Number.isInteger(headcount) || headcount < 0) {
      bad.push(i + 1);
      return;
    }
    parsed.push({
      name,
      headcount,
      ...(mName ? { managerName: mName } : {}),
      ...(mCode ? { managerCode: mCode } : {}),
    });
  });

  if (parsed.length === 0)
    return { error: `등록할 수 있는 줄이 없습니다. "지점명,설계사수,지점장성함,지점장사번" 형식인지 확인해주세요.` };

  const admin = createAdminClient();
  // 지점장 정보를 생략한 줄은 기존 값을 유지한다 (덮어쓰기 방지)
  const { data: existing } = await admin
    .from("branches")
    .select("name, manager_name, manager_code");
  const prev = new Map(
    (existing ?? []).map((b) => [b.name, { n: b.manager_name as string | null, c: b.manager_code as string | null }])
  );
  const rows = parsed.map((r) => ({
    name: r.name,
    headcount: r.headcount,
    active: true,
    manager_name: r.managerName ?? prev.get(r.name)?.n ?? null,
    manager_code: r.managerCode ?? prev.get(r.name)?.c ?? null,
  }));

  const { error } = await admin.from("branches").upsert(rows, { onConflict: "name" });
  if (error) return { error: "저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." };

  revalidatePath("/admin/branches");
  revalidatePath("/manager");
  return {
    message: `${rows.length}개 지점 등록/갱신 완료${bad.length ? ` · 형식 오류 ${bad.length}줄 건너뜀(${bad.slice(0, 5).join(", ")}행)` : ""}`,
  };
}

/** 지점 삭제 — 지점 행만 지운다. 제출 데이터는 지점명 텍스트로 남아 있으므로 영향 없음 */
export async function deleteBranch(name: string) {
  const admin = createAdminClient();
  await admin.from("branches").delete().eq("name", name);
  revalidatePath("/admin/branches");
  revalidatePath("/manager");
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
    capacity: payload.capacity,
    form_schema: payload.schema,
    invite: payload.invite ?? null,
  };

  if (originalSlug === null) {
    // 새 취합은 "초안"으로 생성 — 상세 화면에서 [공개하기]를 눌러야 노출된다
    const { error: dbError } = await admin.from("topics").insert({ ...row, status: "draft" });
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

/**
 * 명단 등록 — "코드,성함,지점" 형식의 줄 텍스트를 붙여넣어 일괄 등록/갱신.
 * 이미 있는 코드는 이름·지점을 갱신하고 active를 되살린다.
 */
export async function registerMembers(
  _prev: { message?: string; error?: string },
  formData: FormData
): Promise<{ message?: string; error?: string }> {
  const raw = formData.get("rows");
  if (typeof raw !== "string" || !raw.trim()) return { error: "붙여넣은 내용이 없습니다." };

  const rows: { code: string; name: string; branch: string; active: boolean }[] = [];
  const bad: number[] = [];

  raw.split("\n").forEach((line, i) => {
    const t = line.trim();
    if (!t) return;
    // 쉼표/탭 구분 모두 허용 (엑셀에서 복사하면 탭으로 들어온다)
    const parts = t.split(/[,\t]/).map((s) => s.trim());
    const [code, name, branch] = parts;
    if (!code || !/^[0-9]{1,10}$/.test(code) || !name || !branch) {
      bad.push(i + 1);
      return;
    }
    rows.push({ code, name, branch, active: true });
  });

  if (rows.length === 0)
    return { error: `등록할 수 있는 줄이 없습니다. "코드,성함,지점" 형식인지 확인해주세요.${bad.length ? ` (문제 줄: ${bad.slice(0, 5).join(", ")}...)` : ""}` };

  const admin = createAdminClient();
  const { error } = await admin.from("members").upsert(rows, { onConflict: "code" });
  if (error) return { error: "저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." };

  revalidatePath("/admin/members");
  return {
    message: `${rows.length}명 등록/갱신 완료${bad.length ? ` · 형식 오류로 건너뛴 줄 ${bad.length}개 (${bad.slice(0, 5).join(", ")}${bad.length > 5 ? "..." : ""}행)` : ""}`,
  };
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
