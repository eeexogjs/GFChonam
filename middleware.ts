import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, isValidSession } from "@/lib/admin-auth";

/**
 * /admin/* 전체를 세션 쿠키로 보호한다.
 * 로그인 화면(/admin/login)만 예외 — 그 외 미인증 접근은 전부 로그인으로 보낸다.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") return NextResponse.next();

  const ok = await isValidSession(request.cookies.get(ADMIN_COOKIE)?.value);
  if (!ok) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
