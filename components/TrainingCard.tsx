import type { Student } from "@/lib/types";
import { SKILLS } from "@/lib/types";

export default function TrainingCard({ student }: { student: Student }) {
  const totalDone = SKILLS.reduce((sum, s) => sum + student.lessonCompleted[s.id], 0);
  const totalAll = SKILLS.reduce((sum, s) => sum + s.total, 0);

  return (
    <section className="flex h-full flex-col rounded-2xl border border-stroke bg-white p-4 shadow-card">
      <h2 className="text-sm font-bold text-t1">トレーニング</h2>
      <p className="mb-3 text-[11px] text-t3">5スキルの完了レッスン数</p>
      <div className="space-y-2.5">
        {SKILLS.map((skill) => {
          const done = student.lessonCompleted[skill.id];
          const pct = Math.round((done / skill.total) * 100);
          return (
            <div key={skill.id}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <p className="text-xs font-semibold text-t1">
                  {skill.name}
                  <span className="ml-1 font-normal text-t3">（{skill.shortName}）</span>
                </p>
                <p className="text-[11px] text-t2">
                  {done}/{skill.total}
                </p>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-stroke">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: skill.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2 pt-3 text-center">
        <div className="rounded-xl bg-bg px-2 py-2">
          <p className="text-[10px] text-t3">合計完了レッスン</p>
          <p className="text-sm font-bold text-t1">
            {totalDone}
            <span className="text-xs font-medium text-t3"> / {totalAll}</span>
          </p>
        </div>
        <div className="rounded-xl bg-bg px-2 py-2">
          <p className="text-[10px] text-t3">連続記録（日）</p>
          <p className="text-sm font-bold text-t1">{student.streakDays}日</p>
        </div>
      </div>
    </section>
  );
}
