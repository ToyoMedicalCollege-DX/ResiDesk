-- ResiDesk 仮教員アカウント
-- 前提: 20260924_residesk_staff.sql 適用済み
-- Supabase SQL Editor でこのファイル全体を実行

-- ログイン
--   ID: 00000
--   パスワード: 00000
--   （内部メール: 00000@staff.resiapp.jp）
--
-- ロールは admin（担当割当なしで全学生を閲覧）
-- 本番運用前にパスワードを変更するか、このユーザーを削除すること

DO $$
DECLARE
  v_email TEXT := '00000@staff.resiapp.jp';
  v_password TEXT := '00000';
  v_name TEXT := '山本 先生';
  v_id UUID;
BEGIN
  SELECT id INTO v_id
  FROM auth.users
  WHERE email = v_email;

  IF v_id IS NULL THEN
    v_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_id,
      'authenticated',
      'authenticated',
      v_email,
      extensions.crypt(v_password, extensions.gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object(
        'app', 'residesk',
        'staff_role', 'admin',
        'display_name', v_name,
        'must_change_password', false
      ),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_id,
      v_email,
      jsonb_build_object(
        'sub', v_id::text,
        'email', v_email,
        'email_verified', true
      ),
      'email',
      now(),
      now(),
      now()
    );
  ELSE
    UPDATE auth.users
    SET
      encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
        'app', 'residesk',
        'staff_role', 'admin',
        'display_name', v_name,
        'must_change_password', false
      ),
      updated_at = now()
    WHERE id = v_id;
  END IF;

  INSERT INTO public.staff_profiles (id, role, display_name)
  VALUES (v_id, 'admin', v_name)
  ON CONFLICT (id) DO UPDATE
    SET role = EXCLUDED.role,
        display_name = EXCLUDED.display_name,
        updated_at = now();
END $$;
