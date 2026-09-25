import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadStaffMe } from "@/lib/students/load";
import { INITIAL_STAFF_PASSWORD, needsPasswordSetup } from "@/lib/staff-auth";
import { staffAuthErrorMessage } from "@/lib/staff-admin";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const me = await loadStaffMe(supabase);
    if (!me) {
      return NextResponse.json({ error: "教員アカウントではありません" }, { status: 403 });
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user || !needsPasswordSetup(user.user_metadata as Record<string, unknown>)) {
      return NextResponse.json({ error: "パスワード設定は不要です" }, { status: 400 });
    }

    const body = (await req.json()) as { password?: string; confirm?: string };
    const password = (body.password ?? "").trim();
    const confirm = (body.confirm ?? "").trim();

    if (password !== confirm) {
      return NextResponse.json({ error: "確認用パスワードが一致しません" }, { status: 400 });
    }
    if (password === INITIAL_STAFF_PASSWORD) {
      return NextResponse.json({ error: "初期パスワードとは別のパスワードを設定してください" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "パスワードは6文字以上にしてください" }, { status: 400 });
    }

    const prevMeta =
      typeof user.user_metadata === "object" && user.user_metadata ? user.user_metadata : {};
    const { error } = await supabase.auth.updateUser({
      password,
      data: {
        ...prevMeta,
        app: "residesk",
        must_change_password: false,
      },
    });
    if (error) {
      return NextResponse.json(
        { error: staffAuthErrorMessage(error.message, "パスワードの更新に失敗しました") },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "password update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
