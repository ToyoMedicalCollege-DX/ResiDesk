"use client";

import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";
import StudentTable from "@/components/StudentTable";
import { SLUG_DEPT } from "@/lib/types";
import { useStaffData } from "@/lib/staff-data";

export default function DepartmentDetailView({ slug }: { slug: string }) {
  const department = SLUG_DEPT[slug];
  const { students } = useStaffData();

  if (!department) {
    return (
      <div className="p-6 text-sm">
        学科が見つかりません。
        <Link href="/departments" className="ml-2 text-accent">
          戻る
        </Link>
      </div>
    );
  }

  const list = students.filter((s) => s.department === department);

  return (
    <div className="space-y-4 p-4 xl:p-6">
      <div>
        <p className="text-xs text-t3">
          <Link href="/departments" className="hover:text-accent">
            学科別
          </Link>
          <span className="mx-1">/</span>
          {department}
        </p>
        <h1 className="mt-1 text-xl font-bold text-t1">{department}</h1>
      </div>
      <Disclaimer compact />
      <StudentTable students={list} presetDepartment={department} hideDepartmentFilter />
    </div>
  );
}
