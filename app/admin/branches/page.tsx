import { createAdminClient } from "@/lib/supabase/server";
import BranchesForm from "./BranchesForm";

export const revalidate = 0;

/**
 * 지점 관리 — 지점명과 설계사수를 등록한다.
 * 설계사수는 지점장 모드에서 "제출 직원 X/Y명"과 미제출 인원의 분모로 쓰인다.
 * 등록하지 않은 지점은 제출률을 표시하지 않는다(임의 수치 금지 원칙).
 */
export default async function BranchesPage() {
  const admin = createAdminClient();
  const { data: branches } = await admin
    .from("branches")
    .select("name, headcount, active, manager_name, manager_code")
    .order("name");

  return (
    <main>
      <h1 className="text-lg font-bold text-brand-ink">지점 관리</h1>
      <p className="mt-1 text-sm text-gray-500">
        지점명과 <b>설계사수</b>를 등록하면 지점장 모드에서 <b>제출 직원 X/설계사수</b>와{" "}
        <b>미제출 인원</b>이 표시됩니다. 등록하지 않은 지점은 건수만 표시돼요.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="card">
          <h2 className="mb-2 text-sm font-bold text-brand-ink">
            등록된 지점: <span className="text-brand">{branches?.length ?? 0}개</span>
          </h2>
          {branches && branches.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-gray-400">
                <tr>
                  <th className="py-1">지점명</th>
                  <th className="py-1 text-right">설계사수</th>
                  <th className="py-1 text-right">지점장</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((b) => (
                  <tr key={b.name} className="border-t border-gray-50">
                    <td className="py-1.5 font-medium">{b.name}</td>
                    <td className="py-1.5 text-right">{b.headcount}명</td>
                    <td className="py-1.5 text-right">
                      {b.manager_name ? (
                        <span className="text-xs font-semibold text-emerald-600">
                          {b.manager_name}
                          {b.manager_code && <span className="ml-1 font-mono text-gray-400">({b.manager_code})</span>}
                        </span>
                      ) : (
                        <span className="text-xs text-orange-400">미등록</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="py-6 text-center text-sm text-gray-400">아직 등록된 지점이 없습니다</p>
          )}
        </section>

        <BranchesForm />
      </div>
    </main>
  );
}
