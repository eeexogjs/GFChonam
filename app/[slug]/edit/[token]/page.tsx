import { notFound } from "next/navigation";
import FormRenderer from "@/components/form/FormRenderer";
import { createAdminClient } from "@/lib/supabase/server";
import type { Answers, FormSchema } from "@/lib/form-schema";
import { updateAnswers } from "../../actions";

export const revalidate = 0;

/** 본인 수정 화면 — 제출 화면과 동일한 렌더러에 기존 답변을 채워서 재사용 */
export default async function EditPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;

  const admin = createAdminClient();
  const { data: submission } = await admin
    .from("submissions")
    .select("answers, topics!inner(title, slug, status, deadline, form_schema)")
    .eq("edit_token", token)
    .eq("topics.slug", slug)
    .is("deleted_at", null)
    .single();

  if (!submission) notFound();

  const topic = submission.topics as unknown as {
    title: string;
    status: string;
    deadline: string | null;
    form_schema: FormSchema;
  };

  const closed =
    topic.status !== "open" ||
    (topic.deadline !== null && new Date(topic.deadline) <= new Date());

  return (
    <main className="mx-auto max-w-md px-4 py-8 pb-16">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-brand">{topic.title}</h1>
        <p className="mt-1 text-sm text-gray-500">신청 내용 수정</p>
      </header>

      {closed ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-700">마감되었습니다</p>
          <p className="mt-2 text-sm text-gray-500">
            마감된 취합은 수정할 수 없습니다.
            <br />
            변경이 필요하면 담당자에게 연락해주세요.
          </p>
        </div>
      ) : (
        <FormRenderer
          schema={topic.form_schema}
          initialAnswers={submission.answers as Answers}
          submitLabel="수정 완료"
          action={updateAnswers.bind(null, slug, token)}
        />
      )}
    </main>
  );
}
