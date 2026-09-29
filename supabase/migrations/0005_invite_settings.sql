-- 초대장 설정 (v3.6) — 세미나 취합에서 설계사가 접수 완료 화면에서 초대장 이미지를 만들 수 있게 한다
alter table topics add column if not exists invite jsonb;
comment on column topics.invite is '초대장 설정: {enabled, template, eventName, dateText, placeText, greeting, host}';
