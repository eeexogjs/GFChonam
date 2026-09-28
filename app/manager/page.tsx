import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import { BRANCH_COOKIE, readBranchSession } from "@/lib/admin-auth";
import type { Answers, FormSchema, RepeatGroupField } from "@/lib/form-schema";
import LoginForm from "./LoginForm";

export const revalidate = 0;

/**
 * 지점장 모드 — 로그인한 지점의 현황만 보여준다.
 * 제출된 신청 자체가 제출 현황이 된다: 별도 직원 명단 없이
 * 제출자(이름·사번)별 신청 규모를 표로 제공한다.
 * - 설계사수(지점 관리)가 등록돼 있으면 "제출 직원 X/Y명"의 분모로만 활용
 * - 수령인 주소·연락처 등 신청 상세는 이 화면에 노출하지 않는다
 */
export default async function ManagerPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const cookieStore = await cookies();
  const branch = await readBranchSession(cookieStore.get(BRANCH_COOKIE)?.value);
  const admin = createAdminClient();

  // ── 미로그인: 성함 + 사번 ──
  if (!branch) {
    return (
      <main className="py-8">
        <LoginForm />
      </main>
    );
  }

  // ── 로그인됨: 본인 지점 현황 ──
  const [{ data: branchRow }, { data: topics }] = await Promise.all([
    admin.from("branches").select("name, headcount").eq("name", branch).maybeSingle(),
    admin
      .from("topics")
      .select("id, title, slug, status, form_schema")
      .in("status", ["open", "closed"])
      .order("created_at", { ascending: false })
      .returns<{ id: string; title: string; slug: string; status: string; form_schema: FormSchema }[]>(),
  ]);

  const topic = topics?.find((x) => x.slug === t) ?? topics?.[0] ?? null;

  // 제출자별 집계 (이 지점 + 선택 이벤트)
  interface SubmitterRow {
    code: string;
    name: string;
    people: number;
    entries: number;
    firstAt: string;
  }
  const perCode = new Map<string, SubmitterRow>();
  let people = 0;
  let entryCount = 0;
  let peopleLabel: string | null = null;

  if (topic) {
    const { data: subs } = await admin
      .from("submissions")
      .select("submitter, answers, created_at")
      .eq("topic_id", topic.id)
      .is("deleted_at", null)
      .eq("submitter->>branch", branch)
      .order("created_at", { ascending: true })
      .returns<{ submitter: { code?: string; name?: string }; answers: Answers; created_at: string }[]>();

    const rg = topic.form_schema.find((f) => f.block === "repeat_group") as RepeatGroupField | undefined;
    peopleLabel = rg ? (rg.itemLabel ?? null) : null;

    for (const r of subs ?? []) {
      entryCount += 1;
      const code = r.submitter?.code || "-";
      const n = rg
        ? (Array.isArray(r.answers?.[rg.id]) ? (r.answers[rg.id] as unknown[]).length : 0)
        : 1;
      people += n;
      const cur = perCode.get(code);
      if (cur) {
        cur.people += n;
        cur.entries += 1;
      } else {
        perCode.set(code, {
          code,
          name: r.submitter?.name || "-",
          people: n,
          entries: 1,
          firstAt: r.created_at,
        });
      }
    }
  }

  const submitters = [...perCode.values()];
  const submittedStaff = submitters.length;
  const headcount = branchRow?.headcount ?? null;

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  return (
    <main>
      <p className="text-[11px] font-bold tracking-[0.2em] text-gray-400">BRANCH OVERVIEW</p>
      <h1 className="mt-1 text-2xl font-extrabold text-brand-ink">{branch}지점 취합 현황</h1>
      <p className="mt-1 text-sm text-gray-500">누가 얼마나 신청했는지 한눈에 확인하세요.</p>

      {/* 이벤트 선택 */}
      <form method="GET" className="mt-5 flex gap-2">
        <select name="t" defaultValue={topic?.slug ?? ""} className="field-input flex-1">
          {(topics ?? []).map((x) => (
            <option key={x.slug} value={x.slug}>{x.title}</option>
          ))}
        </select>
        <button className="btn-primary shrink-0 px-6 py-3 text-sm">조회</button>
      </form>

      {topic ? (
        <>
          <p className="mt-3 text-right text-xs text-gray-400">
            제출된 신청 기준 · 삭제된 신청 제외
          </p>

          {/* 요약 카드 3개 */}
          <div className="mt-1 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-brand-ink p-4 text-white shadow-card">
              <p className="text-[13px] font-semibold text-white/70">제출 직원</p>
              <p className="mt-2 text-3xl font-extrabold">
                {submittedStaff}
                <span className="text-base font-semibold text-white/60">
                  {headcount !== null ? ` / ${headcount}명` : "명"}
                </span>
              </p>
              <p className="mt-1.5 text-[11px] text-white/50">
                사번 중복 없이{headcount !== null ? " · 분모는 등록된 설계사수" : ""}
              </p>
            </div>
            <div className="card">
              <p className="text-[13px] font-semibold text-gray-500">신청 인원</p>
              <p className="mt-2 text-3xl font-extrabold text-brand-ink">
                {people}<span className="text-base font-semibold text-gray-400">명</span>
              </p>
              <p className="mt-1.5 text-[11px] text-gray-400">
                {peopleLabel ? `${peopleLabel} 수 합계` : "제출 건수 기준"}
              </p>
            </div>
            <div className="card">
              <p className="text-[13px] font-semibold text-gray-500">제출 건수</p>
              <p className="mt-2 text-3xl font-extrabold text-brand-ink">
                {entryCount}<span className="text-base font-semibold text-gray-400">건</span>
              </p>
              <p className="mt-1.5 text-[11px] text-gray-400">수정된 건은 1건으로 집계</p>
            </div>
          </div>

          {/* 제출자별 현황 — 신청 데이터 그 자체가 명단이 된다 */}
          <section className="card mt-5 p-0">
            <div className="flex items-center justify-between px-4 py-3.5">
              <h2 className="font-bold text-brand-ink">직원별 제출 현황</h2>
              <span className="rounded-lg bg-brand-light px-2.5 py-1 text-xs font-bold text-brand">
                {branch}지점
              </span>
            </div>
            <div className="overflow-x-auto border-t border-gray-100">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="bg-gray-50/70 text-xs text-gray-400">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">이름</th>
                    <th className="px-4 py-2.5 font-medium">사번</th>
                    <th className="px-4 py-2.5 font-medium">신청 인원</th>
                    <th className="px-4 py-2.5 font-medium">제출 건수</th>
                    <th className="px-4 py-2.5 font-medium">최초 제출</th>
                  </tr>
                </thead>
                <tbody>
                  {submitters.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                        아직 제출한 직원이 없습니다
                      </td>
                    </tr>
                  )}
                  {submitters.map((s) => (
                    <tr key={s.code} className="border-t border-gray-50">
                      <td className="px-4 py-3 font-semibold text-brand-ink">{s.name}</td>
                      <td className="px-4 py-3 font-mono text-[13px] text-gray-500">{s.code}</td>
                      <td className="px-4 py-3">
                        <b className="text-brand">{s.people}</b>명
                      </td>
                      <td className="px-4 py-3 text-gray-600">{s.entries}건</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{fmtTime(s.firstAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="mt-4 text-xs leading-relaxed text-gray-400">
            이 화면은 제출자와 집계 숫자만 제공합니다. 신청 상세(주소·연락처 등)는 관리자에게 문의해주세요.
          </p>
        </>
      ) : (
        <div className="card mt-4 px-6 py-8 text-center text-sm text-gray-400">
          아직 조회할 접수가 없습니다
        </div>
      )}
    </main>
  );
}
