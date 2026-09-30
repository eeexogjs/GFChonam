import Link from "next/link";
import { notFound } from "next/navigation";
import BrandHeader from "@/components/BrandHeader";
import CopyLinkButton from "@/components/CopyLinkButton";
import InviteMaker from "@/components/invite/InviteMaker";
import { createAdminClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { extractGuestNames, type InviteSettings } from "@/lib/invite";
import {
  formatValue,
  type Answers,
  type FormSchema,
  type RepeatGroupField,
} from "@/lib/form-schema";

export const revalidate = 0;

/**
 * 접수증 화면 — 이 URL 자체가 "내 접수증"이다.
 * (익명 조회가 막혀 있어 이 링크 없이는 누구도 남의 내역을 볼 수 없다)
 */
export default async function DonePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; token: string }>;
  searchParams: Promise<{ updated?: string }>;
}) {
  const { slug, token } = await params;
  const { updated } = await searchParams;

  const admin = createAdminClient();
  const { data: submission } = await admin
    .from("submissions")
    .select("answers, created_at, updated_at, topics!inner(title, slug, form_schema, invite)")
    .eq("edit_token", token)
    .eq("topics.slug", slug)
    .is("deleted_at", null)
    .single();

  if (!submission) notFound();

  const topic = submission.topics as unknown as {
    title: string;
    form_schema: FormSchema;
    invite: InviteSettings | null;
  };
  const answers = submission.answers as Answers;
  const siteUrl = await getSiteUrl();
  const invite = topic.invite?.enabled ? topic.invite : null;
  const guestNames = invite ? extractGuestNames(topic.form_schema, answers) : [];

  return (
    <>
      <BrandHeader />
      <main className="mx-auto max-w-md px-5 py-8 pb-16">
        {/* 완료 배너 */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-light">
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-brand" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="mt-4 text-xl font-extrabold text-brand-ink">
            {updated ? "수정이 완료되었어요" : "신청이 접수되었어요"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{topic.title}</p>
        </div>

        {/* 접수 내역 */}
        <section className="card mt-6">
          <h2 className="mb-3 border-b border-gray-100 pb-2.5 text-sm font-bold text-brand-ink">
            접수 내역
          </h2>
          <dl className="space-y-2.5 text-sm">
            {topic.form_schema.map((field) => {
              if (field.block === "heading") return null;
              if (field.block === "repeat_group") {
                const items = (answers[field.id] as Record<string, unknown>[]) ?? [];
                const rg = field as RepeatGroupField;
                return items.map((item, i) => (
                  <div key={`${field.id}-${i}`} className="rounded-xl bg-gray-50 p-3.5">
                    <p className="mb-1.5 text-[13px] font-bold text-brand">
                      {rg.itemLabel ?? rg.label} {i + 1}
                    </p>
                    {rg.fields.map((sub) => {
                      const v = formatValue(sub, item?.[sub.id] as Answers[string]);
                      if (v === "-") return null;
                      return (
                        <div key={sub.id} className="flex justify-between gap-3 py-0.5">
                          <dt className="shrink-0 text-gray-400">{sub.label.replace(/ ?\(선택\)/, "")}</dt>
                          <dd className="text-right font-medium">{v}</dd>
                        </div>
                      );
                    })}
                  </div>
                ));
              }
              return (
                <div key={field.id} className="flex justify-between gap-3">
                  <dt className="shrink-0 text-gray-400">{field.label.replace(/ ?\(선택\)/, "")}</dt>
                  <dd className="text-right font-medium">{formatValue(field, answers[field.id])}</dd>
                </div>
              );
            })}
          </dl>
          <p className="mt-3 border-t border-gray-100 pt-2.5 text-[11px] text-gray-400">
            접수 {new Date(submission.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
            {submission.updated_at !== submission.created_at &&
              ` · 수정 ${new Date(submission.updated_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`}
          </p>
        </section>

        {/* 초대장 만들기 — 관리자가 이 취합에 초대장을 켠 경우에만 */}
        {invite && <InviteMaker invite={invite} guestNames={guestNames} />}

        <div className="mt-5 space-y-2.5">
          <Link
            href={`/${slug}/edit/${token}`}
            className="btn-primary block w-full py-3.5 text-center"
          >
            내 신청 수정하기
          </Link>
          <CopyLinkButton
            text={`${siteUrl}/${slug}/done/${token}`}
            label="접수증 링크 복사하기"
          />
        </div>

        {/* 확인·수정·취소 안내 — 접수 확인 방식의 제약을 포함해 명확히 */}
        <section className="card mt-5 text-[13px] leading-relaxed text-gray-600">
          <h2 className="mb-2 text-sm font-bold text-brand-ink">확인 · 수정 · 취소 안내</h2>
          <ul className="space-y-1.5">
            <li>
              <b className="text-brand">내역 확인</b> — 별도 로그인이 없어{" "}
              <b>이 접수증 링크가 유일한 확인 수단</b>이에요. 위 버튼으로 복사해{" "}
              <b>나에게 카톡</b>으로 보관해주세요.
            </li>
            <li>
              <b className="text-brand">수정</b> — 접수 마감 전까지 [내 신청 수정하기]에서 직접
              수정할 수 있어요.
            </li>
            <li>
              <b className="text-brand">취소</b> — 화면에서 직접 취소는 지원하지 않아요. 취소가
              필요하면 담당자에게 요청해주세요.
            </li>
            <li className="text-gray-400">
              링크를 잃어버렸다면 홈 화면의 <b>[내 접수 확인·수정하기]</b>에서 성함·사번으로
              다시 찾을 수 있어요.
            </li>
          </ul>
        </section>
      </main>
    </>
  );
}
