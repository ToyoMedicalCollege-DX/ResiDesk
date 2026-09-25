import Link from "next/link";
import AlertBadge from "@/components/AlertBadge";
import AlertReasons from "@/components/AlertReasons";
import DeleteStudentButton from "@/components/DeleteStudentButton";
import type { Student } from "@/lib/types";
import { ALERT_LEVEL_HINT } from "@/lib/types";
import { formatLastLogin } from "@/lib/scoring";

export default function StudentHeader({ student }: { student: Student }) {
  return (
    <section className="rounded-2xl border border-stroke bg-white p-4 shadow-card">
      <p className="mb-2 text-xs text-t3">
        <Link href="/students" className="hover:text-accent">
          学生一覧
        </Link>
        <span className="mx-1">/</span>
        <span className="text-t1">{student.name}</span>
      </p>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-t1">{student.name}</h1>
            <AlertBadge level={student.alertLevel} />
            <span className="text-[11px] text-t3">実施状況から自動判定</span>
          </div>
          <p className="mt-1 text-sm text-t2">
            {student.studentId}
            <span className="mx-2 text-stroke">|</span>
            {student.department}
            <span className="mx-2 text-stroke">|</span>
            最終ログイン {formatLastLogin(student.lastLoginAt)}
          </p>
          <p className="mt-1 text-xs text-t3">{ALERT_LEVEL_HINT[student.alertLevel]}</p>
          <div className="mt-3">
            <DeleteStudentButton student={student} />
          </div>
        </div>
        <div className="min-w-[220px] rounded-xl bg-bg px-3 py-2">
          <p className="mb-1 text-[11px] font-semibold text-t3">このフラグの理由</p>
          <AlertReasons reasons={student.alertReasons} />
        </div>
      </div>
    </section>
  );
}
