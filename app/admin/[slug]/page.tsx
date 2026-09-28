import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
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
    .select("id, title, slug, status, deadline, capacity, per_person_limit, form_schema")
    .eq("slug", slug)
    .single<{
      id: string;
      title: string;
      slug: string;
      status: string;
      deadline: string | null;
      capacity: number | null;
      per_person_limit: number | null;
      form_schema: FormSchema;
    }>();

  if (!topic) notFound();

  const { data: allRows } = await admin
    .from("submissions")
    .select("id, submitter, answers, created_at, updated_at")
    .eq("topic_id", topic.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .returns<SubmissionRow[]>();

  const all = allRows ?? [];
  const rows = all.filter((r) => {
    if (!q) return true;
    const hay = `${r.submitter?.name ?? ""} ${r.submitter?.branch ?? ""} ${r.submitter?.code ?? ""}`;
    return hay.includes(q.trim());
  });

  // ── 취합 현황 통계 (지점별 / 오늘) ──────────────────────
  const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const todayCount = all.filter(
    (r) => new Date(r.created_at).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }) === todayStr
  ).length;
  const branchCounts = new Map<string, number>();
  for (const r of all) {
    const b = r.submitter?.branch || "미지정";
    branchCounts.set(b, (branchCounts.get(b) ?? 0) + 1);
  }
  const branchStats = [...branchCounts.entries()].sort((a, b) => b[1] - a[1]);

  const columns = buildColumns(topic.form_schema, rows.map((r) => r.answers));
  const siteUrl = await getSiteUrl();
  const shareUrl = `${siteUrl}/${topic.slug}`;
  const isOpen = topic.status === "open";
  const qrDataUrl = await QRCode.toDataURL(shareUrl, { width: 220, margin: 1, color: { dark: "#0D1B3A" } });

  return (
    <main>
      {/* 헤더 카드 */}
      <div className="card mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-brand-ink">{topic.title}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
              <span className={`rounded-full px-2 py-0.5 font-semibold ${isOpen ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"}`}>
                {isOpen ? "접수중" : "마감"}
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-gray-500">/{topic.slug}</span>
              {topic.deadline && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-500">
                  마감 {formatSeoulTime(topic.deadline)}
                </span>
              )}
              {topic.capacity && (
                <span className="rounded-full bg-brand-light px-2 py-0.5 font-semibold text-brand">
                  정원 {all.length}/{topic.capacity}
                </span>
              )}
              {topic.per_person_limit && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-500">
                  인당 {topic.per_person_limit}회
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`/admin/${slug}/edit`} className="btn-ghost px-4 py-2 text-sm">양식 수정</a>
            <a href={`/admin/${slug}/export`} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
              엑셀 다운로드
            </a>
            <form action={toggleTopicStatus.bind(null, slug)}>
              <button className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${isOpen ? "bg-gray-500" : "bg-brand"}`}>
                {isOpen ? "마감하기" : "다시 열기"}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <div className="flex-1">
            <CopyLinkButton
              text={`[${topic.title}]\n아래 링크에서 신청해주세요!\n${shareUrl}`}
              label="카톡 공유 문구 복사"
            />
          </div>
          <details className="shrink-0">
            <summary className="btn-ghost cursor-pointer list-none px-4 py-3.5 text-center text-sm">
              QR코드 보기 (인쇄·게시용)
            </summary>
            <div className="card mt-2 flex flex-col items-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt={`${topic.title} 신청 QR코드`} className="h-40 w-40" />
              <p className="mt-1 text-center text-[11px] text-gray-400">
                스캔하면 신청 화면으로 이동
              </p>
            </div>
          </details>
        </div>
      </div>

      {/* 취합 현황 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-xl bg-brand-ink px-3.5 py-2 text-sm font-bold text-white">
          총 {all.length}건
        </span>
        <span className="rounded-xl bg-white px-3.5 py-2 text-sm font-medium text-gray-600 shadow-card">
          오늘 +{todayCount}건
        </span>
        {branchStats.map(([branch, n]) => (
          <span key={branch} className="rounded-xl bg-white px-3 py-2 text-sm text-gray-600 shadow-card">
            {branch} <b className="text-brand">{n}</b>
          </span>
        ))}
      </div>

      {/* 검색 */}
      <form method="GET" className="mb-3 flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="이름 · 지점 · 코드 검색"
          className="field-input flex-1 py-2.5 text-sm"
        />
        <button className="rounded-xl bg-brand-ink px-5 py-2 text-sm font-medium text-white">검색</button>
      </form>

      {q && (
        <p className="mb-2 text-sm text-gray-500">
          검색 결과 <b className="text-brand">{rows.length}</b>건
        </p>
      )}

      {/* 취합 테이블 — 가로 스크롤 허용 (열이 많은 게 정상) */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-card">
        <table className="w-full min-w-max text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/70 text-xs text-gray-400">
            <tr>
              <th className="px-3 py-2.5 font-medium">제출일시</th>
              {columns.map((c) => (
                <th key={c.header} className="whitespace-nowrap px-3 py-2.5 font-medium">
                  {c.header}
                </th>
              ))}
              <th className="px-3 py-2.5 font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 2} className="px-3 py-10 text-center text-gray-400">
                  {q ? "검색 결과가 없습니다" : "아직 접수된 내역이 없습니다"}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-gray-500">
                  {formatSeoulTime(r.created_at)}
                  {r.updated_at !== r.created_at && (
                    <span className="ml-1 text-orange-400">(수정됨)</span>
                  )}
                </td>
                {columns.map((c) => (
                  <td key={c.header} className="max-w-[240px] truncate px-3 py-2.5">
                    {c.getValue(r.answers)}
                  </td>
                ))}
                <td className="px-3 py-2.5">
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
        삭제는 화면과 엑셀에서만 제외되는 안전 삭제입니다(DB에는 보존됩니다).
      </p>
    </main>
  );
}
