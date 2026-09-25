import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadStaffMe, loadStudents } from "@/lib/students/load";

export async function GET() {
  try {
    const supabase = await createClient();
    const me = await loadStaffMe(supabase);
    if (!me) {
      return NextResponse.json({ error: "教員アカウントではありません" }, { status: 403 });
    }
    const students = await loadStudents(supabase);
    return NextResponse.json({ students });
  } catch (e) {
    const message = e instanceof Error ? e.message : "students failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
