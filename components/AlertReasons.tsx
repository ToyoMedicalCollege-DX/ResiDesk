import type { AlertReason } from "@/lib/types";

export default function AlertReasons({
  reasons,
  compact = false,
}: {
  reasons: AlertReason[];
  compact?: boolean;
}) {
  if (reasons.length === 0) {
    return <span className="text-t3">{compact ? "—" : "該当する理由はありません"}</span>;
  }

  return (
    <ul className={compact ? "space-y-0.5" : "space-y-1"}>
      {reasons.map((reason) => (
        <li key={reason.id} className={compact ? "text-[11px] leading-snug text-t2" : "text-xs leading-snug text-t2"}>
          <span className="font-semibold text-t1">{reason.label}</span>
          <span className="text-t3">：{reason.detail}</span>
        </li>
      ))}
    </ul>
  );
}
