import Link from "next/link";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isValidSession } from "@/lib/admin-auth";
import { logoutAction } from "./actions";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const loggedIn = await isValidSession(cookieStore.get(ADMIN_COOKIE)?.value);

  return (
    <div className="min-h-screen bg-[#F6F7FB]">
      <header className="bg-brand-ink">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-5">
            <Link href="/admin" className="text-lg font-extrabold tracking-tight text-white">
              취합<span className="text-brand-cyan">ON</span>
              <span className="ml-1.5 text-xs font-medium text-white/50">관리자</span>
            </Link>
            {loggedIn && (
              <nav className="flex items-center gap-4 text-[13px] font-medium text-white/70">
                <Link href="/admin" className="hover:text-white">접수 관리</Link>
                <Link href="/admin/members" className="hover:text-white">명단 관리</Link>
              </nav>
            )}
          </div>
          {loggedIn && (
            <form action={logoutAction}>
              <button className="text-xs text-white/50 hover:text-white">로그아웃</button>
            </form>
          )}
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-6">{children}</div>
    </div>
  );
}
