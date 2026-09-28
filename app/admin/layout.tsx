import Link from "next/link";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isValidSession } from "@/lib/admin-auth";
import { PORTAL_NAME_LINE1, PORTAL_NAME_LINE2 } from "@/lib/labels";
import { logoutAction } from "./actions";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const loggedIn = await isValidSession(cookieStore.get(ADMIN_COOKIE)?.value);

  return (
    <div className="min-h-screen bg-[#F6F7FB]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="leading-tight">
            <span className="block text-[15px] font-extrabold text-brand-ink">{PORTAL_NAME_LINE1}</span>
            <span className="block text-[12px] font-medium text-gray-400">{PORTAL_NAME_LINE2}</span>
          </Link>
          <div className="flex items-center gap-3">
            {loggedIn && (
              <>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white" aria-hidden>
                  운
                </span>
                <span className="hidden text-sm font-semibold text-brand-ink sm:inline">운영마스터</span>
                <span className="rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-bold text-brand">
                  마스터
                </span>
              </>
            )}
            <Link
              href="/"
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-[13px] font-semibold text-gray-600 hover:border-brand hover:text-brand"
            >
              홈으로
            </Link>
            {loggedIn && (
              <form action={logoutAction}>
                <button className="text-sm text-gray-400 hover:text-brand-ink">나가기</button>
              </form>
            )}
          </div>
        </div>
        {loggedIn && (
          <nav className="mx-auto flex max-w-5xl gap-5 px-4 pb-2.5 text-[13px] font-semibold text-gray-500">
            <Link href="/admin" className="hover:text-brand">취합 관리</Link>
            <Link href="/admin/branches" className="hover:text-brand">지점 관리</Link>
            <Link href="/admin/members" className="hover:text-brand">명단 관리</Link>
          </nav>
        )}
      </header>
      <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
    </div>
  );
}
