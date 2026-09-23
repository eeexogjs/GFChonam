import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import type { Answers, FormSchema } from "@/lib/form-schema";
import { buildColumns, formatSeoulTime } from "@/lib/export-columns";
import CopyLinkButton from "@/components/CopyLinkButton";
import { softDeleteSubmission, toggleTopicStatus } from "../actions";

export const revalidate = 0;

interface SubmissionRow {
  id: string;
  submitter: { branch?: string; name?: string; code?: string; phone?: string };
  answers: Answers;
  created_at: string;
  updated_at: string;
}

export default async function AdminTopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { slug } = await params;
  const { q } = await searchParams;

  const admin = createAdminClient();
  const { data: topic } = await admin
    .from("topics")
    .select("id, title, slug, status, deadline, form_schema")
    .eq("slug", slug)
    .single<{ id: string; title: string; slug: string; status: string; deadline: string | null; form_schema: FormSchema }>();

  if (!topic) notFound();

  const { data: allRows } = await admin
    .from("submissions")
    .select("id, submitter, answers, created_at, updated_at")
    .eq("topic_id", topic.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .returns<SubmissionRow[]>();

  const rows = (allRows ?? []).filter((r) => {
    if (!q) return true;
    const hay = `${r.submitter?.name ?? ""} ${r.submitter?.branch ?? ""} ${r.submitter?.code ?? ""}`;
    return hay.includes(q.trim());
  });

  const columns = buildColumns(topic.form_schema, rows.map((r) => r.answers));
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const isOpen = topic.status === "open";

  return (
    <main>
      {/* 헤더 + 조작 버튼 */}
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold">{topic.title}</h1>
            <p className="text-xs text-gray-400">
              /{topic.slug} ·{" "}
              <span className={isOpen ? "text-green-600" : "text-gray-500"}>
                {isOpen ? "진행중" : "마감"}
              </span>
              {topic.deadline &&
                ` · 마감 ${formatSeoulTime(topic.deadline)}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/admin/${slug}/edit`}
              className="rounded-lg border border-brand px-4 py-2 text-sm font-medium text-brand"
            >
              양식 수정
            </a>
            <a
              href={`/admin/${slug}/export`}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white"
            >
              엑셀 다운로드
            </a>
            <form action={toggleTopicStatus.bind(null, slug)}>
              <button
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
                  isOpen ? "bg-gray-600" : "bg-brand"
                }`}
              >
                {isOpen ? "마감하기" : "다시 열기"}
              </button>
            </form>
          </div>
        </div>
        <div className="mt-3">
          <CopyLinkButton
            text={`[${topic.title}]\n아래 링크에서 신청해주세요!\n${siteUrl}/${topic.slug}`}
            label="카톡 공유 문구 복사"
          />
        </div>
      </div>

      {/* 검색 */}
      <form method="GET" className="mb-3 flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="이름 / 지점 / 코드 검색"
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <button className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-white">검색</button>
      </form>

      <p className="mb-2 text-sm text-gray-500">
        총 <b className="text-brand">{rows.length}</b>건
        {q && ` (검색: "${q}")`}
      </p>

      {/* 취합 테이블 — 가로 스크롤 허용 (열이 많은 게 정상) */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-max text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">제출일시</th>
              {columns.map((c) => (
                <th key={c.header} className="px-3 py-2 whitespace-nowrap">
                  {c.header}
                </th>
              ))}
              <th className="px-3 py-2">관리</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 2} className="px-3 py-8 text-center text-gray-400">
                  {q ? "검색 결과가 없습니다" : "아직 제출된 내역이 없습니다"}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 last:border-0">
                <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-500">
                  {formatSeoulTime(r.created_at)}
                  {r.updated_at !== r.created_at && (
                    <span className="ml-1 text-orange-400">(수정됨)</span>
                  )}
                </td>
                {columns.map((c) => (
                  <td key={c.header} className="max-w-[240px] truncate px-3 py-2">
                    {c.getValue(r.answers)}
                  </td>
                ))}
                <td className="px-3 py-2">
                  <form action={softDeleteSubmission.bind(null, slug, r.id)}>
                    <button className="text-xs text-red-400 underline">삭제</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        삭제는 화면과 엑셀에서만 제외되는 안전 삭제입니다(DB에는 보존). 복구가 필요하면 개발 담당에게 요청하세요.
      </p>
    </main>
  );
}
