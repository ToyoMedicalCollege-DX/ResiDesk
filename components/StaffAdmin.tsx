"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { DEPARTMENTS, type Department } from "@/lib/types";
import { STAFF_ROLE_LABEL, STAFF_ROLES, toAssignableRole, type StaffRole } from "@/lib/staff";

type SortKey = "name" | "loginId" | "role";
type SortDir = "asc" | "desc";

type StaffRow = {
  id: string;
  loginId: string;
  displayName: string;
  role: StaffRole;
  roleLabel: string;
  departments: Department[];
};

function DeptChecks({
  value,
  onChange,
}: {
  value: Department[];
  onChange: (next: Department[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {DEPARTMENTS.map((dept) => {
        const checked = value.includes(dept);
        return (
          <label key={dept} className="flex items-center gap-1.5 text-xs text-t2">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => {
                onChange(checked ? value.filter((d) => d !== dept) : [...value, dept]);
              }}
            />
            {dept.replace("学科", "")}
          </label>
        );
      })}
    </div>
  );
}

function roleRank(role: StaffRole): number {
  return role === "admin" ? 1 : 0;
}

function sortStaff(list: StaffRow[], key: SortKey, dir: SortDir): StaffRow[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    switch (key) {
      case "name":
        return sign * a.displayName.localeCompare(b.displayName, "ja");
      case "loginId":
        return sign * a.loginId.localeCompare(b.loginId, "ja", { numeric: true });
      case "role": {
        const byRole = roleRank(a.role) - roleRank(b.role);
        if (byRole !== 0) return sign * byRole;
        return sign * a.roleLabel.localeCompare(b.roleLabel, "ja");
      }
      default:
        return 0;
    }
  });
}

