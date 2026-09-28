import { notFound } from "next/navigation";
import BrandHeader from "@/components/BrandHeader";
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
    <>
      <BrandHeader />
      <main className="mx-auto max-w-md px-5 py-6">
        <h1 className="text-[22px] font-extrabold leading-snug text-brand-ink">{topic.title}</h1>
        <p className="mt-1 text-sm text-gray-500">신청 내용을 수정한 뒤 아래 버튼을 눌러주세요</p>

        <div className="mt-6">
          {closed ? (
            <div className="card px-6 py-10 text-center">
              <p className="text-4xl" aria-hidden>🔒</p>
              <p className="mt-3 text-lg font-bold text-brand-ink">마감되어 수정할 수 없어요</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                변경이 꼭 필요하면 담당자에게 연락해주세요.
              </p>
            </div>
          ) : (
            <FormRenderer
              schema={topic.form_schema}
              initialAnswers={submission.answers as Answers}
              submitLabel="수정 완료하기"
              action={updateAnswers.bind(null, slug, token)}
            />
          )}
        </div>
      </main>
    </>
  );
}
