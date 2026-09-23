import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";

export const revalidate = 0;

interface TopicListRow {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: "open" | "closed";
  deadline: string | null;
  created_at: string;
  submissions: { count: number }[];
}

function dday(deadline: string | null): string | null {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (diff < 0) return "기한 지남";
  if (diff === 0) return "D-Day";
  return `D-${diff}`;
}

export default async function AdminHome() {
  const admin = createAdminClient();
  const { data: topics } = await admin
    .from("topics")
    .select("id, title, slug, type, status, deadline, created_at, submissions(count)")
    .is("submissions.deleted_at", null)
    .order("created_at", { ascending: false })
    .returns<TopicListRow[]>();

  const open = topics?.filter((t) => t.status === "open") ?? [];
  const closed = topics?.filter((t) => t.status === "closed") ?? [];

  const Card = ({ t }: { t: TopicListRow }) => (
    <Link
      href={`/admin/${t.slug}`}
      className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-brand"
    >
      <div>
        <p className="font-semibold">{t.title}</p>
        <p className="mt-0.5 text-xs text-gray-400">
          /{t.slug} · {t.type}
          {t.deadline && t.status === "open" && (
            <span className="ml-2 font-medium text-orange-500">{dday(t.deadline)}</span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-brand-light px-2.5 py-1 text-sm font-semibold text-brand">
          {t.submissions?.[0]?.count ?? 0}건
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            t.status === "open" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"
          }`}
        >
          {t.status === "open" ? "진행중" : "마감"}
        </span>
      </div>
    </Link>
  );

  return (
    <main>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">취합 주제</h1>
        <Link
          href="/admin/new"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
        >
          + 새 취합 만들기
        </Link>
      </div>

      <section className="space-y-3">
        {open.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
            진행 중인 취합이 없습니다
          </p>
        )}
        {open.map((t) => (
          <Card key={t.id} t={t} />
        ))}
      </section>

      {closed.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-sm font-semibold text-gray-500">마감된 취합</h2>
          <section className="space-y-3 opacity-70">
            {closed.map((t) => (
              <Card key={t.id} t={t} />
            ))}
          </section>
        </>
      )}
    </main>
  );
}
