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
                    {t.deadline && (
                      <p className="mt-2 text-xs text-gray-400">
                        마감{" "}
                        {new Date(t.deadline).toLocaleString("ko-KR", {
                          timeZone: "Asia/Seoul",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
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
