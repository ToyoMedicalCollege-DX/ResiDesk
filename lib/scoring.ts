import type { CheckMonth, CheckMonthScale, ScaleKey, Student } from "./types";

export type BandKind = "good" | "mild" | "caution";

export type Band = {
  kind: BandKind;
  label: string;
  color: string;
};

const SCALE_MAX: Record<ScaleKey, number> = { phq: 27, gad: 21, psqi: 21 };

export function scaleBand(scale: ScaleKey, score: number): Band {
  if (scale === "psqi") {
    if (score <= 4) return { kind: "good", label: "良好", color: "#27AE76" };
    if (score <= 10) return { kind: "mild", label: "注意", color: "#FBBF24" };
    return { kind: "caution", label: "要注意", color: "#FB923C" };
  }
  if (score <= 4) return { kind: "good", label: "良好", color: "#27AE76" };
  if (score <= 9) return { kind: "mild", label: "軽度", color: "#FBBF24" };
  return { kind: "caution", label: "要注意", color: score >= 15 ? "#EF4444" : "#FB923C" };
}

export function isCautionBand(scale: ScaleKey, score: number): boolean {
  return scaleBand(scale, score).kind === "caution";
}

/** 尺度生点 → 総合（0〜100）。高いほど調子が良い。未実施尺度は除外。 */
export function computeTotalScore(
  scores: Partial<Record<ScaleKey, number | null>>
): number | null {
  const parts: number[] = [];
  (["phq", "gad", "psqi"] as ScaleKey[]).forEach((id) => {
    const raw = scores[id];
    if (typeof raw !== "number" || !Number.isFinite(raw)) return;
    const max = SCALE_MAX[id];
    const clamped = Math.min(max, Math.max(0, raw));
    parts.push((1 - clamped / max) * 100);
  });
  if (parts.length === 0) return null;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

export function totalScoreFromStudent(student: Student): number | null {
  return computeTotalScore({
    phq: student.checks.phq.latest,
    gad: student.checks.gad.latest,
    psqi: student.checks.psqi.latest,
  });
}

export function totalScoreBand(score: number): Band {
  if (score >= 75) return { kind: "good", label: "良好", color: "#27AE76" };
  if (score >= 50) return { kind: "mild", label: "普通", color: "#FBBF24" };
  return { kind: "caution", label: "注意", color: "#FB923C" };
}

export function latestMood(student: Student): number | null {
  const withScore = [...student.moodLogs].reverse().find((d) => d.score != null);
  return withScore?.score ?? null;
}

export function moodAvg(student: Student, days: number): number | null {
  const slice = student.moodLogs.slice(-days).filter((d) => d.score != null);
  if (slice.length === 0) return null;
  const sum = slice.reduce((a, b) => a + (b.score ?? 0), 0);
  return sum / slice.length;
}

export function moodBarColor(score: number): string {
  if (score >= 4) return "#27AE76";
  if (score === 3) return "#FBBF24";
  return "#FB923C";
}

export const MOOD_LABEL: Record<1 | 2 | 3 | 4 | 5, string> = {
  5: "最高",
  4: "良い",
  3: "普通",
  2: "つらい",
  1: "最低",
};

export function moodLabel(score: number): string | null {
  if (score === 1 || score === 2 || score === 3 || score === 4 || score === 5) {
    return MOOD_LABEL[score];
  }
  return null;
}

export const DISPLAY_NOW = new Date("2026-09-19T12:00:00+09:00");

export function formatLastLogin(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startToday.getTime() - startThat.getTime()) / 86400000);
  const hm = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (diffDays === 0) return `今日 ${hm}`;
  if (diffDays === 1) return `昨日 ${hm}`;
  if (diffDays < 14) return `${diffDays}日前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatShortDate(isoOrDate: string): string {
  const d = new Date(isoOrDate.includes("T") ? isoOrDate : `${isoOrDate}T12:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function weekdayLabel(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return ["日", "月", "火", "水", "木", "金", "土"][d.getDay()] ?? "";
}

export function checkDelta(student: Student): number | null {
  const current = totalScoreFromStudent(student);
  if (current == null || student.previousMonthScore == null) return null;
  return current - student.previousMonthScore;
}

export function currentYearMonth(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function yearMonthFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatYearMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split("-");
  const year = Number(y);
  const month = Number(m);
  if (!year || !month) return yearMonth;
  return `${year}年${month}月`;
}

export function emptyMonthScale(max: number): CheckMonthScale {
  return { score: null, max, completedAt: null, answers: [] };
}

export function emptyCheckMonth(yearMonth: string): CheckMonth {
  return {
    yearMonth,
    totalScore: null,
    scales: {
      phq: emptyMonthScale(27),
      gad: emptyMonthScale(21),
      psqi: emptyMonthScale(21),
    },
  };
}

export function totalScoreFromMonth(month: CheckMonth): number | null {
  return month.totalScore ?? computeTotalScore({
    phq: month.scales.phq.score,
    gad: month.scales.gad.score,
    psqi: month.scales.psqi.score,
  });
}

export function scaleLabel(scale: ScaleKey): { name: string; axis: string } {
  if (scale === "phq") return { name: "こころ", axis: "PHQ系" };
  if (scale === "gad") return { name: "やすらぎ", axis: "GAD系" };
  return { name: "ねむり", axis: "PSQI系" };
}
