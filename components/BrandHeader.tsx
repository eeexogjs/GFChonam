import Link from "next/link";

/** 전 화면 공통 브랜드 헤더 — 짙은 녹색 + 밝은 그린 포인트 */
export default function BrandHeader({
  sub,
  showOperatorLinks = false,
}: {
  sub?: string;
  /** true면 우측에 지점장·관리자 진입 버튼을 표시 (홈에서만 사용) */
  showOperatorLinks?: boolean;
}) {
  return (
    <header className="bg-brand-ink">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-baseline gap-0.5">
          <span className="text-lg font-extrabold tracking-tight text-white">
            취합<span className="text-brand-cyan">ON</span>
          </span>
        </Link>
        {showOperatorLinks ? (
          <nav className="flex items-center gap-2">
            <Link
              href="/manager"
              className="flex items-center gap-1.5 rounded-lg border border-white/30 px-3 py-1.5 text-[13px] font-semibold text-white/90 transition-colors hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M3 21h18M7 21V9m5 12V3m5 18v-8" />
              </svg>
              지점장 모드
            </Link>
            <Link
              href="/admin"
              className="flex items-center gap-1.5 rounded-lg border border-white/30 px-3 py-1.5 text-[13px] font-semibold text-white/90 transition-colors hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              관리자 모드
            </Link>
          </nav>
        ) : (
          <span className="text-[11px] font-medium text-white/50">
            {sub ?? "삼성생명 GFC사업부"}
          </span>
        )}
      </div>
    </header>
  );
}
