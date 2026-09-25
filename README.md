# ResiDesk（教員ダッシュボード）

学生アプリ ResiApp と **同じ Supabase** を読む、教員向け見守り画面です。医療診断ツールではありません。

## 起動

```bash
cp .env.example .env.local   # 学生アプリと同じ値を入れる
npm install
npm run dev
```

ブラウザ: http://localhost:3000（または 3001）

ログインは社員番号（`@` なしで可）。内部では `{社員番号}@staff.resiapp.jp` に写像する。
仮アカウント: 社員番号 `00000` / パスワード `00000`

## 環境変数

| 変数 | 場所 | 用途 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 公開可 | 同一プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 公開可 | anon。RLS が効く |
| `SUPABASE_SERVICE_ROLE_KEY` | **サーバーのみ** | 原則使わない。将来の管理処理用 |
| `PROFILE_NAME_ENCRYPTION_KEY` | **サーバーのみ** | `enc:v1:` 氏名の AES-256-GCM 復号。学生アプリと同一鍵 |

`NEXT_PUBLIC_` を service_role / 氏名鍵に付けないこと。

## DB 適用

`supabase/migrations/20260924_residesk_staff.sql` を Supabase SQL Editor で実行する（学生リポジトリ側にも同名ファイルを置いてある）。
教員の初期パスワード `0000` を使う場合は `20260924_staff_initial_password.sql` も実行する。

内容:

- `staff_profiles` / `staff_assignments` / `staff_student_flags` / `staff_student_notes` / `staff_audit_logs`
- `is_staff()` / `staff_role()` / `can_view_student(uuid)`（SECURITY DEFINER）
- 学生テーブルへの教員 SELECT ポリシー（本人ポリシーは残す）
- 教員サインアップ時は学生 `profiles` を作らないよう `handle_new_user` を分岐

### 教員アカウントの作り方

1. Supabase Authentication でメール＋パスワードのユーザーを作る  
2. SQL:

```sql
INSERT INTO public.staff_profiles (id, role, display_name)
VALUES ('<Auth の User UID>', 'teacher', '佐藤 先生');

INSERT INTO public.staff_assignments (staff_id, scope_type, department)
VALUES ('<同じ UID>', 'department', '救急救命士学科');
```

`admin`（管理者）は担当割当なしで全学生を見られ、教員の登録・削除・権限変更ができる。`teacher`（学科教員）は担当学科の学生だけを閲覧できる。

学生アカウント（`@students.resiapp.jp`）ではログインしても弾かれる。

## セキュリティ

- 氏名復号は Route Handler（`app/api/*`）だけ。暗号文をそのまま画面に出さない
- 相談本文は担当範囲の教員のみ SELECT。学生向けテーブルへ教員の INSERT は付けていない
- 学生詳細を開くと `staff_audit_logs` に `view_detail` を残す
- メモは学生アプリに出ない。注意フラグ（なし / 注意 / 要観察 / 緊急）は実施状況から自動判定する

## マイルストーン

| フェーズ | 内容 | 状態 |
|----------|------|------|
| P0 | 教員 Auth・RLS・学生一覧 | 実装済み |
| P1 | 学生個人詳細（実データ・氏名復号） | 実装済み |
| P2 | 注意フラグ・メモ・教員ユーザー管理 | 実装済み |
| P3 | 詳細閲覧の監査ログ | 実装済み（閲覧記録）。管理画面の閲覧 UI は未 |

## やらないこと

- ブラウザから service_role
- 診断の断定表示
- 学生アプリの破壊的変更（共有 DB への教員マイグレーション追加のみ）
