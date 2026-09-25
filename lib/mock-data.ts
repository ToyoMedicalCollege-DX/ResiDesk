import { applyAutoWatch } from "./alerts";
import { DISPLAY_NOW } from "./scoring";
import type {
  ConsultMessage,
  MoodLog,
  PressureAlert,
  ScaleKey,
  SkillId,
  Student,
} from "./types";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** デモ基準日（定義書作成日）。SSR/CSR の日付ずれを防ぐ */
const NOW = new Date("2026-09-19T12:00:00+09:00");

function atDaysAgo(days: number, hours = 10, minutes = 0): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() - days);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function moodLogs(
  scores: (number | null)[],
  pressure: Record<number, PressureAlert> = {}
): MoodLog[] {
  return scores.map((score, i) => {
    const daysAgo = scores.length - 1 - i;
    return {
      date: isoDate(atDaysAgo(daysAgo)),
      score,
      pressureAlert: pressure[i] ?? null,
    };
  });
}

function history(scale: ScaleKey, values: number[]): { at: string; score: number }[] {
  return values.map((score, i) => ({
    at: atDaysAgo((values.length - 1 - i) * 14, 20, 10).toISOString(),
    score,
  }));
}

function checks(
  phq: number[],
  gad: number[],
  psqi: number[]
): Student["checks"] {
  return {
    phq: { latest: phq[phq.length - 1] ?? null, max: 27, history: history("phq", phq), latestAnswers: [] },
    gad: { latest: gad[gad.length - 1] ?? null, max: 21, history: history("gad", gad), latestAnswers: [] },
    psqi: { latest: psqi[psqi.length - 1] ?? null, max: 21, history: history("psqi", psqi), latestAnswers: [] },
  };
}

function lessons(done: Partial<Record<SkillId, number>>): Record<SkillId, number> {
  return {
    sk1: done.sk1 ?? 0,
    sk2: done.sk2 ?? 0,
    sk3: done.sk3 ?? 0,
    sk4: done.sk4 ?? 0,
    sk5: done.sk5 ?? 0,
  };
}

function userMsg(daysAgo: number, hour: number, minute: number, content: string, id: string): ConsultMessage {
  return {
    id,
    at: atDaysAgo(daysAgo, hour, minute).toISOString(),
    role: "user",
    content,
  };
}

function aiMsg(daysAgo: number, hour: number, minute: number, content: string, id: string): ConsultMessage {
  return {
    id,
    at: atDaysAgo(daysAgo, hour, minute).toISOString(),
    role: "assistant",
    content,
  };
}

type Draft = Omit<
  Student,
  | "moodLogs"
  | "checks"
  | "checkMonths"
  | "lessonCompleted"
  | "consultMessages"
  | "alertLevel"
  | "alertReasons"
> & {
  mood: (number | null)[];
  pressure?: Record<number, PressureAlert>;
  phq: number[];
  gad: number[];
  psqi: number[];
  lessons?: Partial<Record<SkillId, number>>;
  messages?: ConsultMessage[];
};

function build(d: Draft): Student {
  return applyAutoWatch({
    id: d.id,
    name: d.name,
    studentId: d.studentId,
    department: d.department,
    alertLevel: "none",
    alertReasons: [],
    lastLoginAt: d.lastLoginAt,
    moodLogs: moodLogs(d.mood, d.pressure),
    checks: checks(d.phq, d.gad, d.psqi),
    checkMonths: [],
    previousMonthScore: d.previousMonthScore,
    crisisUnresolved: d.crisisUnresolved,
    lessonCompleted: lessons(d.lessons ?? {}),
    streakDays: d.streakDays,
    consultMessages: d.messages ?? [],
    consultThisWeek: d.consultThisWeek,
    supportClicks: d.supportClicks,
  }, DISPLAY_NOW);
}

/** 直近30日分のパターン（古い→新しい）。長さは30。 */
function days30(pattern: (i: number) => number | null): (number | null)[] {
  return Array.from({ length: 30 }, (_, i) => pattern(i));
}

