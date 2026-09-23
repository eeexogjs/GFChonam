import Link from "next/link";
import { notFound } from "next/navigation";
import CopyLinkButton from "@/components/CopyLinkButton";
import { createAdminClient } from "@/lib/supabase/server";
import {
  formatValue,
  type Answers,
  type FormSchema,
  type RepeatGroupField,
} from "@/lib/form-schema";

export const revalidate = 0;

/**
 * 완료 화면 — 접수 내역 요약 + 본인 수정 링크.
 * edit_token이 URL에 있으므로 이 페이지 자체가 "내 접수증"이다.
 * (익명 select가 막혀 있어 token 없이는 누구도 남의 내역을 볼 수 없다)
 */
export default async function DonePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; token: string }>;
  searchParams: Promise<{ updated?: string }>;
}) {
  const { slug, token } = await params;
  const { updated } = await searchParams;

  const admin = createAdminClient();
  const { data: submission } = await admin
    .from("submissions")
    .select("answers, created_at, updated_at, topics!inner(title, slug, form_schema)")
    .eq("edit_token", token)
    .eq("topics.slug", slug)
    .is("deleted_at", null)
    .single();

  if (!submission) notFound();

  const topic = submission.topics as unknown as {
    title: string;
    form_schema: FormSchema;
  };
  const answers = submission.answers as Answers;

  return (
    <main className="mx-auto max-w-md px-4 py-8 pb-16">
      <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-5 text-center">
        <p className="text-lg font-bold text-green-800">
          {updated ? "수정이 완료되었습니다" : "신청이 완료되었습니다"}
        </p>
        <p className="mt-1 text-sm text-green-700">{topic.title}</p>
      </div>

      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 border-b border-gray-100 pb-2 font-semibold text-gray-700">
          접수 내역
        </h2>
        <dl className="space-y-2 text-sm">
          {topic.form_schema.map((field) => {
            if (field.block === "repeat_group") {
              const items = (answers[field.id] as Record<string, unknown>[]) ?? [];
              const rg = field as RepeatGroupField;
              return items.map((item, i) => (
                <div key={`${field.id}-${i}`} className="rounded-lg bg-gray-50 p-3">
                  <p className="mb-1 font-medium text-brand">
                    {rg.itemLabel ?? rg.label} {i + 1}
                  </p>
                  {rg.fields.map((sub) => (
                    <div key={sub.id} className="flex justify-between gap-3 py-0.5">
                      <dt className="shrink-0 text-gray-500">{sub.label}</dt>
                      <dd className="text-right">
                        {formatValue(sub, item?.[sub.id] as Answers[string])}
                      </dd>
                    </div>
                  ))}
                </div>
              ));
            }
            return (
              <div key={field.id} className="flex justify-between gap-3">
                <dt className="shrink-0 text-gray-500">{field.label}</dt>
                <dd className="text-right">{formatValue(field, answers[field.id])}</dd>
              </div>
            );
          })}
        </dl>
        <p className="mt-3 border-t border-gray-100 pt-2 text-xs text-gray-400">
          접수: {new Date(submission.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
          {submission.updated_at !== submission.created_at &&
            ` · 수정: ${new Date(submission.updated_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`}
        </p>
      </section>

      <div className="space-y-2">
        <Link
          href={`/${slug}/edit/${token}`}
          className="block w-full rounded-xl bg-brand py-3 text-center font-medium text-white"
        >
          내 신청 수정하기
        </Link>
        <CopyLinkButton
          text={`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/${slug}/done/${token}`}
          label="이 접수증 링크 복사 (북마크 권장)"
        />
      </div>
      <p className="mt-3 text-center text-xs text-gray-400">
        이 페이지 주소를 저장해두면 언제든 내역 확인·수정이 가능합니다.
      </p>
    </main>
  );
}