function SortHeader({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  column: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = sortKey === column;
  return (
    <th className="px-3 py-2 font-medium">
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex items-center gap-0.5 hover:text-t1 ${active ? "text-t1" : ""}`}
      >
        {label}
        {active ? (
          sortDir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
        ) : (
          <ChevronDown size={14} className="opacity-30" aria-hidden />
        )}
      </button>
    </th>
  );
}

export default function StaffAdmin({ selfId }: { selfId: string }) {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [loginId, setLoginId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<StaffRole>("teacher");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<StaffRole>("teacher");
  const [editDepts, setEditDepts] = useState<Department[]>([]);
  const [editPassword, setEditPassword] = useState("");
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const visibleRows = useMemo(() => {
    const query = q.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (!query) return true;
      const hay = [row.displayName, row.loginId, row.roleLabel, ...row.departments]
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
    return sortStaff(filtered, sortKey, sortDir);
  }, [rows, q, sortKey, sortDir]);

  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/staff", { cache: "no-store" });
      const json = (await res.json()) as { staff?: StaffRow[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "教員一覧の取得に失敗しました");
      setRows(json.staff ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "教員一覧の取得に失敗しました");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = (row: StaffRow) => {
    setEditingId(row.id);
    setEditName(row.displayName);
    setEditRole(toAssignableRole(row.role));
    setEditDepts(row.departments);
    setEditPassword("");
    setNotice(null);
  };

  const createStaff = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, displayName, role, departments }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "登録に失敗しました");
      setLoginId("");
      setDisplayName("");
      setRole("teacher");
      setDepartments([]);
      setNotice("教員を登録しました。初期パスワードは 0000 です。初回ログインで変更させます。");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "登録に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: editName,
          role: editRole,
          departments: editDepts,
          password: editPassword || undefined,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "更新に失敗しました");
      setEditingId(null);
      setNotice("権限を更新しました");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const removeStaff = async (row: StaffRow) => {
    if (!window.confirm(`${row.displayName}（社員番号: ${row.loginId || "不明"}）を削除しますか？`)) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/staff/${row.id}`, { method: "DELETE" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "削除に失敗しました");
      setNotice("教員を削除しました");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-stroke bg-white p-5 shadow-card">
      <h2 className="text-sm font-bold text-t1">教員ユーザー</h2>

      <form
        className="mt-4 grid gap-3 rounded-xl bg-bg p-3 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void createStaff();
        }}
      >
        <label className="text-xs text-t3">
          社員番号
          <input
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            placeholder="例: 12345"
            className="mt-1 w-full rounded-xl border border-stroke bg-white px-3 py-2 text-sm text-t1 outline-none ring-accent/30 focus:ring-2"
          />
        </label>
        <label className="text-xs text-t3">
          名前
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="例: 東洋　太郎"
            className="mt-1 w-full rounded-xl border border-stroke bg-white px-3 py-2 text-sm text-t1 outline-none ring-accent/30 focus:ring-2"
          />
        </label>
        <label className="text-xs text-t3">
          ロール
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as StaffRole)}
            className="mt-1 w-full rounded-xl border border-stroke bg-white px-3 py-2 text-sm text-t1"
          >
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {STAFF_ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
        <div className="md:col-span-2">
          <p className="mb-1 text-xs text-t3">担当学科{role === "admin" ? "（管理者は未選択でも全学科を閲覧）" : "（学科教員は必須）"}</p>
          <DeptChecks value={departments} onChange={setDepartments} />
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            教員を登録
          </button>
        </div>
      </form>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      {notice && <p className="mt-3 text-sm text-good">{notice}</p>}
      {loading && <p className="mt-3 text-sm text-t3">読み込み中…</p>}

      <label className="relative mt-4 block">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="名前・社員番号・権限で検索"
          className="w-full rounded-xl border border-stroke bg-white py-2 pl-9 pr-3 text-sm outline-none ring-accent/30 focus:ring-2"
        />
      </label>
      {!loading && (
        <p className="mt-2 text-[11px] text-t3">
          {q.trim() ? `${visibleRows.length} / ${rows.length} 件` : `${rows.length} 件`}
        </p>
      )}

      <div className="mt-3 overflow-hidden rounded-xl border border-stroke">
        <table className="w-full text-left text-sm">
          <thead className="bg-bg text-xs text-t3">
            <tr>
              <SortHeader label="名前" column="name" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortHeader label="社員番号" column="loginId" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortHeader label="権限" column="role" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <th className="px-3 py-2 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-sm text-t3">
                  {q.trim() ? "該当する教員はいません" : "登録された教員はいません"}
                </td>
              </tr>
            )}
            {visibleRows.map((row) => {
              const editing = editingId === row.id;
              return (
                <tr key={row.id} className="border-t border-stroke align-top">
                  <td className="px-3 py-3">
                    {editing ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded-lg border border-stroke px-2 py-1 text-sm"
                      />
                    ) : (
                      <span className="font-medium text-t1">{row.displayName}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-t2">{row.loginId || "—"}</td>
                  <td className="px-3 py-3">
                    {editing ? (
                      <div className="space-y-2">
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as StaffRole)}
                          className="w-full rounded-lg border border-stroke px-2 py-1 text-sm"
                        >
                          {STAFF_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {STAFF_ROLE_LABEL[r]}
                            </option>
                          ))}
                        </select>
                        <DeptChecks value={editDepts} onChange={setEditDepts} />
                        <input
                          type="password"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="パスワードを変更する場合のみ"
                          className="w-full rounded-lg border border-stroke px-2 py-1 text-xs"
                        />
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium text-t1">{row.roleLabel}</p>
                        <p className="mt-0.5 text-[11px] text-t3">
                          {row.role === "admin"
                            ? "全学科"
                            : row.departments.length
                              ? row.departments.join("、")
                              : "未割当"}
                        </p>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {editing ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void saveEdit(row.id)}
                          className="rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-white"
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-lg border border-stroke px-2.5 py-1 text-xs text-t2"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          className="rounded-lg border border-stroke px-2.5 py-1 text-xs font-semibold text-t1"
                        >
                          権限を変更
                        </button>
                        {row.id !== selfId && (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void removeStaff(row)}
                            className="rounded-lg border border-stroke px-2.5 py-1 text-xs text-danger"
                          >
                            削除
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
