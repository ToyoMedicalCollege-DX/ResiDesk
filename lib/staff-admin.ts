import type { SupabaseClient } from "@supabase/supabase-js";
import {
  encryptProfileName,
  isEncryptedProfileName,
  safeDisplayName,
} from "@/lib/crypto/profile-name";
import { isDepartment, type Department } from "@/lib/types";
import { isStaffRole, type StaffRole } from "@/lib/staff";
import { INITIAL_STAFF_PASSWORD } from "@/lib/staff-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadStaffMe } from "@/lib/students/load";

export function revealStaffName(stored: string | null | undefined): string {
  return safeDisplayName(stored ?? "", "教員");
}

export function encryptStaffName(plain: string): string {
  return encryptProfileName(plain.trim());
}

export async function sealPlainStaffName(
  admin: SupabaseClient,
  staffId: string,
  stored: string,
  userMetadata?: Record<string, unknown>
): Promise<string> {
  if (!stored) return stored;
  const sealed = isEncryptedProfileName(stored) ? stored : encryptProfileName(stored);
  if (!isEncryptedProfileName(stored)) {
    const { error } = await admin
      .from("staff_profiles")
      .update({ display_name: sealed })
      .eq("id", staffId);
    if (error) console.warn("staff name encrypt:", error.message);
  }
  if (userMetadata && userMetadata.display_name !== sealed) {
    const { error } = await admin.auth.admin.updateUserById(staffId, {
      user_metadata: { ...userMetadata, display_name: sealed },
    });
    if (error) console.warn("staff name metadata encrypt:", error.message);
  }
  return sealed;
}

export type StaffAccount = {
  id: string;
  loginId: string;
  displayName: string;
  role: StaffRole;
  departments: Department[];
};

export async function requireAdmin() {
  const supabase = await createClient();
  const me = await loadStaffMe(supabase);
  if (!me) return { error: "教員アカウントではありません", status: 403 as const };
  if (me.role !== "admin") return { error: "管理者のみ操作できます", status: 403 as const };
  return { me, supabase };
}

export function parseDepartments(raw: unknown): Department[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is Department => typeof v === "string" && isDepartment(v));
}

export function parseRole(raw: unknown): StaffRole | null {
  return typeof raw === "string" && isStaffRole(raw) ? raw : null;
}

export async function replaceDepartmentAssignments(
  admin: SupabaseClient,
  staffId: string,
  departments: Department[]
) {
  const { error: delError } = await admin
    .from("staff_assignments")
    .delete()
    .eq("staff_id", staffId)
    .eq("scope_type", "department");
  if (delError) throw new Error(delError.message);

  if (departments.length === 0) return;

  const { error: insError } = await admin.from("staff_assignments").insert(
    departments.map((department) => ({
      staff_id: staffId,
      scope_type: "department",
      department,
      student_id: null,
    }))
  );
  if (insError) throw new Error(insError.message);
}

export function getAdminClient() {
  return createAdminClient();
}

export function staffAuthErrorMessage(message: string | undefined, fallback: string): string {
  if (!message) return fallback;
  if (/at least 6 characters/i.test(message)) return "パスワードは6文字以上にしてください";
  return message;
}

export async function applyInitialStaffPassword(admin: SupabaseClient, userId: string) {
  const direct = await admin.auth.admin.updateUserById(userId, {
    password: INITIAL_STAFF_PASSWORD,
  });
  if (!direct.error) return;

  const rpc = await admin.rpc("set_staff_initial_password", { p_user_id: userId });
  if (rpc.error) {
    throw new Error(
      "初期パスワード 0000 を設定できません。Supabase で 20260924_staff_initial_password.sql を実行してください。"
    );
  }
}
