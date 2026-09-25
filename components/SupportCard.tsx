import { Building2, Home, MessageCircle, Phone } from "lucide-react";
import type { Student } from "@/lib/types";

export default function SupportCard({ student }: { student: Student }) {
  const items = [
    {
      icon: MessageCircle,
      label: "体調相談チャット利用",
      period: "今週",
      value: student.consultThisWeek,
    },
    {
      icon: Building2,
      label: "スチューデントサービスセンター",
      period: "今月",
      value: student.supportClicks.ssc,
    },
    {
      icon: Phone,
      label: "慶生会クリニック（電話）",
      period: "今月",
      value: student.supportClicks.clinic,
    },
    {
      icon: Home,
      label: "寮生活に関すること（電話）",
      period: "今月",
      value: student.supportClicks.dorm,
    },
  ];

  return (
    <section className="flex h-full flex-col rounded-2xl border border-stroke bg-white p-4 shadow-card">
      <h2 className="text-sm font-bold text-t1">サポート利用</h2>
      <p className="mb-3 text-[11px] text-t3">
        SSCはスマホ予約・HP予約・電話予約のクリック合計です。クリニックと寮は電話リンクのクリック数です。
      </p>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-xl bg-bg px-3 py-3">
              <div className="mb-2 flex items-center gap-1.5 text-t3">
                <Icon size={14} />
                <span className="text-[10px]">{item.period}</span>
              </div>
              <p className="text-[11px] leading-snug text-t2">{item.label}</p>
              <p className="mt-1 text-lg font-bold text-t1">
                {item.value}
                <span className="ml-0.5 text-xs font-medium text-t3">回</span>
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
