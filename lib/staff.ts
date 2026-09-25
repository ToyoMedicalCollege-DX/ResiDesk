import type { Department } from "@/lib/types";

export type StaffRole = "teacher" | "advisor" | "admin";

export type StaffMe = {
  id: string;
  name: string;
  role: StaffRole;
  roleLabel: string;
  departments: Department[];
  mustChangePassword: boolean;
};

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  teacher: "学科教員",
  advisor: "学科教員",
  admin: "管理者",
};

/** 画面で選べるロール。advisor は互換用で学科教員として扱う */
export const STAFF_ROLES: StaffRole[] = ["teacher", "admin"];

export function staffRoleLabel(role: StaffRole, departments: string[] = []): string {
  if (role !== "admin" && departments.length === 1) {
    return `学科教員（${departments[0]}）`;
  }
  return STAFF_ROLE_LABEL[role];
}

export function toAssignableRole(role: StaffRole): "teacher" | "admin" {
  return role === "admin" ? "admin" : "teacher";
}

export function isStaffRole(value: string | null | undefined): value is StaffRole {
  return value === "teacher" || value === "advisor" || value === "admin";
}
