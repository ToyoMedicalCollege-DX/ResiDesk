import type { SupabaseClient } from "@supabase/supabase-js";
import { applyAutoWatch } from "@/lib/alerts";
import { safeDisplayName } from "@/lib/crypto/profile-name";
import { isDepartment, type Department } from "@/lib/types";
import { formatCheckAnswers } from "@/lib/check-questions";
import {
  suggestKindFromProps,
  suggestionFromExchange,
  suggestionFromKind,
} from "@/lib/consult-suggest";
import { computeTotalScore, emptyCheckMonth, yearMonthFromIso } from "@/lib/scoring";
import type {
  CheckMonth,
  CheckScale,
  ConsultMessage,
  MoodLog,
  PressureAlert,
  ScaleKey,
  SkillId,
  Student,
} from "@/lib/types";

type ProfileRow = {
  id: string;
  student_id: string;
  name: string;
  department: string;
  updated_at: string | null;
};

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function asPressure(v: string | null | undefined): PressureAlert | null {
  if (v === "normal" || v === "mild" || v === "caution") return v;
  return null;
}

function emptyChecks(): Record<ScaleKey, CheckScale> {
  return {
    phq: { latest: null, max: 27, history: [], latestAnswers: [] },
    gad: { latest: null, max: 21, history: [], latestAnswers: [] },
    psqi: { latest: null, max: 21, history: [], latestAnswers: [] },
  };
}

function emptyLessons(): Record<SkillId, number> {
  return { sk1: 0, sk2: 0, sk3: 0, sk4: 0, sk5: 0 };
}

function fillMoodWindow(
  rows: { date: string; mood_score: number | null; pressure_alert: string | null }[],
  fromDaysAgo = 29
): MoodLog[] {
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const logs: MoodLog[] = [];
  for (let i = fromDaysAgo; i >= 0; i--) {
    const date = isoDate(daysAgo(i));
    const row = byDate.get(date);
    logs.push({
      date,
      score: row?.mood_score ?? null,
      pressureAlert: asPressure(row?.pressure_alert ?? null),
    });
  }
  return logs;
}

function streakDays(logs: MoodLog[]): number {
  let n = 0;
  for (let i = logs.length - 1; i >= 0; i--) {
    if (logs[i].score == null) break;
    n += 1;
  }
  return n;
}

function classifySupport(
  groupName: string | null,
  linkKey: string | null,
  linkLabel: string | null
): "ssc" | "clinic" | "dorm" | null {
  const t = `${groupName ?? ""} ${linkKey ?? ""} ${linkLabel ?? ""}`;
  if (/慶生会/.test(t)) return "clinic";
  if (/寮生活/.test(t)) return "dorm";
  if (/スチューデント|SSC|ssc/i.test(t)) return "ssc";
  return null;
}

