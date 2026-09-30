import Link from "next/link";
import BrandHeader from "@/components/BrandHeader";
import FindForm from "./FindForm";

export const metadata = { title: "내 접수 찾기 | 취합ON" };

/**
 * 내 접수 찾기 — 접수증 링크를 잃어버린 설계사가
 * 성함+사번으로 본인 접수 내역(접수증 링크)을 다시 찾는 화면.
 */
export default function MyPage() {
  return (
    <>
      <BrandHeader />
      <main className="mx-auto max-w-md px-5 py-8">
        <h1 className="text-2xl font-extrabold text-brand-ink">내 접수 찾기</h1>
        <p className="mt-1 text-sm text-gray-500">
          성함과 사번을 입력하면 내가 신청한 내역을 확인·수정할 수 있어요
        </p>
        <div className="mt-5">
          <FindForm />
        </div>
        <Link href="/" className="mt-6 block text-center text-sm text-gray-400 underline">
          홈으로 돌아가기
        </Link>
      </main>
    </>
  );
}
