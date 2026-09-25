export const DEPARTMENTS = [
  "歯科技工士学科",
  "救急救命士学科",
  "鍼灸師学科",
  "柔道整復師学科",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export function isDepartment(value: string): value is Department {
  return (DEPARTMENTS as readonly string[]).includes(value);
}

export const DEPT_SLUG: Record<Department, string> = {
  歯科技工士学科: "dt",
  救急救命士学科: "elt",
  鍼灸師学科: "amt",
  柔道整復師学科: "jt",
};

export const SLUG_DEPT: Record<string, Department> = {
  dt: "歯科技工士学科",
  elt: "救急救命士学科",
  amt: "鍼灸師学科",
  jt: "柔道整復師学科",
};

export type AlertLevel = "none" | "notice" | "watch" | "urgent";

export const ALERT_LEVELS: AlertLevel[] = ["none", "notice", "watch", "urgent"];

export const ALERT_LEVEL_LABEL: Record<AlertLevel, string> = {
  none: "なし",
  notice: "注意",
  watch: "要観察",
  urgent: "緊急",
};

export const ALERT_LEVEL_HINT: Record<AlertLevel, string> = {
  none: "該当する兆候なし",
  notice: "実施・利用の低下",
  watch: "体調・チェック・相談の変化",
  urgent: "今日中に様子確認や声かけを検討してください",
};

export type AlertReason = {
  id: string;
  label: string;
  detail: string;
};

export type PressureAlert = "normal" | "mild" | "caution";

export type MoodLog = {
  date: string;
  score: number | null;
  pressureAlert: PressureAlert | null;
};

export type ScaleKey = "phq" | "gad" | "psqi";

export type CheckAnswerItem = {
  questionNo: number;
  questionId: string;
  text: string;
  answerLabel: string;
  flagged?: boolean;
};

export type CheckScale = {
  latest: number | null;
  max: number;
  history: { at: string; score: number }[];
  latestAnswers: CheckAnswerItem[];
};

export type CheckMonthScale = {
  score: number | null;
  max: number;
  completedAt: string | null;
  answers: CheckAnswerItem[];
};

export type CheckMonth = {
  yearMonth: string;
  scales: Record<ScaleKey, CheckMonthScale>;
  totalScore: number | null;
};

export type SkillId = "sk1" | "sk2" | "sk3" | "sk4" | "sk5";

export const SKILLS: {
  id: SkillId;
  name: string;
  shortName: string;
  color: string;
  total: number;
}[] = [
  { id: "sk1", name: "行動活性化", shortName: "ポジティブ・レジリエンス", color: "#10B981", total: 10 },
  { id: "sk2", name: "認知再構成", shortName: "メタ・レジリエンス", color: "#818CF8", total: 12 },
  { id: "sk3", name: "問題解決", shortName: "問題解決・レジリエンス", color: "#FB923C", total: 8 },
  { id: "sk4", name: "アサーション", shortName: "コミュ・レジリエンス", color: "#F472B6", total: 10 },
  { id: "sk5", name: "睡眠行動療法", shortName: "睡眠・レジリエンス", color: "#38BDF8", total: 10 },
];

export type ConsultSuggestKind = "sk1" | "sk2" | "sk5" | "support";

export type ConsultSuggestion = {
  kind: ConsultSuggestKind;
  label: string;
};

export type ConsultMessage = {
  id: string;
  at: string;
  role: "user" | "assistant";
  content: string;
  suggestion?: ConsultSuggestion | null;
};

export type AlertRuleId = "R1" | "R2" | "R3" | "R4" | "R5" | "R6";

export const ALERT_RULE_LABEL: Record<AlertRuleId, string> = {
  R1: "体調低下",
  R2: "チェック要注意",
  R3: "緊急確認",
  R4: "相談増加",
  R5: "実施低下",
  R6: "利用低下",
};

export type Student = {
  id: string;
  name: string;
  studentId: string;
  department: Department;
  alertLevel: AlertLevel;
  alertReasons: AlertReason[];
  lastLoginAt: string;
  moodLogs: MoodLog[];
  checks: Record<ScaleKey, CheckScale>;
  checkMonths: CheckMonth[];
  previousMonthScore: number | null;
  crisisUnresolved: boolean;
  lessonCompleted: Record<SkillId, number>;
  streakDays: number;
  consultMessages: ConsultMessage[];
  consultThisWeek: number;
  supportClicks: {
    ssc: number;
    clinic: number;
    dorm: number;
  };
};

export type StaffSession = {
  name: string;
  roleLabel: string;
  role?: string;
  departments?: string[];
};
