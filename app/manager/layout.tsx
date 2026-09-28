import Link from "next/link";
import { cookies } from "next/headers";
import { BRANCH_COOKIE, readBranchSession } from "@/lib/admin-auth";
import { PORTAL_NAME_LINE1, PORTAL_NAME_LINE2 } from "@/lib/labels";
import { branchLogout } from "./actions";

/** 지점장 모드 공통 헤더 — 관리자와 같은 포털 헤더에 지점장 신원 표시 */
export default async function ManagerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const branch = await readBranchSession(cookieStore.get(BRANCH_COOKIE)?.value);

  return (
    <div className="min-h-screen bg-[#F6F7FB]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/manager" className="leading-tight">
            <span className="block text-[15px] font-extrabold text-brand-ink">{PORTAL_NAME_LINE1}</span>
            <span className="block text-[12px] font-medium text-gray-400">{PORTAL_NAME_LINE2}</span>
          </Link>
          <div className="flex items-center gap-3">
            {branch && (
              <>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-light text-sm font-bold text-brand" aria-hidden>
                  {branch.slice(0, 1)}
                </span>
                <span className="hidden text-sm font-semibold text-brand-ink sm:inline">{branch}지점</span>
                <span className="rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-bold text-brand">
                  지점장
                </span>
              </>
            )}
            <Link
              href="/"
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-[13px] font-semibold text-gray-600 hover:border-brand hover:text-brand"
            >
              홈으로
            </Link>
            {branch && (
              <form action={branchLogout}>
                <button className="text-sm text-gray-400 hover:text-brand-ink">나가기</button>
              </form>
            )}
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-6">{children}</div>
    </div>
  );
}