function previousYearMonth(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function requireStaffId(supabase: SupabaseClient): Promise<string | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;
  const { data } = await supabase
    .from("staff_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  return data?.id ?? null;
}

export async function loadStaffMe(supabase: SupabaseClient) {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const { data: staff, error } = await supabase
    .from("staff_profiles")
    .select("id, role, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !staff) return null;

  const { data: assignments } = await supabase
    .from("staff_assignments")
    .select("scope_type, department")
    .eq("staff_id", user.id);

  const departments = (assignments ?? [])
    .filter((a) => a.scope_type === "department" && isDepartment(String(a.department)))
    .map((a) => a.department as Department);

  return {
    id: staff.id as string,
    role: staff.role as "teacher" | "advisor" | "admin",
    displayName: safeDisplayName(staff.display_name as string, "教員"),
    departments,
  };
}

type LoadOpts = {
  includeConsult?: boolean;
};

export async function loadStudents(
  supabase: SupabaseClient,
  opts: LoadOpts = {}
): Promise<Student[]> {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, student_id, name, department, updated_at")
    .order("student_id");

  if (error) throw new Error(error.message);
  const list = (profiles ?? []) as ProfileRow[];
  if (list.length === 0) return [];

  const ids = list.map((p) => p.id);
  const since30 = isoDate(daysAgo(29));
  const since7 = new Date(Date.now() - 7 * 86400000).toISOString();

  const [
    moodRes,
    checkRes,
    lessonRes,
    consultRes,
    clickRes,
    snapRes,
    eventRes,
  ] = await Promise.all([
    supabase
      .from("condition_logs")
      .select("user_id, date, mood_score, pressure_alert, logged_at")
      .in("user_id", ids)
      .gte("date", since30),
    supabase
      .from("check_sessions")
      .select("id, user_id, scale, raw_score, max_score, crisis, completed_at")
      .in("user_id", ids)
      .order("completed_at", { ascending: false }),
    supabase.from("lesson_completions").select("user_id, skill_id").in("user_id", ids),
    supabase
      .from("consult_messages")
      .select("id, user_id, role, content, created_at, model")
      .in("user_id", ids)
      .order("created_at", { ascending: false }),
    supabase
      .from("support_link_clicks")
      .select("user_id, group_name, link_key, link_label, clicked_at")
      .in("user_id", ids),
    supabase
      .from("monthly_score_snapshots")
      .select("user_id, year_month, total_score")
      .in("user_id", ids)
      .eq("year_month", previousYearMonth()),
    supabase
      .from("app_events")
      .select("user_id, created_at")
      .in("user_id", ids)
      .order("created_at", { ascending: false }),
  ]);

  const moodsByUser = new Map<string, { date: string; mood_score: number | null; pressure_alert: string | null; logged_at?: string }[]>();
  for (const row of moodRes.data ?? []) {
    const uid = String((row as { user_id: string }).user_id);
    const arr = moodsByUser.get(uid) ?? [];
    arr.push(row as { date: string; mood_score: number | null; pressure_alert: string | null; logged_at?: string });
    moodsByUser.set(uid, arr);
  }

  type CheckRow = {
    id: string;
    user_id: string;
    scale: ScaleKey;
    raw_score: number;
    max_score: number;
    crisis: boolean;
    completed_at: string;
  };
  const checksByUser = new Map<string, CheckRow[]>();
  for (const row of (checkRes.data ?? []) as CheckRow[]) {
    const arr = checksByUser.get(row.user_id) ?? [];
    arr.push(row);
    checksByUser.set(row.user_id, arr);
  }

  const lessonsByUser = new Map<string, Record<SkillId, number>>();
  for (const row of lessonRes.data ?? []) {
    const uid = String((row as { user_id: string }).user_id);
    const skill = (row as { skill_id: SkillId }).skill_id;
    const cur = lessonsByUser.get(uid) ?? emptyLessons();
    if (skill in cur) cur[skill] += 1;
    lessonsByUser.set(uid, cur);
  }

  type MsgRow = {
    id: string;
    user_id: string;
    role: "user" | "assistant" | "system";
    content: string;
    created_at: string;
    model?: string | null;
  };
  const msgsByUser = new Map<string, MsgRow[]>();
  for (const row of (consultRes.data ?? []) as MsgRow[]) {
    const arr = msgsByUser.get(row.user_id) ?? [];
    arr.push(row);
    msgsByUser.set(row.user_id, arr);
  }

  const clicksByUser = new Map<string, { ssc: number; clinic: number; dorm: number }>();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  for (const row of clickRes.data ?? []) {
    const uid = String((row as { user_id: string }).user_id);
    const clicked = new Date(String((row as { clicked_at: string }).clicked_at));
    if (clicked < monthStart) continue;
    const kind = classifySupport(
      (row as { group_name?: string }).group_name ?? null,
      (row as { link_key?: string }).link_key ?? null,
      (row as { link_label?: string }).link_label ?? null
    );
    if (!kind) continue;
    const cur = clicksByUser.get(uid) ?? { ssc: 0, clinic: 0, dorm: 0 };
    cur[kind] += 1;
    clicksByUser.set(uid, cur);
  }

  const prevScore = new Map<string, number>();
  for (const row of snapRes.data ?? []) {
    prevScore.set(String((row as { user_id: string }).user_id), Number((row as { total_score: number }).total_score));
  }

  const lastEvent = new Map<string, string>();
  for (const row of eventRes.data ?? []) {
    const uid = String((row as { user_id: string }).user_id);
    if (!lastEvent.has(uid)) lastEvent.set(uid, String((row as { created_at: string }).created_at));
  }

  return list.map((p) => {
    const moodRows = moodsByUser.get(p.id) ?? [];
    const moodLogs = fillMoodWindow(moodRows);
    const checks = emptyChecks();
    const checkRows = checksByUser.get(p.id) ?? [];
    let crisisUnresolved = false;
    for (const scale of ["phq", "gad", "psqi"] as ScaleKey[]) {
      const hist = checkRows.filter((c) => c.scale === scale).slice(0, 8);
      if (hist.length === 0) continue;
      checks[scale] = {
        latest: hist[0].raw_score,
        max: hist[0].max_score || checks[scale].max,
        history: [...hist].reverse().map((c) => ({ at: c.completed_at, score: c.raw_score })),
        latestAnswers: [],
      };
    }
    crisisUnresolved = checkRows.some((c) => c.crisis);

    const msgs = msgsByUser.get(p.id) ?? [];
    const consultThisWeek = msgs.filter(
      (m) => m.role === "user" && new Date(m.created_at).toISOString() >= since7
    ).length;
    const consultMessages: ConsultMessage[] = opts.includeConsult
      ? msgs
          .filter((m) => m.role === "user" || m.role === "assistant")
          .slice()
          .reverse()
          .filter((m) => m.model !== "welcome")
          .map((m) => ({
            id: m.id,
            at: m.created_at,
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          }))
      : [];

    const lastMood = moodRows
      .map((r) => r.logged_at)
      .filter((x): x is string => Boolean(x))
      .sort()
      .at(-1);
    const lastCheck = checkRows[0]?.completed_at;
    const lastLoginAt =
      lastEvent.get(p.id) ?? lastCheck ?? lastMood ?? p.updated_at ?? new Date().toISOString();

    const dept: Department = isDepartment(p.department) ? p.department : "救急救命士学科";

    return applyAutoWatch({
      id: p.id,
      name: safeDisplayName(p.name, p.student_id),
      studentId: p.student_id,
      department: dept,
      alertLevel: "none",
      alertReasons: [],
      lastLoginAt,
      moodLogs,
      checks,
      checkMonths: [],
      previousMonthScore: prevScore.get(p.id) ?? null,
      crisisUnresolved,
      lessonCompleted: lessonsByUser.get(p.id) ?? emptyLessons(),
      streakDays: streakDays(moodLogs),
      consultMessages,
      consultThisWeek,
      supportClicks: clicksByUser.get(p.id) ?? { ssc: 0, clinic: 0, dorm: 0 },
    });
  });
}

function sessionYearMonth(periodYm: string | null | undefined, completedAt: string): string {
  if (periodYm && /^\d{4}-\d{2}$/.test(periodYm)) return periodYm;
  return yearMonthFromIso(completedAt) ?? completedAt.slice(0, 7);
}

async function attachCheckMonths(
  supabase: SupabaseClient,
  student: Student
): Promise<Student> {
  const { data: sessions } = await supabase
    .from("check_sessions")
    .select("id, scale, raw_score, max_score, period_ym, completed_at")
    .eq("user_id", student.id)
    .order("completed_at", { ascending: false });

  const { data: answers } = await supabase
    .from("check_answers")
    .select("session_id, scale, question_id, question_no, answer_value, answer_text")
    .eq("user_id", student.id)
    .order("question_no");

  const byMonth = new Map<string, CheckMonth>();
  const taken = new Set<string>();
  for (const row of sessions ?? []) {
    const scale = row.scale as ScaleKey;
    if (scale !== "phq" && scale !== "gad" && scale !== "psqi") continue;
    const yearMonth = sessionYearMonth(
      (row as { period_ym?: string | null }).period_ym,
      String(row.completed_at)
    );
    const key = `${yearMonth}:${scale}`;
    if (taken.has(key)) continue;
    taken.add(key);
    const month = byMonth.get(yearMonth) ?? emptyCheckMonth(yearMonth);
    const sessionAnswers = (answers ?? []).filter(
      (a) => String(a.session_id) === String(row.id) && a.scale === scale
    );
    month.scales[scale] = {
      score: Number(row.raw_score),
      max: Number(row.max_score) || month.scales[scale].max,
      completedAt: String(row.completed_at),
      answers: formatCheckAnswers(scale, sessionAnswers),
    };
    byMonth.set(yearMonth, month);
  }

  const checkMonths = [...byMonth.values()]
    .map((month) => ({
      ...month,
      totalScore: computeTotalScore({
        phq: month.scales.phq.score,
        gad: month.scales.gad.score,
        psqi: month.scales.psqi.score,
      }),
    }))
    .sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));

  const latest = checkMonths[0];
  const checks = { ...student.checks };
  if (latest) {
    for (const scale of ["phq", "gad", "psqi"] as ScaleKey[]) {
      checks[scale] = {
        ...checks[scale],
        latestAnswers: latest.scales[scale].answers,
      };
    }
  }

  return { ...student, checks, checkMonths };
}

