import { notFound } from "next/navigation";
import type { Metadata } from "next";
import FormRenderer from "@/components/form/FormRenderer";
import { createAdminClient } from "@/lib/supabase/server";
import type { FormSchema } from "@/lib/form-schema";
import { submitAnswers } from "./actions";

export const revalidate = 0;

interface TopicRow {
  id: string;
  title: string;
  description: string | null;
  status: "open" | "closed";
  deadline: string | null;
  form_schema: FormSchema;
}

async function getTopic(slug: string) {
  // closed 주제도 "마감 안내"를 보여줘야 하므로 admin 클라이언트로 조회
  // (anon RLS는 closed 주제를 아예 숨긴다 — 제출 API 쪽 안전장치)
  const admin = createAdminClient();
  const { data } = await admin
    .from("topics")
    .select("id, title, description, status, deadline, form_schema")
    .eq("slug", slug)
    .single<TopicRow>();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const topic = await getTopic(slug);
  if (!topic) return { title: "취합ON" };
  // 카톡 미리보기(OG)에 주제 제목이 뜨게 한다 — 클릭률에 직결
  return {
    title: `${topic.title} | 취합ON`,
    description: topic.description ?? "취합ON 신청 페이지",
    openGraph: {
      title: topic.title,
      description: topic.description ?? "아래 링크에서 신청해주세요.",
    },
  };
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = await getTopic(slug);
  if (!topic) notFound();

  const closed =
    topic.status !== "open" ||
    (topic.deadline !== null && new Date(topic.deadline) <= new Date());

  return (
    <main className="mx-auto max-w-md px-4 py-8 pb-16">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-brand">{topic.title}</h1>
        {topic.description && (
          <div className="mt-3 whitespace-pre-wrap rounded-lg border-l-4 border-red-300 bg-red-50 px-3 py-2.5 text-sm text-gray-700">
            {topic.description}
          </div>
        )}
        {topic.deadline && !closed && (
          <p className="mt-2 text-xs text-gray-500">
            마감:{" "}
            {new Date(topic.deadline).toLocaleString("ko-KR", {
              timeZone: "Asia/Seoul",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </header>

      {closed ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-700">마감되었습니다</p>
          <p className="mt-2 text-sm text-gray-500">
            신청 기간이 종료되었습니다.
            <br />
            문의사항은 담당자에게 연락해주세요.
          </p>
        </div>
      ) : (
        <FormRenderer
          schema={topic.form_schema}
          submitLabel="제 출 하 기"
          action={submitAnswers.bind(null, slug)}
        />
      )}
    </main>
  );
}
