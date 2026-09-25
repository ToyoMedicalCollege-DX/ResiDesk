import { NextResponse } from "next/server";

export async function PATCH() {
  return NextResponse.json(
    { error: "注意フラグは実施状況から自動判定するため、手動更新はできません" },
    { status: 400 }
  );
}
