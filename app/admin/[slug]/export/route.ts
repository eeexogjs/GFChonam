import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createAdminClient } from "@/lib/supabase/server";
import type { Answers, FormSchema } from "@/lib/form-schema";
import { buildColumns, formatSeoulTime } from "@/lib/export-columns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 엑셀 다운로드 — /admin/{slug}/export
 * 미들웨어가 /admin/* 전체를 보호하므로 이 라우트도 로그인 없이는 접근 불가.
 * 열 순서는 관리자 테이블과 동일(lib/export-columns.ts 공용).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: topic } = await admin
    .from("topics")
    .select("id, title, form_schema")
    .eq("slug", slug)
    .single<{ id: string; title: string; form_schema: FormSchema }>();

  if (!topic) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data: rows } = await admin
    .from("submissions")
    .select("submitter, answers, created_at, updated_at")
    .eq("topic_id", topic.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  const submissions = rows ?? [];
  const columns = buildColumns(topic.form_schema, submissions.map((r) => r.answers as Answers));

  // 시트 데이터: NO / 제출일시 / 수정일시 + 스키마 열
  const header = ["NO", "제출일시", "수정일시", ...columns.map((c) => c.header)];
  const body = submissions.map((r, i) => [
    i + 1,
    formatSeoulTime(r.created_at),
    r.updated_at !== r.created_at ? formatSeoulTime(r.updated_at) : "",
    ...columns.map((c) => c.getValue(r.answers as Answers)),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
  // 열 너비: 내용 기반 대략치 (한글 2칸 가중)
  ws["!cols"] = header.map((h, colIdx) => {
    const widths = [h, ...body.map((row) => String(row[colIdx] ?? ""))].map((s) =>
      [...s].reduce((w, ch) => w + (ch.charCodeAt(0) > 127 ? 2 : 1), 0)
    );
    return { wch: Math.min(Math.max(...widths) + 2, 50) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "취합내역");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  // 파일명: {주제명}_{YYMMDD_HHmm}.xlsx — 한글 파일명은 RFC 5987로 인코딩
  const now = formatSeoulTime(new Date().toISOString()); // "YYYY-MM-DD HH:mm"
  const stamp = now.slice(2, 10).replace(/-/g, "") + "_" + now.slice(11, 16).replace(":", "");
  const safeTitle = topic.title.replace(/[\\/:*?"<>|]/g, "").trim();
  const filename = `${safeTitle}_${stamp}.xlsx`;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="export.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
