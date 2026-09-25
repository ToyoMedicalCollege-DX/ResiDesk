/** Supabase Auth は email 必須のため、学校IDを内部メールに写像する。 */
export const STAFF_AUTH_DOMAIN = "staff.resiapp.jp";

/** 新規教員の初期パスワード。初回ログイン後に必ず変更させる。 */
export const INITIAL_STAFF_PASSWORD = "0000";

export function needsPasswordSetup(metadata: Record<string, unknown> | undefined | null): boolean {
  return metadata?.must_change_password === true;
}

export function normalizeStaffId(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "");
}

/** IDだけ、または既存のメールそのままで Auth 用メールにする */
export function staffLoginToEmail(raw: string): string {
  const value = normalizeStaffId(raw);
  if (!value) return "";
  if (value.includes("@")) return value;
  return `${value}@${STAFF_AUTH_DOMAIN}`;
}

/** Auth メールから画面表示用の ID を取り出す */
export function staffEmailToLoginId(email: string | undefined | null): string {
  const value = (email ?? "").trim().toLowerCase();
  const suffix = `@${STAFF_AUTH_DOMAIN}`;
  if (value.endsWith(suffix)) return value.slice(0, -suffix.length);
  return value;
}
