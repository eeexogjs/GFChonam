import { createAdminClient } from "@/lib/supabase/server";
import MembersForm from "./MembersForm";

export const revalidate = 0;

/**
 * 명단 관리 — 코드 검증·자동입력의 기준 데이터.
 * 명단이 비어 있으면 검증 없이 운영되고, 등록하는 순간부터
 * 제출 화면에서 코드 대조·성함/지점 자동입력이 켜진다.
 */
export default async function MembersPage() {
  const admin = createAdminClient();
  const { count } = await admin
    .from("members")
    .select("code", { count: "exact", head: true });
  const { data: sample } = await admin
    .from("members")
    .select("code, name, branch, active")
    .order("branch")
    .limit(8);

  return (
    <main>
      <h1 className="text-lg font-bold text-brand-ink">명단 관리</h1>
      <p className="mt-1 text-sm text-gray-500">
        명단을 등록하면 제출 화면에서 <b>코드 검증</b>과 <b>성함·지점 자동입력</b>이 켜집니다.
        비워두면 검증 없이 운영됩니다.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="card">
          <h2 className="mb-2 text-sm font-bold text-brand-ink">
            현재 등록: <span className="text-brand">{count ?? 0}명</span>
          </h2>
          {sample && sample.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-gray-400">
                <tr>
                  <th className="py-1">코드</th>
                  <th className="py-1">성함</th>
                  <th className="py-1">지점</th>
                </tr>
              </thead>
              <tbody>
                {sample.map((m) => (
                  <tr key={m.code} className="border-t border-gray-50">
                    <td className="py-1.5 font-mono text-xs">{m.code}</td>
                    <td className="py-1.5">{m.name}</td>
                    <td className="py-1.5 text-gray-500">{m.branch}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="py-6 text-center text-sm text-gray-400">아직 등록된 명단이 없습니다</p>
          )}
          {(count ?? 0) > 8 && (
            <p className="mt-2 text-xs text-gray-400">외 {(count ?? 0) - 8}명 (일부만 표시)</p>
          )}
        </section>

        <MembersForm />
      </div>
    </main>
  );
}
