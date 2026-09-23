"use server";

import { randomUUID } from "crypto";
import {
  extractSubmitter,
  type Answers,
  type FormSchema,
} from "@/lib/form-schema";
import { validateAnswers } from "@/lib/validation";
import { createAdminClient, createAnonServerClient } from "@/lib/supabase/server";
import type { SubmitResult } from "@/components/form/FormRenderer";

interface TopicRow {
  id: string;
  slug: string;
  status: "open" | "closed";
  deadline: string | null;
  form_schema: FormSchema;
}

function isClosed(topic: TopicRow) {
  return (
    topic.status !== "open" ||
    (topic.deadline !== null && new Date(topic.deadline) <= new Date())
  );
}

/** 신규 제출 — 클라이언트 검증과 무관하게 서버에서 전 항목 재검증한다 */
export async function submitAnswers(slug: string, answers: Answers): Promise<SubmitResult> {
  const admin = createAdminClient();
  const { data: topic } = await admin
    .from("topics")
    .select("id, slug, status, deadline, form_schema")
    .eq("slug", slug)
    .single<TopicRow>();

  if (!topic) return { ok: false, message: "존재하지 않는 취합 주제입니다." };
  if (isClosed(topic))
    return { ok: false, message: "마감된 취합입니다. 담당자에게 문의해주세요." };

  const errors = validateAnswers(topic.form_schema, answers);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const editToken = randomUUID();

  // insert는 일부러 anon 클라이언트로 — RLS(open + 마감 전)가 최종 안전장치로 한 번 더 작동한다.
  const anon = createAnonServerClient();
  const { error } = await anon.from("submissions").insert({
    topic_id: topic.id,
    submitter: extractSubmitter(topic.form_schema, answers),
    answers,
    edit_token: editToken,
  });

  if (error) {
    console.error("submit insert error:", error.message);
    return { ok: false, message: "저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." };
  }

  return { ok: true, redirectTo: `/${slug}/done/${editToken}` };
}

/** 본인 수정 — edit_token 대조는 service role로만 가능(익명 select 차단 설계) */
export async function updateAnswers(slug: string, editToken: string, answers: Answers): Promise<SubmitResult> {
  const admin = createAdminClient();

  const { data: submission } = await admin
    .from("submissions")
    .select("id, topic_id, topics!inner(id, slug, status, deadline, form_schema)")
    .eq("edit_token", editToken)
    .eq("topics.slug", slug)
    .is("deleted_at", null)
    .single();

  if (!submission) return { ok: false, message: "제출 내역을 찾을 수 없습니다." };

  const topic = submission.topics as unknown as TopicRow;
  if (isClosed(topic))
    return { ok: false, message: "마감된 취합은 수정할 수 없습니다. 담당자에게 문의해주세요." };

  const errors = validateAnswers(topic.form_schema, answers);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const { error } = await admin
    .from("submissions")
    .update({
      submitter: extractSubmitter(topic.form_schema, answers),
      answers,
    })
    .eq("id", submission.id);

  if (error) {
    console.error("submit update error:", error.message);
    return { ok: false, message: "수정 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." };
  }

  return { ok: true, redirectTo: `/${slug}/done/${editToken}?updated=1` };
}
