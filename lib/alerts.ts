import type { AlertLevel, AlertReason, AlertRuleId, Student } from "./types";
import { ALERT_RULE_LABEL, SKILLS } from "./types";
import { checkDelta, isCautionBand, moodAvg } from "./scoring";

const INACTIVE_DAYS = 14;
const IMPLEMENTATION_GAP_DAYS = 7;
const CONSULT_WEEK_THRESHOLD = 2;
const SCORE_DROP_PT = -10;
const SUPPORT_SEEK_THRESHOLD = 2;

const REASON_DETAIL: Record<string, string> = {
  R1: "直近7日の気分平均 ≤ 2",
  R2: "最新の PHQ / GAD / PSQI が要注意帯",
  R3: "こころ(PHQ)で危機項目に1点以上ついた記録がある",
  R4: "今週の相談が 2 回以上",
  R5: "体調・チェック・トレーニングの実施が止まっている",
  R6: "最終ログインが 14 日以上ない",
  score: "先月比で総合スコアが 10pt 以上低下",
  support: "当月の SSC予約（スマホ・HP・電話）または慶生会クリニック電話のクリックが 2 回以上",
};

export function daysSince(iso: string, now = new Date()): number {
  const d = new Date(iso);
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((startToday.getTime() - startThat.getTime()) / 86400000);
}

function moodRecordedDays(student: Student, days: number): number {
  return student.moodLogs.slice(-days).filter((d) => d.score != null).length;
}

function lessonCount(student: Student): number {
  return SKILLS.reduce((sum, skill) => sum + (student.lessonCompleted[skill.id] ?? 0), 0);
}

function hasAnyCheck(student: Student): boolean {
  return (["phq", "gad", "psqi"] as const).some((key) => student.checks[key].latest != null);
}

function hadPriorActivity(student: Student): boolean {
  return lessonCount(student) > 0 || hasAnyCheck(student) || moodRecordedDays(student, 30) >= 3;
}

/** 体調・チェック・トレーニングの実施が止まっている／始まっていない */
function isImplementationLow(student: Student, now = new Date()): boolean {
  const recentMoods = moodRecordedDays(student, 7);
  const idle = daysSince(student.lastLoginAt, now) >= IMPLEMENTATION_GAP_DAYS;
  const stopped = hadPriorActivity(student) && recentMoods <= 1 && idle;
  const loggedInButIdle =
    daysSince(student.lastLoginAt, now) <= 3 &&
    recentMoods === 0 &&
    lessonCount(student) === 0 &&
    !hasAnyCheck(student);
  return stopped || loggedInButIdle;
}

export function studentAlertRules(student: Student, now = new Date()): AlertRuleId[] {
  const rules: AlertRuleId[] = [];
  const avg7 = moodAvg(student, 7);
  if (avg7 != null && avg7 <= 2) rules.push("R1");

  const caution = (["phq", "gad", "psqi"] as const).some((key) => {
    const latest = student.checks[key].latest;
    return latest != null && isCautionBand(key, latest);
  });
  if (caution) rules.push("R2");

  if (student.crisisUnresolved) rules.push("R3");
  if (student.consultThisWeek >= CONSULT_WEEK_THRESHOLD) rules.push("R4");
  if (isImplementationLow(student, now)) rules.push("R5");
  if (daysSince(student.lastLoginAt, now) >= INACTIVE_DAYS) rules.push("R6");
  return rules;
}

function extraReasons(student: Student): AlertReason[] {
  const reasons: AlertReason[] = [];
  const delta = checkDelta(student);
  if (delta != null && delta <= SCORE_DROP_PT) {
    reasons.push({ id: "score", label: "総合スコア低下", detail: REASON_DETAIL.score });
  }
  const supportSeeking = student.supportClicks.ssc + student.supportClicks.clinic;
  if (supportSeeking >= SUPPORT_SEEK_THRESHOLD) {
    reasons.push({ id: "support", label: "支援窓口の利用", detail: REASON_DETAIL.support });
  }
  return reasons;
}

export function collectAlertReasons(student: Student, now = new Date()): AlertReason[] {
  const rules = studentAlertRules(student, now).map((id) => ({
    id,
    label: ALERT_RULE_LABEL[id],
    detail: REASON_DETAIL[id],
  }));
  return [...rules, ...extraReasons(student)];
}

export function deriveAlertLevel(reasons: AlertReason[]): AlertLevel {
  const ids = new Set(reasons.map((r) => r.id));
  const serious = ["R1", "R2", "R3", "R4"].filter((id) => ids.has(id));
  if (ids.has("R3") || (ids.has("R1") && ids.has("R2")) || serious.length >= 3) {
    return "urgent";
  }
  if (ids.has("R1") || ids.has("R2") || ids.has("R4") || ids.has("score")) {
    return "watch";
  }
  if (ids.has("R5") || ids.has("R6") || ids.has("support")) {
    return "notice";
  }
  return "none";
}

export function deriveAlert(student: Student, now = new Date()): {
  alertLevel: AlertLevel;
  alertReasons: AlertReason[];
} {
  const alertReasons = collectAlertReasons(student, now);
  return { alertLevel: deriveAlertLevel(alertReasons), alertReasons };
}

export function applyAutoWatch(student: Student, now = new Date()): Student {
  const derived = deriveAlert(student, now);
  return { ...student, alertLevel: derived.alertLevel, alertReasons: derived.alertReasons };
}

export function isFlagged(student: Student): boolean {
  return student.alertLevel !== "none";
}

export function alertLevelRank(level: AlertLevel): number {
  if (level === "urgent") return 0;
  if (level === "watch") return 1;
  if (level === "notice") return 2;
  return 3;
}

export function ruleLabels(ids: AlertRuleId[]): string[] {
  return ids.map((id) => ALERT_RULE_LABEL[id]);
}

export function watchReasonLabels(student: Student, now = new Date()): string[] {
  return collectAlertReasons(student, now).map((r) => r.label);
}
