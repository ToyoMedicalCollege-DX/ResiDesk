-- 教員の初期パスワードを 0000 に固定する（Auth の6文字下限を回避）
-- service_role からのみ実行可。Supabase SQL Editor で適用する。

CREATE OR REPLACE FUNCTION public.set_staff_initial_password(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  UPDATE auth.users
  SET
    encrypted_password = extensions.crypt('0000', extensions.gen_salt('bf')),
    updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_staff_initial_password(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_staff_initial_password(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.set_staff_initial_password(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.set_staff_initial_password(uuid) TO service_role;
