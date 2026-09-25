import type { SupabaseClient } from "@supabase/supabase-js";

const USER_ID_TABLES = [
  "check_answers",
  "check_sessions",
  "consult_messages",
  "consult_threads",
  "condition_logs",
  "lesson_completions",
  "work_answers",
  "monthly_score_snapshots",
  "notification_settings",
  "user_badges",
  "user_preferences",
  "support_link_clicks",
  "app_events",
] as const;

const STUDENT_ID_TABLES = [
  "staff_student_notes",
  "staff_student_flags",
  "staff_audit_logs",
] as const;

async function deleteBy(
  admin: SupabaseClient,
  table: string,
  column: string,
  id: string
) {
  const { error } = await admin.from(table).delete().eq(column, id);
  if (!error) return;
  if (error.code === "42P01" || /does not exist/i.test(error.message)) return;
  throw new Error(`${table}: ${error.message}`);
}

export async function deleteStudentCompletely(admin: SupabaseClient, studentId: string) {
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, student_id, name")
    .eq("id", studentId)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (!profile) throw new Error("学生が見つかりません");

  const { data: staff } = await admin
    .from("staff_profiles")
    .select("id")
    .eq("id", studentId)
    .maybeSingle();
  if (staff) throw new Error("教員アカウントは学生削除できません");

  for (const table of USER_ID_TABLES) {
    await deleteBy(admin, table, "user_id", studentId);
  }
  for (const table of STUDENT_ID_TABLES) {
    await deleteBy(admin, table, "student_id", studentId);
  }

  const { error: assignError } = await admin
    .from("staff_assignments")
    .delete()
    .eq("student_id", studentId);
  if (assignError && assignError.code !== "42P01") {
    throw new Error(`staff_assignments: ${assignError.message}`);
  }

  const { error: delProfileError } = await admin.from("profiles").delete().eq("id", studentId);
  if (delProfileError) throw new Error(delProfileError.message);

  const authRes = await admin.auth.admin.deleteUser(studentId);
  if (authRes.error) throw new Error(authRes.error.message);

  return {
    id: profile.id as string,
    studentId: String(profile.student_id),
    name: String(profile.name),
  };
}
