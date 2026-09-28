import { notFound } from "next/navigation";
import type { Metadata } from "next";
import BrandHeader from "@/components/BrandHeader";
import RulesSummary from "@/components/RulesSummary";
import FormRenderer from "@/components/form/FormRenderer";
import { createAdminClient } from "@/lib/supabase/server";
import type { FormSchema } from "@/lib/form-schema";
import { submitAnswers } from "./actions";

export const revalidate = 0;

interface TopicRow {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "open" | "closed";
  deadline: string | null;
  capacity: number | null;
  per_person_limit: number | null;
  form_schema: FormSchema;
}

async function getTopic(slug: string) {
  // closed 주제도 "마감 안내"를 보여줘야 하므로 admin 클라이언트로 조회
  const admin = createAdminClient();
  const { data } = await admin
    .from("topics")
    .select("id, title, description, status, deadline, capacity, per_person_limit, form_schema")
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
  return {
    title: `${topic.title} | 취합ON`,
    description: "아래 링크에서 1분 안에 신청을 완료하세요.",
    openGraph: {
      title: topic.title,
      description: "탭 한 번으로 신청 — 취합ON",
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

  const isDraft = topic.status === "draft";
  const closed =
    topic.status !== "open" ||
    (topic.deadline !== null && new Date(topic.deadline) <= new Date());

  return (
    <>
      <BrandHeader />
      {/* 모바일: 한 열 / PC: 입력 영역 + 접수 규칙 요약 2열 */}
      <main className="mx-auto max-w-md px-5 py-6 lg:max-w-4xl lg:py-10">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-10">
          <div className="min-w-0">
            <h1 className="text-[23px] font-extrabold leading-snug text-brand-ink lg:text-[26px]">
              {topic.title}
            </h1>

            {topic.description && (
              <div className="mt-3 whitespace-pre-wrap rounded-2xl bg-amber-50 px-4 py-3.5 text-[13.5px] leading-relaxed text-amber-900">
                {topic.description}
              </div>
            )}

            {/* 접수 규칙 — 모바일에서는 안내문 아래, PC에서는 우측 패널 */}
            {!closed && (
              <div className="lg:hidden">
                <RulesSummary topic={topic} schema={topic.form_schema} variant="inline" />
              </div>
            )}

            <div className="mt-6">
              {isDraft ? (
                <div className="card px-6 py-10 text-center">
                  <p className="text-4xl" aria-hidden>🕓</p>
                  <p className="mt-3 text-lg font-bold text-brand-ink">아직 접수 시작 전이에요</p>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">
                    접수가 열리면 이 링크에서 바로 신청할 수 있어요.
                    <br />
                    시작 시점은 담당자 안내를 확인해주세요.
                  </p>
                </div>
              ) : closed ? (
                <div className="card px-6 py-10 text-center">
                  <p className="text-4xl" aria-hidden>🔒</p>
                  <p className="mt-3 text-lg font-bold text-brand-ink">접수가 마감되었습니다</p>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">
                    신청 기간이 종료되었어요.
                    <br />
                    궁금한 점은 담당자에게 문의해주세요.
                  </p>
                </div>
              ) : (
                <FormRenderer
                  schema={topic.form_schema}
                  submitLabel="입력 내용 확인하기"
                  action={submitAnswers.bind(null, slug)}
                />
              )}
            </div>
          </div>

          {/* PC 우측: 접수 규칙 고정 패널 */}
          {!closed && (
            <aside className="hidden lg:block">
              <div className="sticky top-8">
                <RulesSummary topic={topic} schema={topic.form_schema} variant="card" />
              </div>
            </aside>
          )}
        </div>
      </main>
    </>
  );
}
