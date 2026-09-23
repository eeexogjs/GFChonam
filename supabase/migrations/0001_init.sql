-- ============================================================
-- 취합ON 초기 스키마 (1단계) — 2026-09-22 프로젝트 chwihap-on에 적용 완료
-- 이 파일은 기록용 사본. 재구축이 필요할 때 그대로 실행하면 된다.
-- 설계 원칙: 주제는 데이터(form_schema JSON), 응답도 데이터(answers JSON)
-- ============================================================

-- 1) 취합 주제
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,                        -- URL 경로 (/{slug})
  type text not null default 'custom',              -- delivery | seminar | jobfair | survey | custom
  description text,                                 -- 안내문 (마크다운 허용)
  form_schema jsonb not null default '[]'::jsonb,   -- 필드 블록 배열 (2단계 렌더러가 소비)
  status text not null default 'open' check (status in ('open','closed')),
  deadline timestamptz,                             -- null = 무기한
  per_person_limit int,                             -- null = 무제한 (5단계에서 서버 강제)
  created_at timestamptz not null default now()
);

-- 2) 제출 건
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  submitter jsonb not null default '{}'::jsonb,     -- {branch, name, code, phone}
  answers jsonb not null default '{}'::jsonb,       -- form_schema 필드 id → 값
  edit_token uuid not null default gen_random_uuid(), -- 본인 수정용 비밀 토큰
  deleted_at timestamptz,                           -- soft delete (관리자 삭제, 3단계)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index submissions_topic_idx on public.submissions (topic_id, created_at desc);
create index submissions_code_idx on public.submissions ((submitter->>'code'));

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
create trigger submissions_updated_at
  before update on public.submissions
  for each row execute function public.set_updated_at();

-- 3) 코드 마스터 (5단계 검증·자동완성용, 미리 준비)
create table public.members (
  code text primary key,
  name text not null,
  branch text not null,
  active boolean not null default true
);

-- ============================================================
-- RLS 정책
-- 이유: 제출자(설계사/지점장)는 로그인 없이 접속하므로 anon 키가
-- 브라우저에 노출된다. 따라서 anon 권한은 "열린 주제 보기 + 제출"
-- 딱 두 가지로 좁히고, 조회·수정·삭제·관리자 기능은 전부
-- service role(서버 전용)로만 수행한다.
-- ============================================================
alter table public.topics enable row level security;
alter table public.submissions enable row level security;
alter table public.members enable row level security;

-- topics: 익명은 open 상태 주제만 조회 가능
create policy "anon_select_open_topics"
  on public.topics for select
  to anon
  using (status = 'open');

-- submissions: 익명은 insert만 — 그것도 open + 마감 전 주제에만.
-- 마감 검증을 클라이언트가 아닌 DB가 최종 수행하는 안전장치.
create policy "anon_insert_to_open_topic"
  on public.submissions for insert
  to anon
  with check (
    exists (
      select 1 from public.topics t
      where t.id = topic_id
        and t.status = 'open'
        and (t.deadline is null or t.deadline > now())
    )
  );

-- submissions: 익명 select 정책 없음 → 타인 개인정보 노출 원천 차단.
-- 본인 수정(edit_token 대조)도 서버 라우트에서 service role로 처리.

-- members: 익명 정책 없음 → 코드 마스터(직원 명단)는 서버에서만 접근.
