import { NextResponse } from "next/server";
import { staffRoleLabel } from "@/lib/staff";
import {
  encryptStaffName,
  getAdminClient,
  revealStaffName,
  staffAuthErrorMessage,
  parseDepartments,
  parseRole,
  replaceDepartmentAssignments,
  requireAdmin,
} from "@/lib/staff-admin";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const gate = await requireAdmin();
    if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const { id } = await params;
    const body = (await req.json()) as {
      displayName?: string;
      role?: string;
      departments?: unknown;
      password?: string;
    };

    const admin = getAdminClient();
    const { data: existing, error: existingError } = await admin
      .from("staff_profiles")
      .select("id, role, display_name")
      .eq("id", id)
      .maybeSingle();
    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 400 });
    if (!existing) return NextResponse.json({ error: "教員が見つかりません" }, { status: 404 });

    const displayName =
      body.displayName != null ? body.displayName.trim() : revealStaffName(existing.display_name);
    const storedName = encryptStaffName(displayName);
    const role = body.role != null ? parseRole(body.role) : existing.role;
    const departments = body.departments != null ? parseDepartments(body.departments) : null;
    const password = body.password?.trim() ?? "";

    if (!displayName) return NextResponse.json({ error: "名前を入力してください" }, { status: 400 });
    if (!role) return NextResponse.json({ error: "ロールを選んでください" }, { status: 400 });
    if (role !== "admin" && departments && departments.length === 0) {
      return NextResponse.json({ error: "担当学科を1つ以上選んでください" }, { status: 400 });
    }

    if (existing.role === "admin" && role !== "admin") {
      const { count } = await admin
        .from("staff_profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) <= 1) {
        return NextResponse.json({ error: "最後の管理者はロールを変更できません" }, { status: 400 });
      }
    }

    const { error: updateError } = await admin
      .from("staff_profiles")
      .update({ role, display_name: storedName })
      .eq("id", id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

    if (departments) {
      await replaceDepartmentAssignments(admin, id, departments);
    }

    const { data: authUser } = await admin.auth.admin.getUserById(id);
    const prevMeta =
      authUser.user?.user_metadata && typeof authUser.user.user_metadata === "object"
        ? authUser.user.user_metadata
        : {};
    const authPatch: { password?: string; user_metadata?: Record<string, unknown> } = {
      user_metadata: {
        ...prevMeta,
        app: "residesk",
        staff_role: role,
        display_name: storedName,
      },
    };
    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: "パスワードは6文字以上にしてください" }, { status: 400 });
      }
      authPatch.password = password;
    }
    const authRes = await admin.auth.admin.updateUserById(id, authPatch);
    if (authRes.error) {
      return NextResponse.json(
        { error: staffAuthErrorMessage(authRes.error.message, "更新に失敗しました") },
        { status: 400 }
      );
    }

    const nextDepts = departments ?? [];
    return NextResponse.json({
      ok: true,
      staff: {
        id,
        displayName,
        role,
        roleLabel: staffRoleLabel(role, nextDepts),
        departments: departments,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "staff update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const gate = await requireAdmin();
    if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const { id } = await params;
    if (id === gate.me.id) {
      return NextResponse.json({ error: "自分自身は削除できません" }, { status: 400 });
    }

    const admin = getAdminClient();
    const { data: existing } = await admin
      .from("staff_profiles")
      .select("id, role")
      .eq("id", id)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: "教員が見つかりません" }, { status: 404 });

    if (existing.role === "admin") {
      const { count } = await admin
        .from("staff_profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) <= 1) {
        return NextResponse.json({ error: "最後の管理者は削除できません" }, { status: 400 });
      }
    }

    const { error: profileError } = await admin.from("staff_profiles").delete().eq("id", id);
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

    const authRes = await admin.auth.admin.deleteUser(id);
    if (authRes.error) return NextResponse.json({ error: authRes.error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "staff delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
