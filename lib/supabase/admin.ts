import { createClient } from "@supabase/supabase-js";

/**
 * service_role 専用。RLS をバイパスする。
 * Route Handler / Server Action 以外では使わない。ブラウザに載せない。
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY が未設定です。サーバー専用の .env.local を確認してください。"
    );
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
