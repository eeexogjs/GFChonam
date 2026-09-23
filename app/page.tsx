import Link from "next/link";
import { createAnonServerClient } from "@/lib/supabase/server";

/**
 * 1단계 검증용 홈 화면.
 * DB에서 open 상태 주제를 읽어와 표시한다 — 이 목록이 보이면
 * "Vercel 배포 + Supabase 연결 + RLS" 3박자가 전부 동작하는 것.
 * 2단계에서 /[slug] 제출 화면이 붙으면 이 화면은 주제 목록 허브가 된다.
 */
export const revalidate = 0; // 항상 최신 (취합 현황은 신선도가 생명)

export default async function Home() {
  const supabase = createAnonServerClient();
  const { data: topics, error } = await supabase
    .from("topics")
    .select("id, title, slug, type, description, deadline")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-brand">취합ON</h1>
        <p className="mt-1 text-sm text-gray-500">
          택배·세미나·잡설명회 신청을 한 곳에서
        </p>
      </header>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          DB 연결 실패: {error.message}
          <p className="mt-1 text-xs text-red-500">
            Vercel 환경변수(NEXT_PUBLIC_SUPABASE_URL / ANON_KEY)를 확인하세요.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            ✅ Supabase 연결 정상 — 진행 중인 취합 {topics?.length ?? 0}건
          </div>
          <ul className="space-y-3">
            {topics?.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/${t.slug}`}
                  className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-brand"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{t.title}</span>
                    <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs text-brand">
                      {t.type}
                    </span>
                  </div>
                  {t.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-500">{t.description}</p>
                  )}
                  <p className="mt-2 text-xs text-gray-400">신청하기 →</p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
