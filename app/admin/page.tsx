import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { STATUS_LABEL, TYPE_LABEL } from "@/lib/labels";
import type { Answers, FormSchema, RepeatGroupField } from "@/lib/form-schema";
import { duplicateTopic } from "./actions";

export const revalidate = 0;

interface TopicRow {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: "draft" | "open" | "closed";
  deadline: string | null;
  created_at: string;
  form_schema: FormSchema;
}

/** 응답(건수)과 인원(반복그룹 합계)을 구분해 집계 */
function countPeople(schema: FormSchema, answersList: Answers[]): number {
  const rg = schema.find((f) => f.block === "repeat_group") as RepeatGroupField | undefined;
  if (!rg) return answersList.length; // 반복그룹 없는 양식은 1건=1명
  return answersList.reduce((sum, a) => {
    const arr = a?.[rg.id];
    return sum + (Array.isArray(arr) ? arr.length : 0);
  }, 0);
}

export default async function AdminHome() {
  const admin = createAdminClient();
  const [{ data: topics }, { data: subs }] = await Promise.all([
    admin
      .from("topics")
      .select("id, title, slug, type, status, deadline, created_at, form_schema")
      .order("created_at", { ascending: false })
      .returns<TopicRow[]>(),
    admin
      .from("submissions")
      .select("topic_id, answers")
      .is("deleted_at", null)
      .returns<{ topic_id: string; answers: Answers }[]>(),
  ]);

  const byTopic = new Map<string, Answers[]>();
  for (const s of subs ?? []) {
    if (!byTopic.has(s.topic_id)) byTopic.set(s.topic_id, []);
    byTopic.get(s.topic_id)!.push(s.answers);
  }

  const hasDraft = (topics ?? []).some((t) => t.status === "draft");

  return (
    <main>
      {/* 헤더 — ADMINISTRATION / 취합 관리 */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.2em] text-gray-400">ADMINISTRATION</p>
          <h1 className="mt-1 text-2xl font-extrabold text-brand-ink">취합 관리</h1>
          <p className="mt-1 text-sm text-gray-500">양식을 만들고 응답을 한곳에서 관리하세요.</p>
        </div>
        <Link href="/admin/new" className="btn-primary px-5 py-3 text-sm">
          + 새 취합 만들기
        </Link>
      </div>

      {/* 전체 취합 테이블 */}
      <section className="card p-0">
        <div className="flex items-center justify-between px-4 py-3.5">
          <h2 className="font-bold text-brand-ink">전체 취합</h2>
          {hasDraft && (
            <span className="text-xs text-gray-400">초안을 편집한 후 공개하세요</span>
          )}
        </div>
        <div className="overflow-x-auto border-t border-gray-100">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-gray-50/70 text-xs text-gray-400">
              <tr>
                <th className="px-4 py-2.5 font-medium">취합 제목</th>
                <th className="px-4 py-2.5 font-medium">상태</th>
                <th className="px-4 py-2.5 font-medium">마감</th>
                <th className="px-4 py-2.5 font-medium">응답 / 인원</th>
                <th className="px-4 py-2.5 font-medium">관리</th>
              </tr>
            </thead>
            <tbody>
              {(topics ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                    아직 만든 취합이 없습니다 — 우측 상단에서 새로 만들 수 있어요
                  </td>
                </tr>
              )}
              {(topics ?? []).map((t) => {
                const answersList = byTopic.get(t.id) ?? [];
                const status = STATUS_LABEL[t.status] ?? STATUS_LABEL.closed;
                return (
                  <tr key={t.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/${t.slug}`} className="font-bold text-brand-ink underline decoration-gray-300 underline-offset-4 hover:decoration-brand">
                        {t.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-gray-400">{TYPE_LABEL[t.type] ?? t.type}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${status.cls}`}>
                        {status.text}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {t.deadline
                        ? new Date(t.deadline).toLocaleString("ko-KR", {
                            timeZone: "Asia/Seoul",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <b className="text-brand">{answersList.length}건</b>
                      <span className="text-gray-400"> / {countPeople(t.form_schema, answersList)}명</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex gap-1.5">
                        <Link
                          href={`/admin/${t.slug}/edit`}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-brand hover:text-brand"
                        >
                          편집
                        </Link>
                        <form action={duplicateTopic.bind(null, t.slug)}>
                          <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-brand hover:text-brand">
                            복제
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <p className="mt-2 text-xs text-gray-400">
        복제하면 양식·설정만 복사된 <b>초안</b>이 만들어져요 (응답은 복사되지 않음). 제목을 눌러 취합 현황·엑셀로 이동합니다.
      </p>
    </main>
  );
}
