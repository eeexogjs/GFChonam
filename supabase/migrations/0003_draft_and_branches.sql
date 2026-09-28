-- 2026-09-28 적용 완료 (기록용 사본)

-- 1) 초안(draft) 상태: 새 취합은 초안으로 만들어져 "공개하기" 전까지 노출되지 않는다.
--    익명(RLS) 정책은 status='open'만 허용하므로 초안은 자동으로 조회·제출 불가.
alter table public.topics drop constraint if exists topics_status_check;
alter table public.topics add constraint topics_status_check
  check (status in ('draft','open','closed'));

-- 2) 지점 마스터: 지점장 모드 제출률의 분모(설계사수)를 관리자가 등록
create table if not exists public.branches (
  name text primary key,
  headcount int not null check (headcount >= 0),
  active boolean not null default true
);
alter table public.branches enable row level security;
-- 익명 정책 없음: 조회·수정 모두 서버(service role) 전용
