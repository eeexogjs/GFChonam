/** 화면 공용 라벨 — 포털명·유형명 한 곳 관리 */

export const PORTAL_NAME_LINE1 = "호남법인지역단";
export const PORTAL_NAME_LINE2 = "업무 취합 포털";

export const TYPE_LABEL: Record<string, string> = {
  delivery: "택배",
  seminar: "세미나",
  jobfair: "잡설명회",
  survey: "설문",
  custom: "접수",
};

export const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  draft: { text: "초안", cls: "bg-amber-100 text-amber-700" },
  open: { text: "접수 중", cls: "bg-emerald-100 text-emerald-700" },
  closed: { text: "마감", cls: "bg-gray-200 text-gray-500" },
};
