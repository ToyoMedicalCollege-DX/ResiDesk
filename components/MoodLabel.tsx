import { CloudRain, Frown, Meh, Smile, Sun } from "lucide-react";
import { moodLabel } from "@/lib/scoring";

const MOOD_ICON = {
  5: { Icon: Sun, color: "#FBBF24" },
  4: { Icon: Smile, color: "#10B981" },
  3: { Icon: Meh, color: "#E8895B" },
  2: { Icon: Frown, color: "#FB923C" },
  1: { Icon: CloudRain, color: "#C45C2A" },
} as const;

export default function MoodLabel({ score }: { score: number | null }) {
  if (score == null || !(score in MOOD_ICON)) {
    return <span className="text-t3">—</span>;
  }

  const key = score as 1 | 2 | 3 | 4 | 5;
  const { Icon, color } = MOOD_ICON[key];
  const label = moodLabel(key);

  return (
    <span className="inline-flex items-center gap-1 font-medium text-t1">
      <Icon size={16} color={color} aria-hidden />
      <span>{label}</span>
    </span>
  );
}
