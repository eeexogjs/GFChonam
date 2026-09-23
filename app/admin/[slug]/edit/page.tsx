import { notFound } from "next/navigation";
import TopicBuilder from "@/components/builder/TopicBuilder";
import { createAdminClient } from "@/lib/supabase/server";
import { isoToDeadlineInput } from "@/lib/topic-validation";
import type { FormSchema } from "@/lib/form-schema";
import { saveTopic } from "../../actions";

export const revalidate = 0;

/** 기존 주제 양식 수정 — 제출 건수를 함께 넘겨 필드 삭제 경고를 띄운다 */
export default async function EditTopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: topic } = await admin
    .from("topics")
    .select("title, slug, type, description, deadline, per_person_limit, form_schema, submissions(count)")
    .eq("slug", slug)
    .is("submissions.deleted_at", null)
    .single<{
      title: string;
      slug: string;
      type: string;
      description: string | null;
      deadline: string | null;
      per_person_limit: number | null;
      form_schema: FormSchema;
      submissions: { count: number }[];
    }>();

  if (!topic) notFound();

  return (
    <TopicBuilder
      mode="edit"
      submissionCount={topic.submissions?.[0]?.count ?? 0}
      initial={{
        title: topic.title,
        slug: topic.slug,
        type: topic.type,
        description: topic.description ?? "",
        deadline: isoToDeadlineInput(topic.deadline),
        perPersonLimit: topic.per_person_limit,
        schema: topic.form_schema,
      }}
      action={saveTopic.bind(null, slug)}
    />
  );
}
