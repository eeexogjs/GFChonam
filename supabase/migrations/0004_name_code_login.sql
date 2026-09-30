-- 성함/사번 로그인 (v3.3)
-- 관리자: admins 테이블에 등록된 성함+사번만 통과
-- 지점장: branches.manager_name/manager_code와 대조해 본인 지점 자동 매칭
create table if not exists admins (
  code text primary key,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table admins enable row level security; -- 정책 없음 = service role 전용

alter table branches add column if not exists manager_name text;
alter table branches add column if not exists manager_code text;
