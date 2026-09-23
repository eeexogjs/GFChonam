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
    <div className="min-h-screen bg-gray-100">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="font-bold text-brand">
            취합ON <span className="text-sm font-normal text-gray-400">관리자</span>
          </Link>
          {loggedIn && (
            <form action={logoutAction}>
              <button className="text-sm text-gray-500 underline">로그아웃</button>
            </form>
          )}
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-6">{children}</div>
    </div>
  );
}
