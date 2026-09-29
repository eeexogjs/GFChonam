"use server";

import { randomUUID } from "crypto";
import {
  extractSubmitter,
  type Answers,
  type FormSchema,
} from "@/lib/form-schema";
import { validateAnswers, type FieldErrors } from "@/lib/validation";
import { createAdminClient, createAnonServerClient } from "@/lib/supabase/server";
import { applyBranchOptions, fetchBranchNames } from "@/lib/branch-options";
import type { SubmitResult } from "@/components/form/FormRenderer";
import type { SupabaseClient } from "@supabase/supabase-js";

interface TopicRow {
  id: string;
  slug: string;
  status: "open" | "closed";
  deadline: string | null;
  per_person_limit: number | null;
  capacity: number | null;
  form_schema: FormSchema;
}

function isClosed(topic: TopicRow) {
  return (
    topic.status !== "open" ||
    (topic.deadline !== null && new Date(topic.deadline) <= new Date())
  );
}

/**
 * 명단 검증 — members에 명단이 등록돼 있을 때만 강제한다.
 * (명단이 비어 있으면 검증 없이 운영 — 도입 장벽을 낮추는 설계)
 */
async function validateMember(
  admin: SupabaseClient,
  schema: FormSchema,
  submitter: Record<string, string>
): Promise<FieldErrors | null> {
  const codeField = schema.find((f) => f.role === "submitter.code");
  if (!codeField || !submitter.code) return null;

  const { count } = await admin
    .from("members")
    .select("code", { count: "exact", head: true });
  if (!count) return null; // 명단 미등록 운영 상태

  const { data } = await admin
    .from("members")
    .select("code")
    .eq("code", submitter.code)
    .eq("active", true)
    .maybeSingle();

  if (!data) {
    return { [codeField.id]: "등록되지 않은 코드입니다. 코드를 다시 확인해주세요." };
  }
  return null;
}

/** 신규 제출 — 클라이언트 검증과 무관하게 서버에서 전 항목 재검증한다 */
export async function submitAnswers(slug: string, answers: Answers): Promise<SubmitResult> {
  const admin = createAdminClient();
  const { data: topic } = await admin
    .from("topics")
    .select("id, slug, status, deadline, per_person_limit, capacity, form_schema")
    .eq("slug", slug)
    .single<TopicRow>();

  if (!topic) return { ok: false, message: "존재하지 않는 접수입니다." };
  if (isClosed(topic))
    return { ok: false, message: "접수가 마감되었습니다. 담당자에게 문의해주세요." };

  // 화면과 동일하게 등록된 지점 목록을 선택지로 주입한 뒤 검증 (화면-서버 불일치 방지)
  topic.form_schema = applyBranchOptions(topic.form_schema, await fetchBranchNames(admin));

  const errors = validateAnswers(topic.form_schema, answers);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const submitter = extractSubmitter(topic.form_schema, answers);

  // ① 명단(코드) 검증 — 서버가 최종 판정
  const memberErrors = await validateMember(admin, topic.form_schema, submitter);
  if (memberErrors) return { ok: false, errors: memberErrors };

  // ② 정원 확인 — 가득 찼으면 접수 거부 + 자동 마감
  if (topic.capacity) {
    const { count: total } = await admin
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("topic_id", topic.id)
      .is("deleted_at", null);
    if ((total ?? 0) >= topic.capacity) {
      await admin.from("topics").update({ status: "closed" }).eq("id", topic.id);
      return { ok: false, message: "정원이 마감되어 접수할 수 없습니다. 담당자에게 문의해주세요." };
    }
  }

  // ③ 인당 접수 한도 — 같은 코드(코드가 없으면 같은 연락처)의 제출 수 제한
  if (topic.per_person_limit) {
    const identityKey = submitter.code ? "code" : submitter.phone ? "phone" : null;
    if (identityKey) {
      const { count: mine } = await admin
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .eq("topic_id", topic.id)
        .eq(`submitter->>${identityKey}`, submitter[identityKey])
        .is("deleted_at", null);
      if ((mine ?? 0) >= topic.per_person_limit) {
        return {
          ok: false,
          message: `인당 ${topic.per_person_limit}회까지 접수할 수 있어요. 이미 접수하신 건은 접수증 링크에서 수정할 수 있습니다.`,
        };
      }
    }
  }

  const editToken = randomUUID();

  // insert는 일부러 anon 클라이언트로 — RLS(open + 마감 전)가 최종 안전장치로 한 번 더 작동
  const anon = createAnonServerClient();
  const { error } = await anon.from("submissions").insert({
    topic_id: topic.id,
    submitter,
    answers,
    edit_token: editToken,
  });

  if (error) {
    console.error("submit insert error:", error.message);
    return { ok: false, message: "저장 중 문제가 생겼어요. 잠시 후 다시 시도해주세요." };
  }

  // ④ 이번 접수로 정원이 찼으면 자동 마감
  if (topic.capacity) {
    const { count: after } = await admin
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("topic_id", topic.id)
      .is("deleted_at", null);
    if ((after ?? 0) >= topic.capacity) {
      await admin.from("topics").update({ status: "closed" }).eq("id", topic.id);
    }
  }

  return { ok: true, redirectTo: `/${slug}/done/${editToken}` };
}

/** 본인 수정 — edit_token 대조는 service role로만 가능(익명 select 차단 설계) */
export async function updateAnswers(slug: string, editToken: string, answers: Answers): Promise<SubmitResult> {
  const admin = createAdminClient();

  const { data: submission } = await admin
    .from("submissions")
    .select("id, topic_id, topics!inner(id, slug, status, deadline, per_person_limit, capacity, form_schema)")
    .eq("edit_token", editToken)
    .eq("topics.slug", slug)
    .is("deleted_at", null)
    .single();

  if (!submission) return { ok: false, message: "접수 내역을 찾을 수 없습니다." };

  const topic = submission.topics as unknown as TopicRow;
  if (isClosed(topic))
    return { ok: false, message: "마감된 접수는 수정할 수 없어요. 담당자에게 문의해주세요." };

  topic.form_schema = applyBranchOptions(topic.form_schema, await fetchBranchNames(admin));

  const errors = validateAnswers(topic.form_schema, answers);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const submitter = extractSubmitter(topic.form_schema, answers);
  const memberErrors = await validateMember(admin, topic.form_schema, submitter);
  if (memberErrors) return { ok: false, errors: memberErrors };

  const { error } = await admin
    .from("submissions")
    .update({ submitter, answers })
    .eq("id", submission.id);

  if (error) {
    console.error("submit update error:", error.message);
    return { ok: false, message: "수정 저장 중 문제가 생겼어요. 잠시 후 다시 시도해주세요." };
  }

  return { ok: true, redirectTo: `/${slug}/done/${editToken}?updated=1` };
}
