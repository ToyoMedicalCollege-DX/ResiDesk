-- ResiDesk: 教員用テーブル + RLS（学生アプリと同一 Supabase）
--
-- 前提:
--   - 20260917_profiles.sql / 20260919_resiapp_core_tables.sql 適用済み
--   - 学生は profiles を持つ。教員は staff_profiles を持ち、profiles は作らない
--   - ヘルパーは SECURITY DEFINER（RLS 再帰回避）
--
-- 適用: Supabase SQL Editor で実行、または supabase db push

-- ---------------------------------------------------------------------------
-- 0. 教員サインアップ時は学生 profiles を作らない
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id  TEXT;
  v_name        TEXT;
  v_department  TEXT;
  v_staff_role  TEXT;
BEGIN
  v_staff_role := lower(trim(COALESCE(
    NEW.raw_user_meta_data->>'staff_role',
    NEW.raw_user_meta_data->>'role',
    ''
  )));

  -- ResiDesk 教員。学生 profiles は作らない
  IF COALESCE(NEW.raw_user_meta_data->>'app', '') = 'residesk'
     OR v_staff_role IN ('teacher', 'advisor', 'admin')
  THEN
    RETURN NEW;
  END IF;

  v_student_id := upper(trim(COALESCE(NEW.raw_user_meta_data->>'student_id', '')));
  v_name := trim(COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'nickname',
    ''
  ));
  v_department := trim(COALESCE(NEW.raw_user_meta_data->>'department', ''));

  IF v_student_id = '' AND NEW.email IS NOT NULL THEN
    v_student_id := upper(split_part(NEW.email, '@', 1));
  END IF;
  IF v_name = '' THEN
    v_name := v_student_id;
  END IF;
  IF v_department = '' THEN
    RAISE EXCEPTION 'department is required';
  END IF;
  IF v_department NOT IN (
    '歯科技工士学科',
    '救急救命士学科',
    '鍼灸師学科',
    '柔道整復師学科'
  ) THEN
    RAISE EXCEPTION 'invalid department: %', v_department;
  END IF;

  INSERT INTO public.profiles (id, student_id, name, department)
  VALUES (NEW.id, v_student_id, v_name, v_department)
  ON CONFLICT (id) DO UPDATE
    SET
      student_id = EXCLUDED.student_id,
      name = EXCLUDED.name,
      department = EXCLUDED.department,
      updated_at = now();

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. staff_profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('teacher', 'advisor', 'admin')),
  display_name    TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.staff_profiles IS '教員・学生支援・管理者プロフィール（auth.users と 1:1）';

DROP TRIGGER IF EXISTS trg_staff_profiles_updated_at ON public.staff_profiles;
CREATE TRIGGER trg_staff_profiles_updated_at
  BEFORE UPDATE ON public.staff_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. staff_assignments（担当学科 or 担当学生）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id      UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  scope_type    TEXT NOT NULL CHECK (scope_type IN ('department', 'student')),
  department    TEXT
                  CHECK (
                    department IS NULL OR department IN (
                      '歯科技工士学科',
                      '救急救命士学科',
                      '鍼灸師学科',
                      '柔道整復師学科'
                    )
                  ),
  student_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT staff_assignments_scope_check CHECK (
    (scope_type = 'department' AND department IS NOT NULL AND student_id IS NULL)
    OR
    (scope_type = 'student' AND student_id IS NOT NULL AND department IS NULL)
  )
);

COMMENT ON TABLE public.staff_assignments IS '教員の閲覧範囲（学科または個別学生）';

