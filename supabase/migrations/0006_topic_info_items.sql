-- 안내 정보 (v4.2) — 세미나 일시/장소/강사, 택배 발송일/택배사, 비용 안내 등을
-- 신청 화면 상단 정보 카드로 보여주기 위한 구조화 항목
alter table topics add column if not exists info jsonb;
comment on column topics.info is '안내 정보: [{label, value}] — 일시/장소/강사/택배사/비용 안내 등 신청 화면 상단 정보 카드';
