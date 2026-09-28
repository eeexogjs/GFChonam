-- 2026-09-23 적용 완료 (기록용 사본)
-- 정원(자동 마감) 지원: 제출 수가 capacity에 도달하면 서버가 status를 closed로 전환
alter table public.topics add column if not exists capacity int;
