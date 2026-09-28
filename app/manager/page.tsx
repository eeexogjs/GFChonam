import Link from "next/link";
import BrandHeader from "@/components/BrandHeader";
import { createAdminClient } from "@/lib/supabase/server";
import type { Answers, FormSchema, RepeatGroupField } from "@/lib/form-schema";

export const revalidate = 0;

/**
 * 지점장 모드 — 우리 지점의 접수 현황을 "집계 숫자"로만 보여준다.
 * - 개인별 명단 없이 운영: 분모(설계사수)는 관리자 모드 > 지점 관리에서 등록
 * - 설계사수 미등록 지점은 제출률·미제출을 표시하지 않는다 (임의 수치 금지)
 * - 수령인 주소·연락처 등 상세 데이터는 이 화면에 노출하지 않는다
 */
export default async function ManagerPage({
  searchParams,
}: {
  searchParams: Promise<{ b?: string; t?: string }>;
}) {
  const { b, t } = await searchParams;
  const admin = createAdminClient();

  const [{ data: branches }, { data: topics }] = await Promise.all([
    admin.from("branches").select("name, headcount").eq("active", true).order("name"),
    admin
      .from("topics")
      .select("id, title, slug, status, form_schema")
      .in("status", ["open", "closed"])
      .order("created_at", { ascending: false })
      .returns<{ id: string; title: string; slug: string; status: string; form_schema: FormSchema }[]>(),
  ]);

  const branch = branches?.find((x) => x.name === b) ?? null;
  const topic = topics?.find((x) => x.slug === t) ?? topics?.[0] ?? null;

  // 선택된 지점·이벤트의 제출 데이터 집계 (개인정보 컬럼은 카드에 노출하지 않음)
  let submittedStaff = 0;
  let people = 0;
  let entryCount = 0;
  let peopleLabel = "명";
  if (branch && topic) {
    const { data: subs } = await admin
      .from("submissions")
      .select("submitter, answers")
      .eq("topic_id", topic.id)
      .is("deleted_at", null)
      .eq("submitter->>branch", branch.name)
      .returns<{ submitter: { code?: string; name?: string }; answers: Answers }[]>();

    const rows = subs ?? [];
    entryCount = rows.length;
    const codes = new Set(rows.map((r) => r.submitter?.code || r.submitter?.name || "?"));
    submittedStaff = codes.size;

    const rg = topic.form_schema.find((f) => f.block === "repeat_group") as RepeatGroupField | undefined;
    if (rg) {
      peopleLabel = rg.itemLabel ?? "명";
      people = rows.reduce((s, r) => {
        const arr = r.answers?.[rg.id];
        return s + (Array.isArray(arr) ? arr.length : 0);
      }, 0);
    } else {
      people = entryCount;
    }
  }

  const headcount = branch?.headcount ?? null;
  const notSubmitted = headcount !== null ? Math.max(headcount - submittedStaff, 0) : null;

  return (
    <>
      <BrandHeader />
      <main className="mx-auto max-w-2xl px-5 py-8">
        <p className="text-[11px] font-bold tracking-[0.2em] text-gray-400">BRANCH OVERVIEW</p>
        <h1 className="mt-1 text-2xl font-extrabold text-brand-ink">
          {branch ? `${branch.name}지점 취합 현황` : "지점 취합 현황"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">제출 여부와 신청 규모를 구분해서 확인하세요.</p>

        {!branches?.length ? (
          <div className="card mt-6 px-6 py-10 text-center text-sm text-gray-500">
            아직 등록된 지점이 없어요.
            <br />
            관리자에게 <b>관리자 모드 → 지점 관리</b> 등록을 요청해주세요.
            <div className="mt-4">
              <Link href="/" className="btn-ghost inline-block px-6 py-2.5 text-sm">홈으로</Link>
            </div>
          </div>
        ) : (
          <>
            {/* 지점·이벤트 선택 */}
            <form method="GET" className="mt-5 flex flex-col gap-2 sm:flex-row">
              <select name="b" defaultValue={branch?.name ?? ""} className="field-input sm:w-40">
                <option value="">지점 선택</option>
                {branches.map((x) => (
                  <option key={x.name} value={x.name}>{x.name}</option>
                ))}
              </select>
              <select name="t" defaultValue={topic?.slug ?? ""} className="field-input flex-1">
                {(topics ?? []).map((x) => (
                  <option key={x.slug} value={x.slug}>{x.title}</option>
                ))}
              </select>
              <button className="btn-primary shrink-0 px-6 py-3 text-sm">조회</button>
            </form>

            {branch && topic ? (
              <>
                <p className="mt-3 text-right text-xs text-gray-400">
                  {headcount !== null ? "등록된 설계사수 기준" : "설계사수 미등록 지점"}
                </p>
                <div className="mt-1 grid gap-3 sm:grid-cols-3">
                  {/* 제출 직원 — 강조 카드 */}
                  <div className="rounded-2xl bg-brand-ink p-4 text-white shadow-card">
                    <p className="text-[13px] font-semibold text-white/70">제출 직원</p>
                    <p className="mt-2 text-3xl font-extrabold">
                      {submittedStaff}
                      {headcount !== null && (
                        <span className="text-base font-semibold text-white/60"> / {headcount}명</span>
                      )}
                      {headcount === null && <span className="text-base font-semibold text-white/60">명</span>}
                    </p>
                    <p className="mt-1.5 text-[11px] text-white/50">사번 중복 없이 · 삭제된 신청 제외</p>
                  </div>
                  <div className="card">
                    <p className="text-[13px] font-semibold text-gray-500">신청 인원</p>
                    <p className="mt-2 text-3xl font-extrabold text-brand-ink">
                      {people}<span className="text-base font-semibold text-gray-400">명</span>
                    </p>
                    <p className="mt-1.5 text-[11px] text-gray-400">
                      {peopleLabel !== "명" ? `${peopleLabel} 수 합계` : "제출 건수 기준"} · 총 {entryCount}건
                    </p>
                  </div>
                  <div className="card">
                    <p className="text-[13px] font-semibold text-gray-500">미제출 직원</p>
                    {notSubmitted !== null ? (
                      <>
                        <p className="mt-2 text-3xl font-extrabold text-brand-ink">
                          {notSubmitted}<span className="text-base font-semibold text-gray-400">명</span>
                        </p>
                        <p className="mt-1.5 text-[11px] text-gray-400">설계사수 − 제출 직원</p>
                      </>
                    ) : (
                      <p className="mt-3 text-xs leading-relaxed text-gray-400">
                        설계사수가 등록되지 않아 표시하지 않아요. 관리자 모드 → 지점 관리에서 등록하면 계산됩니다.
                      </p>
                    )}
                  </div>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-gray-400">
                  이 화면은 집계 숫자만 제공합니다. 개별 신청 내용(주소·연락처 등)은 관리자에게 문의해주세요.
                </p>
              </>
            ) : (
              <div className="card mt-4 px-6 py-8 text-center text-sm text-gray-400">
                지점을 선택하고 [조회]를 눌러주세요
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
