# 취합ON — 사내 취합 플랫폼

택배·세미나·잡설명회 등 반복 취합업무를 하나의 URL로 처리하는 플랫폼.
설계사/지점장은 카톡 링크로 제출하고, 마스터는 관리자 모드에서 취합·엑셀 다운로드한다.

- 스택: Next.js 15 (App Router) + Supabase (PostgreSQL, 서울 리전) + Vercel + Tailwind
- DB: Supabase 프로젝트 `chwihap-on` (스키마 적용 완료, `supabase/migrations/0001_init.sql` 참조)

## 로컬 실행

```bash
cp .env.example .env.local   # SUPabase_SERVICE_ROLE_KEY, ADMIN_PASSWORD 채우기
npm install
npm run dev                  # http://localhost:3000
```

## Vercel 배포 (최초 1회)

1. 이 폴더를 GitHub 리포지토리로 푸시
   ```bash
   git init && git add -A && git commit -m "init: 취합ON 1단계 기반"
   git remote add origin <깃허브 리포 URL> && git push -u origin main
   ```
2. [vercel.com](https://vercel.com) → **Add New → Project** → 방금 푸시한 리포 Import
3. **Environment Variables**에 아래 4개 등록 (값은 `.env.example` 참조):

   | 변수 | 값 | 공개 여부 |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://edywgzlkjwscapzlcccu.supabase.co` | 공개 OK |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.example`의 값 | 공개 OK (RLS로 보호) |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase 대시보드 → Settings → API Keys | **절대 비공개** |
   | `ADMIN_PASSWORD` | 직접 정한 관리자 비밀번호 | **절대 비공개** |

4. **Deploy** → 발급된 `https://<프로젝트>.vercel.app`을 휴대폰 카톡 채팅방에 보내 열리는지 확인
5. 홈 화면에 "✅ Supabase 연결 정상 — 진행 중인 취합 1건"이 보이면 1단계 완료

## 배포 확인 체크리스트

- [ ] 카톡 인앱브라우저에서 홈이 열린다
- [ ] "취합ON 연결 테스트" 주제가 목록에 보인다 (DB 왕복 성공)
- [ ] 노트북 브라우저에서도 동일하게 보인다

## 구조

```
app/                  # 화면 (App Router)
  layout.tsx          # 공통 레이아웃 (ko, 모바일 뷰포트)
  page.tsx            # 홈 = 진행 중 취합 목록 (DB 연결 검증 겸용)
lib/supabase/
  client.ts           # 브라우저용 (anon) — 열린 주제 조회·제출만 가능
  server.ts           # 서버 전용 (anon/service role) — "server-only" 가드
supabase/migrations/  # DDL 기록 사본 (재구축용)
```

## 보안 설계 요약

- anon 키가 할 수 있는 일은 RLS로 **①열린 주제 조회 ②열린 주제에 제출** 둘뿐
- 제출 내역 조회(타인 개인정보)는 service role 전용 → 서버 코드에서만 접근
- `lib/supabase/server.ts`는 `server-only` 패키지로 보호 — 클라이언트에서 import하면 빌드 실패
- 마감 검증은 클라이언트 안내 + **DB RLS가 최종 차단** (마감 후 제출 원천 불가)

## 운영 가이드 3줄 (후임자 인수인계)

1. **DB는 Supabase `chwihap-on` 프로젝트**(무료 티어, 서울 리전)에 있다 — 계정 접근 권한만 넘기면 되고, 스키마 전체는 `supabase/migrations/0001_init.sql` 하나로 재구축 가능하다.
2. **배포는 GitHub push = 자동 배포**(Vercel 연결) — 코드 수정 후 push만 하면 되고, 환경변수 4개는 Vercel 대시보드에 있다.
3. **비밀키 2개**(`SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`)는 절대 코드/카톡에 붙여넣지 말 것 — 유출 시 Supabase 대시보드에서 키 재발급 후 Vercel 환경변수만 교체하면 된다.
