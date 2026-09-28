import Link from "next/link";

/** 전 화면 공통 브랜드 헤더 — 짙은 녹색 + 밝은 그린 포인트 */
export default function BrandHeader({
  sub,
  showOperatorLinks = false,
}: {
  sub?: string;
  /** true면 우측에 지점장·관리자 진입 링크를 작게 표시 (홈에서만 사용) */
  showOperatorLinks?: boolean;
}) {
  return (
    <header className="bg-brand-ink">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
        <Link href="/" className="flex items-baseline gap-0.5">
          <span className="text-lg font-extrabold tracking-tight text-white">
            취합<span className="text-brand-cyan">ON</span>
          </span>
        </Link>
        {showOperatorLinks ? (
          <nav className="flex items-center gap-2 text-[12px] font-medium text-white/55">
            <Link href="/manager" className="hover:text-white">지점장</Link>
            <span aria-hidden className="text-white/25">|</span>
            <Link href="/admin" className="hover:text-white">관리자</Link>
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