export const STUDENTS: Student[] = [
  build({
    id: "s-yamada",
    name: "山田 太郎",
    studentId: "A2024001",
    department: "救急救命士学科",
    lastLoginAt: atDaysAgo(0, 8, 12).toISOString(),
    mood: days30((i) => {
      const seq = [4, 3, 3, 2, 4, 5, 3, 3, 2, 1, 2, 3, 4, 3, 3, 2, 4, 3, 5, 4, 3, 2, 3, 4, 3, 3, 2, 4, 3, 3];
      return seq[i] ?? 3;
    }),
    pressure: { 9: "caution", 21: "mild" },
    phq: [11, 9, 8, 7],
    gad: [10, 8, 7, 5],
    psqi: [12, 9, 8, 7],
    previousMonthScore: 68,
    crisisUnresolved: false,
    lessons: { sk1: 8, sk2: 5, sk3: 3, sk4: 4, sk5: 6 },
    streakDays: 6,
    consultThisWeek: 2,
    supportClicks: { ssc: 3, clinic: 1, dorm: 0 },
    messages: [
      userMsg(5, 21, 14, "最近、授業の後にどっと疲れる感じが続いています。", "m1"),
      aiMsg(5, 21, 15, "お疲れが続いているんですね。睡眠と食事のリズムはいかがですか？", "m1a"),
      userMsg(3, 7, 40, "夜中に目が覚めて、それからあまり眠れません。", "m2"),
      aiMsg(3, 7, 41, "途中覚醒があるんですね。就寝前のスマホ時間もメモしておくと整理しやすいかもしれません。", "m2a"),
      userMsg(1, 22, 5, "実習のことで頭がいっぱいで、相談しづらいです。", "m3"),
      aiMsg(1, 22, 6, "一人で抱え込まなくて大丈夫です。学内の相談窓口も使えますよ。", "m3a"),
    ],
  }),
  build({
    id: "s-kano",
    name: "佐藤 花音",
    studentId: "A2024012",
    department: "歯科技工士学科",
    lastLoginAt: atDaysAgo(0, 7, 50).toISOString(),
    mood: days30(() => 4),
    phq: [3, 2, 2],
    gad: [3, 3, 2],
    psqi: [4, 3, 3],
    previousMonthScore: 86,
    crisisUnresolved: false,
    lessons: { sk1: 10, sk2: 9, sk3: 6, sk4: 7, sk5: 8 },
    streakDays: 14,
    consultThisWeek: 0,
    supportClicks: { ssc: 0, clinic: 0, dorm: 0 },
  }),
  build({
    id: "s-ren",
    name: "鈴木 蓮",
    studentId: "A2024033",
    department: "鍼灸師学科",
    lastLoginAt: atDaysAgo(1, 19, 4).toISOString(),
    mood: days30((i) => (i % 3 === 0 ? 2 : 3)),
    phq: [14, 13, 12],
    gad: [11, 12, 11],
    psqi: [10, 11, 12],
    previousMonthScore: 48,
    crisisUnresolved: false,
    lessons: { sk1: 2, sk2: 1, sk3: 0, sk4: 1, sk5: 2 },
    streakDays: 2,
    consultThisWeek: 3,
    supportClicks: { ssc: 5, clinic: 2, dorm: 0 },
    messages: [
      userMsg(4, 23, 12, "友達ともあまり話したくない日が続いています。", "r1"),
      userMsg(2, 18, 30, "授業に集中できなくて、自分だけ置いていかれる感じがします。", "r2"),
      userMsg(0, 21, 8, "今日もあまり眠れなさそうです。", "r3"),
    ],
  }),
  build({
    id: "s-misaki",
    name: "高橋 美咲",
    studentId: "A2024044",
    department: "柔道整復師学科",
    lastLoginAt: atDaysAgo(2, 9, 22).toISOString(),
    mood: days30((i) => (i > 22 ? 3 : 4)),
    phq: [8, 10, 12],
    gad: [6, 8, 9],
    psqi: [8, 9, 11],
    previousMonthScore: 70,
    crisisUnresolved: false,
    lessons: { sk1: 5, sk2: 4, sk3: 4, sk4: 3, sk5: 7 },
    streakDays: 4,
    consultThisWeek: 1,
    supportClicks: { ssc: 1, clinic: 0, dorm: 0 },
    messages: [
      userMsg(6, 20, 0, "睡眠のレッスンを始めたけれど、まだ生活リズムが戻らない。", "ms1"),
    ],
  }),
  build({
    id: "s-daiki",
    name: "伊藤 大輝",
    studentId: "A2024055",
    department: "救急救命士学科",
    lastLoginAt: atDaysAgo(0, 12, 3).toISOString(),
    mood: days30((i) => (i % 5 === 0 ? 5 : 4)),
    phq: [4, 3, 3],
    gad: [5, 4, 3],
    psqi: [6, 5, 5],
    previousMonthScore: 80,
    crisisUnresolved: false,
    lessons: { sk1: 6, sk2: 6, sk3: 5, sk4: 5, sk5: 4 },
    streakDays: 9,
    consultThisWeek: 0,
    supportClicks: { ssc: 0, clinic: 1, dorm: 0 },
  }),
  build({
    id: "s-yui",
    name: "渡辺 結衣",
    studentId: "A2024066",
    department: "歯科技工士学科",
    lastLoginAt: atDaysAgo(18, 21, 40).toISOString(),
    mood: days30((i) => (i < 12 ? 3 : null)),
    phq: [6, 5],
    gad: [5, 6],
    psqi: [8, 7],
    previousMonthScore: 64,
    crisisUnresolved: false,
    lessons: { sk1: 3, sk2: 2, sk3: 1, sk4: 1, sk5: 2 },
    streakDays: 0,
    consultThisWeek: 0,
    supportClicks: { ssc: 0, clinic: 0, dorm: 0 },
  }),
  build({
    id: "s-sho",
    name: "山本 翔",
    studentId: "A2024077",
    department: "鍼灸師学科",
    lastLoginAt: atDaysAgo(0, 6, 55).toISOString(),
    mood: days30((i) => (i >= 23 ? 1 : 2)),
    pressure: { 25: "caution", 28: "caution" },
    phq: [9, 8, 8],
    gad: [7, 7, 6],
    psqi: [9, 8, 8],
    previousMonthScore: 61,
    crisisUnresolved: false,
    lessons: { sk1: 4, sk2: 3, sk3: 2, sk4: 2, sk5: 5 },
    streakDays: 7,
    consultThisWeek: 1,
    supportClicks: { ssc: 2, clinic: 0, dorm: 0 },
    messages: [
      userMsg(2, 8, 11, "気圧が下がると頭が重くて、朝起きられない。", "sh1"),
    ],
  }),
  build({
    id: "s-akari",
    name: "中村 あかり",
    studentId: "A2024088",
    department: "柔道整復師学科",
    lastLoginAt: atDaysAgo(1, 8, 5).toISOString(),
    mood: days30((i) => (i % 2 === 0 ? 4 : 3)),
    phq: [5, 4, 4],
    gad: [4, 4, 3],
    psqi: [5, 5, 4],
    previousMonthScore: 78,
    crisisUnresolved: false,
    lessons: { sk1: 7, sk2: 8, sk3: 4, sk4: 6, sk5: 5 },
    streakDays: 5,
    consultThisWeek: 0,
    supportClicks: { ssc: 1, clinic: 0, dorm: 0 },
  }),
  build({
    id: "s-kaito",
    name: "小林 海斗",
    studentId: "A2024099",
    department: "救急救命士学科",
    lastLoginAt: atDaysAgo(0, 22, 18).toISOString(),
    mood: days30((i) => (i > 26 ? 2 : 3)),
    phq: [10, 14, 16],
    gad: [8, 10, 12],
    psqi: [9, 10, 11],
    previousMonthScore: 55,
    crisisUnresolved: true,
    lessons: { sk1: 1, sk2: 0, sk3: 0, sk4: 0, sk5: 1 },
    streakDays: 3,
    consultThisWeek: 2,
    supportClicks: { ssc: 4, clinic: 0, dorm: 0 },
    messages: [
      userMsg(3, 1, 20, "夜になると気持ちが沈んで、どうしていいか分からなくなります。", "k1"),
      userMsg(0, 22, 10, "今日のチェックのあと、少し不安が残りました。", "k2"),
    ],
  }),
  build({
    id: "s-sakura",
    name: "加藤 さくら",
    studentId: "A2024110",
    department: "歯科技工士学科",
    lastLoginAt: atDaysAgo(3, 18, 44).toISOString(),
    mood: days30((i) => (i % 4 === 0 ? 2 : 3)),
    phq: [7, 7, 6],
    gad: [9, 8, 8],
    psqi: [7, 6, 6],
    previousMonthScore: 66,
    crisisUnresolved: false,
    lessons: { sk1: 5, sk2: 4, sk3: 3, sk4: 8, sk5: 3 },
    streakDays: 1,
    consultThisWeek: 0,
    supportClicks: { ssc: 2, clinic: 1, dorm: 0 },
  }),
  build({
    id: "s-hayate",
    name: "吉田 颯",
    studentId: "A2024121",
    department: "鍼灸師学科",
    lastLoginAt: atDaysAgo(0, 9, 1).toISOString(),
    mood: days30(() => 5),
    phq: [2, 1, 1],
    gad: [2, 2, 1],
    psqi: [3, 3, 2],
    previousMonthScore: 90,
    crisisUnresolved: false,
    lessons: { sk1: 10, sk2: 12, sk3: 8, sk4: 10, sk5: 9 },
    streakDays: 21,
    consultThisWeek: 0,
    supportClicks: { ssc: 0, clinic: 0, dorm: 0 },
  }),
  build({
    id: "s-rin",
    name: "松本 凛",
    studentId: "A2024132",
    department: "柔道整復師学科",
    lastLoginAt: atDaysAgo(4, 16, 12).toISOString(),
    mood: days30((i) => (i > 20 ? 3 : 4)),
    phq: [5, 6, 5],
    gad: [4, 5, 5],
    psqi: [6, 6, 5],
    previousMonthScore: 74,
    crisisUnresolved: false,
    lessons: { sk1: 4, sk2: 3, sk3: 2, sk4: 3, sk5: 3 },
    streakDays: 0,
    consultThisWeek: 2,
    supportClicks: { ssc: 0, clinic: 2, dorm: 0 },
    messages: [
      userMsg(5, 12, 8, "実技の評価が気になって、相談チャットを使ってみました。", "ri1"),
      userMsg(1, 19, 33, "教務にも時間割の件で問い合わせました。", "ri2"),
    ],
  }),
];

export function getStudent(id: string): Student | undefined {
  return STUDENTS.find((s) => s.id === id);
}

export const STAFF = {
  name: "佐藤 先生",
  roleLabel: "担任（救急救命士学科）",
};
