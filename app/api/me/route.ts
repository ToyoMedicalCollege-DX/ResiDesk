import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadStaffMe } from "@/lib/students/load";
import { staffRoleLabel } from "@/lib/staff";
import { needsPasswordSetup } from "@/lib/staff-auth";
import { getAdminClient, sealPlainStaffName } from "@/lib/staff-admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const me = await loadStaffMe(supabase);
    if (!me) {
      return NextResponse.json({ error: "教員アカウントではありません" }, { status: 403 });
    }
    const { data: userData } = await supabase.auth.getUser();
    const { data: raw } = await supabase
      .from("staff_profiles")
      .select("display_name")
      .eq("id", me.id)
      .maybeSingle();
    if (raw?.display_name) {
      await sealPlainStaffName(
        getAdminClient(),
        me.id,
        raw.display_name as string,
        (userData.user?.user_metadata as Record<string, unknown> | undefined) ?? {}
      );
    }
    return NextResponse.json({
      id: me.id,
      name: me.displayName,
      role: me.role,
      roleLabel: staffRoleLabel(me.role, me.departments),
      departments: me.departments,
      mustChangePassword: needsPasswordSetup(userData.user?.user_metadata as Record<string, unknown> | undefined),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "me failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
