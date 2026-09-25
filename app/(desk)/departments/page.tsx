"use client";

import Link from "next/link";
import DoLinks from "@/components/DoLinks";
import { ALERT_LEVEL_LABEL, DEPARTMENTS, DEPT_SLUG } from "@/lib/types";
import { useStaffData } from "@/lib/staff-data";
import { isFlagged } from "@/lib/alerts";
import { totalScoreFromStudent } from "@/lib/scoring";

export default function DepartmentsPage() {
  const { students } = useStaffData();

  return (
    <div className="space-y-4 p-4 xl:p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-t1">学科別</h1>
          <p className="text-sm text-t3">学科ごとの人数と注意フラグの概況</p>
        </div>
        <DoLinks />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {DEPARTMENTS.map((dept) => {
          const list = students.filter((s) => s.department === dept);
          const flagged = list.filter(isFlagged);
          const urgent = list.filter((s) => s.alertLevel === "urgent").length;
          const watch = list.filter((s) => s.alertLevel === "watch").length;
          const notice = list.filter((s) => s.alertLevel === "notice").length;
          const scores = list
            .map(totalScoreFromStudent)
            .filter((n): n is number => n != null);
          const avg =
            scores.length > 0
              ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
              : null;
          return (
            <Link
              key={dept}
              href={`/departments/${DEPT_SLUG[dept]}`}
              className="rounded-2xl border border-stroke bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-accent"
            >
              <h2 className="text-lg font-bold text-t1">{dept}</h2>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold text-t1">{list.length}</p>
                  <p className="text-xs text-t3">在籍</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-caution">{flagged.length}</p>
                  <p className="text-xs text-t3">フラグあり</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-t1">{avg ?? "—"}</p>
                  <p className="text-xs text-t3">平均総合</p>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-t3">
                {ALERT_LEVEL_LABEL.urgent} {urgent} · {ALERT_LEVEL_LABEL.watch} {watch} · {ALERT_LEVEL_LABEL.notice} {notice}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
