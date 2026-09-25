/** クライアント／サーバー共通（Node crypto 非依存） */

export const PROFILE_NAME_CIPHER_PREFIX = "enc:v1:";

export function isEncryptedProfileName(
  value: string | null | undefined
): boolean {
  return typeof value === "string" && value.startsWith(PROFILE_NAME_CIPHER_PREFIX);
}
