"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import AlertBadge from "@/components/AlertBadge";
import AlertReasons from "@/components/AlertReasons";
import MoodLabel from "@/components/MoodLabel";
import { alertLevelRank } from "@/lib/alerts";
import { ALERT_LEVELS, ALERT_LEVEL_LABEL, DEPARTMENTS, type AlertLevel, type Department, type Student } from "@/lib/types";
import { MOOD_LABEL, latestMood, totalScoreFromStudent } from "@/lib/scoring";

type SortKey = "name" | "studentId" | "department" | "alertLevel" | "reasons" | "mood" | "score";
type SortDir = "asc" | "desc";
type MoodFilter = "all" | "none" | "1" | "2" | "3" | "4" | "5";

const MOOD_FILTERS: { value: MoodFilter; label: string }[] = [
  { value: "all", label: "直近体調（すべて）" },
  { value: "5", label: MOOD_LABEL[5] },
  { value: "4", label: MOOD_LABEL[4] },
  { value: "3", label: MOOD_LABEL[3] },
  { value: "2", label: MOOD_LABEL[2] },
  { value: "1", label: MOOD_LABEL[1] },
  { value: "none", label: "記録なし" },
];

type Props = {
  students: Student[];
  presetDepartment?: Department;
  hideDepartmentFilter?: boolean;
};

function compareNullable(a: number | null, b: number | null, dir: SortDir): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return dir === "asc" ? a - b : b - a;
}

function sortStudents(list: Student[], key: SortKey, dir: SortDir): Student[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    switch (key) {
      case "name":
        return sign * a.name.localeCompare(b.name, "ja");
      case "studentId":
        return sign * a.studentId.localeCompare(b.studentId, "ja", { numeric: true });
      case "department":
        return sign * a.department.localeCompare(b.department, "ja");
      case "alertLevel":
        return sign * (alertLevelRank(a.alertLevel) - alertLevelRank(b.alertLevel));
      case "reasons":
        return sign * (a.alertReasons.length - b.alertReasons.length);
      case "mood":
        return compareNullable(latestMood(a), latestMood(b), dir);
      case "score":
        return compareNullable(totalScoreFromStudent(a), totalScoreFromStudent(b), dir);
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
    <th className="px-3 py-3 font-medium first:px-4 last:px-4">
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

export default function StudentTable({
  students,
  presetDepartment,
  hideDepartmentFilter,
}: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [dept, setDept] = useState<Department | "all">(presetDepartment ?? "all");
  const [level, setLevel] = useState<AlertLevel | "all">("all");
  const [mood, setMood] = useState<MoodFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("alertLevel");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const rows = useMemo(() => {
    const filtered = students.filter((s) => {
      const query = q.trim();
      if (query && !s.name.includes(query) && !s.studentId.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }
      if (dept !== "all" && s.department !== dept) return false;
      if (level !== "all" && s.alertLevel !== level) return false;
      if (mood !== "all") {
        const latest = latestMood(s);
        if (mood === "none") return latest == null;
        return latest === Number(mood);
      }
      return true;
    });
    return sortStudents(filtered, sortKey, sortDir);
  }, [students, q, dept, level, mood, sortKey, sortDir]);

  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "mood" || key === "score" ? "desc" : "asc");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[240px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="氏名・学籍番号で検索"
            className="w-full rounded-xl border border-stroke bg-white py-2 pl-9 pr-3 text-sm outline-none ring-accent/30 focus:ring-2"
          />
        </label>
        {!hideDepartmentFilter && (
          <select
            value={dept}
            onChange={(e) => setDept(e.target.value as Department | "all")}
            className="rounded-xl border border-stroke bg-white px-3 py-2 text-sm"
          >
            <option value="all">すべての学科</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value as AlertLevel | "all")}
          className="rounded-xl border border-stroke bg-white px-3 py-2 text-sm"
        >
          <option value="all">すべての注意フラグ</option>
          {ALERT_LEVELS.map((k) => (
            <option key={k} value={k}>
              {ALERT_LEVEL_LABEL[k]}
            </option>
          ))}
        </select>
        <select
          value={mood}
          onChange={(e) => setMood(e.target.value as MoodFilter)}
          className="rounded-xl border border-stroke bg-white px-3 py-2 text-sm"
        >
          {MOOD_FILTERS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stroke bg-white shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-bg text-xs text-t3">
            <tr>
              <SortHeader label="氏名" column="name" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortHeader label="学籍番号" column="studentId" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortHeader label="学科" column="department" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortHeader label="注意フラグ" column="alertLevel" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortHeader label="理由(注意フラグ)" column="reasons" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortHeader label="直近体調" column="mood" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortHeader label="総合スコア" column="score" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-t3">
                  該当する学生がいません
                </td>
              </tr>
            )}
            {rows.map((s) => {
              const mood = latestMood(s);
              const total = totalScoreFromStudent(s);
              return (
                <tr
                  key={s.id}
                  tabIndex={0}
                  onClick={() => router.push(`/students/${s.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/students/${s.id}`);
                    }
                  }}
                  className="cursor-pointer border-t border-stroke hover:bg-bg/80 focus:bg-accent-lt focus:outline-none"
                >
                  <td className="px-4 py-3 font-semibold text-t1">
                    <Link href={`/students/${s.id}`} className="hover:text-accent">
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-t2">{s.studentId}</td>
                  <td className="px-3 py-3 text-t2">{s.department}</td>
                  <td className="px-3 py-3">
                    <AlertBadge level={s.alertLevel} />
                  </td>
                  <td className="px-3 py-3">
                    <AlertReasons reasons={s.alertReasons} compact />
                  </td>
                  <td className="px-3 py-3">
                    <MoodLabel score={mood} />
                  </td>
                  <td className="px-4 py-3 font-semibold text-t1">{total ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="space-y-1 text-xs text-t3">
        <p>
          {rows.length} 人を表示 · 注意フラグは実施状況から自動判定します · 列名をクリックして並び替え
        </p>
        <p>
          総合スコアは、こころ(PHQ)・やすらぎ(GAD)・ねむり(PSQI)の直近得点を、高いほど調子が良い
          0〜100 に換算し、実施した尺度の平均です。未実施の尺度は含めません。
        </p>
      </div>
    </div>
  );
}