CREATE INDEX IF NOT EXISTS idx_staff_assignments_staff
  ON public.staff_assignments (staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_dept
  ON public.staff_assignments (department)
  WHERE scope_type = 'department';
CREATE INDEX IF NOT EXISTS idx_staff_assignments_student
  ON public.staff_assignments (student_id)
  WHERE scope_type = 'student';

-- ---------------------------------------------------------------------------
-- 3. staff_student_flags
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_student_flags (
  student_id    UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  watch_status  TEXT NOT NULL DEFAULT 'normal'
                  CHECK (watch_status IN ('normal', 'observe', 'priority')),
  alert_flag    BOOLEAN NOT NULL DEFAULT false,
  updated_by    UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.staff_student_flags IS '経過観察ステータスと注意フラグ（学生非公開）';

DROP TRIGGER IF EXISTS trg_staff_student_flags_updated_at ON public.staff_student_flags;
CREATE TRIGGER trg_staff_student_flags_updated_at
  BEFORE UPDATE ON public.staff_student_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. staff_student_notes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_student_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  author_name   TEXT NOT NULL,
  body          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.staff_student_notes IS '面談メモ（学生非公開）';

CREATE INDEX IF NOT EXISTS idx_staff_student_notes_student_time
  ON public.staff_student_notes (student_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 5. staff_audit_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id      UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action        TEXT NOT NULL DEFAULT 'view_detail',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.staff_audit_logs IS '教員が学生詳細を開いた等の監査ログ（学生非公開）';

CREATE INDEX IF NOT EXISTS idx_staff_audit_logs_student_time
  ON public.staff_audit_logs (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_audit_logs_staff_time
  ON public.staff_audit_logs (staff_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 6. ヘルパー（SECURITY DEFINER: テーブル RLS を読まない）
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_profiles WHERE id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.staff_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.staff_profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.can_view_student(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_dept TEXT;
BEGIN
  IF auth.uid() IS NULL OR p_student_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT role INTO v_role
  FROM public.staff_profiles
  WHERE id = auth.uid();

  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  IF v_role = 'admin' THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.staff_assignments
    WHERE staff_id = auth.uid()
      AND scope_type = 'student'
      AND student_id = p_student_id
  ) THEN
    RETURN true;
  END IF;

  SELECT department INTO v_dept
  FROM public.profiles
  WHERE id = p_student_id;

  IF v_dept IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.staff_assignments
    WHERE staff_id = auth.uid()
      AND scope_type = 'department'
      AND department = v_dept
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.staff_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_student(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_student(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. RLS: 教員テーブル
-- ---------------------------------------------------------------------------
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_student_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_student_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_profiles_select_self" ON public.staff_profiles;
CREATE POLICY "staff_profiles_select_self"
  ON public.staff_profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.staff_role() = 'admin');

DROP POLICY IF EXISTS "staff_assignments_select_own" ON public.staff_assignments;
CREATE POLICY "staff_assignments_select_own"
  ON public.staff_assignments FOR SELECT TO authenticated
  USING (staff_id = auth.uid() OR public.staff_role() = 'admin');

DROP POLICY IF EXISTS "staff_flags_select" ON public.staff_student_flags;
CREATE POLICY "staff_flags_select"
  ON public.staff_student_flags FOR SELECT TO authenticated
  USING (public.can_view_student(student_id));

DROP POLICY IF EXISTS "staff_flags_insert" ON public.staff_student_flags;
CREATE POLICY "staff_flags_insert"
  ON public.staff_student_flags FOR INSERT TO authenticated
  WITH CHECK (public.can_view_student(student_id) AND updated_by = auth.uid());

DROP POLICY IF EXISTS "staff_flags_update" ON public.staff_student_flags;
CREATE POLICY "staff_flags_update"
  ON public.staff_student_flags FOR UPDATE TO authenticated
  USING (public.can_view_student(student_id))
  WITH CHECK (public.can_view_student(student_id) AND updated_by = auth.uid());

DROP POLICY IF EXISTS "staff_notes_select" ON public.staff_student_notes;
CREATE POLICY "staff_notes_select"
  ON public.staff_student_notes FOR SELECT TO authenticated
  USING (public.can_view_student(student_id));

DROP POLICY IF EXISTS "staff_notes_insert" ON public.staff_student_notes;
CREATE POLICY "staff_notes_insert"
  ON public.staff_student_notes FOR INSERT TO authenticated
  WITH CHECK (public.can_view_student(student_id) AND author_id = auth.uid());

DROP POLICY IF EXISTS "staff_audit_insert" ON public.staff_audit_logs;
CREATE POLICY "staff_audit_insert"
  ON public.staff_audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_staff() AND staff_id = auth.uid() AND public.can_view_student(student_id));

DROP POLICY IF EXISTS "staff_audit_select" ON public.staff_audit_logs;
CREATE POLICY "staff_audit_select"
  ON public.staff_audit_logs FOR SELECT TO authenticated
  USING (public.staff_role() = 'admin' OR staff_id = auth.uid());

GRANT SELECT ON public.staff_profiles TO authenticated;
GRANT SELECT ON public.staff_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.staff_student_flags TO authenticated;
GRANT SELECT, INSERT ON public.staff_student_notes TO authenticated;
GRANT SELECT, INSERT ON public.staff_audit_logs TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. RLS: 学生データへの教員 SELECT（既存の本人ポリシーは残す）
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_staff" ON public.profiles;
CREATE POLICY "profiles_select_staff"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.can_view_student(id));

DROP POLICY IF EXISTS "condition_logs_select_staff" ON public.condition_logs;
CREATE POLICY "condition_logs_select_staff"
  ON public.condition_logs FOR SELECT TO authenticated
  USING (public.can_view_student(user_id));

DROP POLICY IF EXISTS "check_sessions_select_staff" ON public.check_sessions;
CREATE POLICY "check_sessions_select_staff"
  ON public.check_sessions FOR SELECT TO authenticated
  USING (public.can_view_student(user_id));

DROP POLICY IF EXISTS "check_answers_select_staff" ON public.check_answers;
CREATE POLICY "check_answers_select_staff"
  ON public.check_answers FOR SELECT TO authenticated
  USING (public.can_view_student(user_id));

DROP POLICY IF EXISTS "lesson_completions_select_staff" ON public.lesson_completions;
CREATE POLICY "lesson_completions_select_staff"
  ON public.lesson_completions FOR SELECT TO authenticated
  USING (public.can_view_student(user_id));

DROP POLICY IF EXISTS "consult_threads_select_staff" ON public.consult_threads;
CREATE POLICY "consult_threads_select_staff"
  ON public.consult_threads FOR SELECT TO authenticated
  USING (public.is_staff() AND public.can_view_student(user_id));

DROP POLICY IF EXISTS "consult_messages_select_staff" ON public.consult_messages;
CREATE POLICY "consult_messages_select_staff"
  ON public.consult_messages FOR SELECT TO authenticated
  USING (public.is_staff() AND public.can_view_student(user_id));

DROP POLICY IF EXISTS "support_link_clicks_select_staff" ON public.support_link_clicks;
CREATE POLICY "support_link_clicks_select_staff"
  ON public.support_link_clicks FOR SELECT TO authenticated
  USING (user_id IS NOT NULL AND public.can_view_student(user_id));

DROP POLICY IF EXISTS "monthly_score_snapshots_select_staff" ON public.monthly_score_snapshots;
CREATE POLICY "monthly_score_snapshots_select_staff"
  ON public.monthly_score_snapshots FOR SELECT TO authenticated
  USING (public.can_view_student(user_id));

DROP POLICY IF EXISTS "app_events_select_staff" ON public.app_events;
CREATE POLICY "app_events_select_staff"
  ON public.app_events FOR SELECT TO authenticated
  USING (user_id IS NOT NULL AND public.can_view_student(user_id));

-- ---------------------------------------------------------------------------
-- 9. 教員アカウント作成手順（SQL Editor で手実行）
-- ---------------------------------------------------------------------------
-- 1) Authentication で教員ユーザーを作成（メール＋パスワード）
-- 2) 下記を実行（UUID は Auth の User UID）
--
-- INSERT INTO public.staff_profiles (id, role, display_name)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'teacher', '佐藤 先生');
--
-- INSERT INTO public.staff_assignments (staff_id, scope_type, department)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'department', '救急救命士学科');
--
-- admin は担当割当なしで全学生を閲覧できる。
