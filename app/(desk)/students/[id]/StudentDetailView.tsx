"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";
import MoodChartCard from "@/components/MoodChartCard";
import SelfCheckCard from "@/components/SelfCheckCard";
import StudentHeader from "@/components/StudentHeader";
import SupportCard from "@/components/SupportCard";
import TrainingCard from "@/components/TrainingCard";
import ConsultCard from "@/components/ConsultCard";
import { useStaffData } from "@/lib/staff-data";

export default function StudentDetailView({ id }: { id: string }) {
  const { getStudent, loadDetail } = useStaffData();
  const [ready, setReady] = useState(false);
  const student = getStudent(id);

  useEffect(() => {
    let cancelled = false;
    void loadDetail(id).finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [id, loadDetail]);

  if (!student && !ready) {
    return <div className="p-6 text-sm text-t3">読み込み中…</div>;
  }

  if (!student) {
    return (
      <div className="p-6 text-sm text-t2">
        学生が見つかりません。担当範囲外か、存在しない ID です。
        <Link href="/students" className="ml-2 text-accent">
          一覧へ戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col gap-3 p-3 xl:gap-3 xl:p-4">
      <Disclaimer compact />
      {student.crisisUnresolved && (
        <p className="rounded-xl border border-danger/30 bg-[#FDECEC] px-4 py-2 text-xs text-danger">
          こころ(PHQ)で危機項目に1点以上ついた記録があります。アプリだけで完結させず、専門窓口への確認を促してください。
        </p>
      )}
      <StudentHeader student={student} />
      <MoodChartCard logs={student.moodLogs} />
      <div className="grid min-h-0 gap-3 lg:grid-cols-2">
        <SelfCheckCard student={student} />
        <TrainingCard student={student} />
      </div>
      <div className="grid min-h-0 gap-3 lg:grid-cols-2">
        <div className="min-h-0 overflow-hidden lg:h-0 lg:min-h-full">
          <ConsultCard messages={student.consultMessages} />
        </div>
        <SupportCard student={student} />
      </div>
    </div>
  );
}
