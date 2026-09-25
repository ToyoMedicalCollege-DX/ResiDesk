import { NextResponse } from "next/server";
import { staffEmailToLoginId, staffLoginToEmail, normalizeStaffId } from "@/lib/staff-auth";
import { isStaffRole, staffRoleLabel } from "@/lib/staff";
import { isDepartment, type Department } from "@/lib/types";
import {
  applyInitialStaffPassword,
  encryptStaffName,
  getAdminClient,
  revealStaffName,
  sealPlainStaffName,
  staffAuthErrorMessage,
  parseDepartments,
  parseRole,
  replaceDepartmentAssignments,
  requireAdmin,
  type StaffAccount,
} from "@/lib/staff-admin";

export async function GET() {
  try {
    const gate = await requireAdmin();
    if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const admin = getAdminClient();
    const { data: profiles, error: profileError } = await admin
      .from("staff_profiles")
      .select("id, role, display_name");
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

    const { data: assignments, error: assignError } = await admin
      .from("staff_assignments")
      .select("staff_id, scope_type, department")
      .eq("scope_type", "department");
    if (assignError) return NextResponse.json({ error: assignError.message }, { status: 400 });

    const deptsByStaff = new Map<string, Department[]>();
    for (const row of assignments ?? []) {
      if (!isDepartment(String(row.department))) continue;
      const list = deptsByStaff.get(row.staff_id) ?? [];
      list.push(row.department as Department);
      deptsByStaff.set(row.staff_id, list);
    }

    const loginById = new Map<string, string>();
    const metaById = new Map<string, Record<string, unknown>>();
    let page = 1;
    while (page <= 10) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      for (const user of data.users) {
        loginById.set(user.id, staffEmailToLoginId(user.email));
        if (user.user_metadata && typeof user.user_metadata === "object") {
          metaById.set(user.id, user.user_metadata as Record<string, unknown>);
        }
      }
      if (data.users.length < 200) break;
      page += 1;
    }

    const staff: StaffAccount[] = [];
    for (const p of profiles ?? []) {
      if (!isStaffRole(String(p.role))) continue;
      await sealPlainStaffName(admin, p.id, p.display_name, metaById.get(p.id));
      staff.push({
        id: p.id,
        loginId: loginById.get(p.id) ?? "",
        displayName: revealStaffName(p.display_name),
        role: p.role,
        departments: deptsByStaff.get(p.id) ?? [],
      });
    }
    staff.sort((a, b) => a.displayName.localeCompare(b.displayName, "ja"));

    return NextResponse.json({
      staff: staff.map((s) => ({ ...s, roleLabel: staffRoleLabel(s.role, s.departments) })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "staff list failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const gate = await requireAdmin();
    if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const body = (await req.json()) as {
      loginId?: string;
      displayName?: string;
      role?: string;
      departments?: unknown;
    };

    const loginId = normalizeStaffId(body.loginId ?? "");
    const displayName = (body.displayName ?? "").trim();
    const storedName = displayName ? encryptStaffName(displayName) : "";
    const role = parseRole(body.role);
    const departments = parseDepartments(body.departments);

    if (!loginId) return NextResponse.json({ error: "社員番号を入力してください" }, { status: 400 });
    if (loginId.includes("@")) {
      return NextResponse.json({ error: "社員番号に @ は使えません" }, { status: 400 });
    }
    if (!displayName) return NextResponse.json({ error: "名前を入力してください" }, { status: 400 });
    if (!role) return NextResponse.json({ error: "ロールを選んでください" }, { status: 400 });
    if (role !== "admin" && departments.length === 0) {
      return NextResponse.json({ error: "担当学科を1つ以上選んでください" }, { status: 400 });
    }

    const admin = getAdminClient();
    const email = staffLoginToEmail(loginId);
    const created = await admin.auth.admin.createUser({
      email,
      password: "ChangeMe1",
      email_confirm: true,
      user_metadata: {
        app: "residesk",
        staff_role: role,
        display_name: storedName,
        must_change_password: true,
      },
    });
    if (created.error || !created.data.user) {
      return NextResponse.json(
        { error: staffAuthErrorMessage(created.error?.message, "ユーザー作成に失敗しました") },
        { status: 400 }
      );
    }

    const id = created.data.user.id;
    const { error: profileError } = await admin.from("staff_profiles").insert({
      id,
      role,
      display_name: storedName,
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(id);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    try {
      await applyInitialStaffPassword(admin, id);
      await replaceDepartmentAssignments(admin, id, departments);
    } catch (e) {
      await admin.from("staff_profiles").delete().eq("id", id);
      await admin.auth.admin.deleteUser(id);
      const message = e instanceof Error ? e.message : "担当学科の保存に失敗しました";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      staff: {
        id,
        loginId,
        displayName,
        role,
        roleLabel: staffRoleLabel(role, departments),
        departments,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "staff create failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
