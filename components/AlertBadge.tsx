import type { AlertLevel } from "@/lib/types";
import { ALERT_LEVEL_HINT, ALERT_LEVEL_LABEL } from "@/lib/types";

const TONE: Record<AlertLevel, string> = {
  none: "bg-[#EEF6F1] text-good",
  notice: "bg-[#FFF8E1] text-[#B45309]",
  watch: "bg-[#FFF4E5] text-caution",
  urgent: "bg-[#FDECEC] text-danger",
};

export default function AlertBadge({ level }: { level: AlertLevel }) {
  return (
    <span
      title={ALERT_LEVEL_HINT[level]}
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[level]}`}
    >
      {ALERT_LEVEL_LABEL[level]}
    </span>
  );
}
