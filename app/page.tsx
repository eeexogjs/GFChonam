import Link from "next/link";
import BrandHeader from "@/components/BrandHeader";
import { createAnonServerClient } from "@/lib/supabase/server";

export const revalidate = 0;

const TYPE_LABEL: Record<string, string> = {
  delivery: "택배",
  seminar: "세미나",
  jobfair: "잡설명회",
  survey: "설문",
  custom: "접수",
};

export default async function Home() {
  const supabase = createAnonServerClient();
  const { data: topics, error } = await supabase
    .from("topics")
    .select("id, title, slug, type, description, deadline")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  return (
    <>
      <BrandHeader showOperatorLinks />
      <main className="mx-auto max-w-md px-5 py-8">
        <h1 className="text-2xl font-extrabold leading-snug text-brand-ink">
          지금 진행 중인 접수
        </h1>
        <p className="mt-1 text-sm text-gray-500">신청은 1분, 취합은 자동으로</p>

        <div className="mt-6">
          {error ? (
            <div className="card border-red-100 bg-red-50 p-4 text-sm text-red-700">
              일시적으로 목록을 불러오지 못했어요. 잠시 후 새로고침해주세요.
            </div>
          ) : topics?.length === 0 ? (
            <div className="card px-6 py-12 text-center text-sm text-gray-400">
              지금 진행 중인 접수가 없습니다
            </div>
          ) : (
            <ul className="space-y-3">
              {topics?.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/${t.slug}`}
                    className="card block transition-all hover:border-brand/40 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[17px] font-bold leading-snug text-brand-ink">
                        {t.title}
                      </span>
                      <span className="mt-0.5 shrink-0 rounded-full bg-brand-light px-2.5 py-1 text-xs font-bold text-brand">
                        {TYPE_LABEL[t.type] ?? t.type}
                      </span>
                    </div>
                    {/* 상태 + 마감 — 신청서를 열기 전에 알 수 있게 */}
                    <p className="mt-2 flex items-center gap-1.5 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-600">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden />
                        접수 중
                      </span>
                      <span className="text-gray-400">
                        {t.deadline
                          ? `${new Date(t.deadline).toLocaleString("ko-KR", {
                              timeZone: "Asia/Seoul",
                              month: "long",
                              day: "numeric",
                              weekday: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })} 마감`
                          : "마감일 미정"}
                      </span>
                    </p>
                    <p className="mt-2.5 text-sm font-semibold text-brand">
                      신청하러 가기 →
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
