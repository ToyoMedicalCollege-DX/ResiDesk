"use client";

import DoLinks from "@/components/DoLinks";
import StudentTable from "@/components/StudentTable";
import { useStaffData } from "@/lib/staff-data";

export default function StudentsPage() {
  const { students, loading, error } = useStaffData();
  return (
    <div className="space-y-4 p-4 xl:p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-t1">学生一覧</h1>
          <p className="text-sm text-t3">
            学校生活支援や早期の声かけのための 参考情報 です。
          </p>
        </div>
        <DoLinks />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {loading && <p className="text-sm text-t3">読み込み中…</p>}
      <StudentTable students={students} />
    </div>
  );
}