function attachConsultSuggestions(
  messages: ConsultMessage[],
  events: { created_at: string; props: Record<string, unknown> | string | null }[]
): ConsultMessage[] {
  const used = new Set<string>();
  const next = messages.map((m) => ({ ...m }));
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  for (const ev of sortedEvents) {
    const suggestion = suggestionFromKind(suggestKindFromProps(ev.props));
    if (!suggestion) continue;
    const t = new Date(ev.created_at).getTime();
    let best: ConsultMessage | null = null;
    let bestDist = Infinity;
    for (const m of next) {
      if (m.role !== "assistant" || used.has(m.id)) continue;
      const dist = Math.abs(new Date(m.at).getTime() - t);
      if (dist < bestDist && dist <= 10 * 60 * 1000) {
        best = m;
        bestDist = dist;
      }
    }
    if (best) {
      used.add(best.id);
      best.suggestion = suggestion;
    }
  }

  return next.map((m, i) => {
    if (m.role !== "assistant" || m.suggestion) return m;
    let prevUser: ConsultMessage | undefined;
    for (let j = i - 1; j >= 0; j--) {
      if (next[j].role === "user") {
        prevUser = next[j];
        break;
      }
    }
    return { ...m, suggestion: suggestionFromExchange(prevUser?.content, m.content) };
  });
}

