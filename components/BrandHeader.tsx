import Link from "next/link";

/** 전 화면 공통 브랜드 헤더 — AX-ON 네이비 + 시안 포인트 */
export default function BrandHeader({ sub }: { sub?: string }) {
  return (
    <header className="bg-brand-ink">
      <div className="mx-auto flex max-w-md items-center justify-between px-5 py-3.5">
        <Link href="/" className="flex items-baseline gap-0.5">
          <span className="text-lg font-extrabold tracking-tight text-white">
            취합<span className="text-brand-cyan">ON</span>
          </span>
        </Link>
        <span className="text-[11px] font-medium text-white/50">
          {sub ?? "삼성생명 GFC사업부"}
        </span>
      </div>
    </header>
  );
}
