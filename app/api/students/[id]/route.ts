import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient, requireAdmin } from "@/lib/staff-admin";
import { deleteStudentCompletely } from "@/lib/students/delete";
import { loadStaffMe, loadStudentById } from "@/lib/students/load";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const me = await loadStaffMe(supabase);
    if (!me) {
      return NextResponse.json({ error: "教員アカウントではありません" }, { status: 403 });
    }

    const student = await loadStudentById(supabase, id);
    if (!student) {
      return NextResponse.json({ error: "学生が見つかりません" }, { status: 404 });
    }

    const { error: auditError } = await supabase.from("staff_audit_logs").insert({
      staff_id: me.id,
      student_id: id,
      action: "view_detail",
    });
    if (auditError) console.warn("audit insert:", auditError.message);

    return NextResponse.json({ student });
  } catch (e) {
    const message = e instanceof Error ? e.message : "student failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireAdmin();
    if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const { id } = await params;
    const deleted = await deleteStudentCompletely(getAdminClient(), id);
    return NextResponse.json({ ok: true, deleted });
  } catch (e) {
    const message = e instanceof Error ? e.message : "student delete failed";
    const status = message === "学生が見つかりません" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