async function attachStudentDetail(
  supabase: SupabaseClient,
  student: Student
): Promise<Student> {
  const withChecks = await attachCheckMonths(supabase, student);
  const since = isoDate(daysAgo(370));

  const [moodRes, eventRes] = await Promise.all([
    supabase
      .from("condition_logs")
      .select("date, mood_score, pressure_alert")
      .eq("user_id", student.id)
      .gte("date", since),
    supabase
      .from("app_events")
      .select("created_at, props")
      .eq("user_id", student.id)
      .eq("event_name", "consult_send")
      .order("created_at", { ascending: true }),
  ]);

  const moodLogs = fillMoodWindow(
    (moodRes.data ?? []) as { date: string; mood_score: number | null; pressure_alert: string | null }[],
    370
  );
  const consultMessages = attachConsultSuggestions(
    withChecks.consultMessages,
    (eventRes.data ?? []) as { created_at: string; props: Record<string, unknown> | null }[]
  );

  return {
    ...withChecks,
    moodLogs,
    consultMessages,
    streakDays: streakDays(moodLogs),
  };
}

export async function loadStudentById(
  supabase: SupabaseClient,
  id: string
): Promise<Student | null> {
  const all = await loadStudents(supabase, { includeConsult: true });
  const student = all.find((s) => s.id === id) ?? null;
  if (!student) return null;
  return attachStudentDetail(supabase, student);
}
