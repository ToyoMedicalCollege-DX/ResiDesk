export default function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <p
      className={`rounded-xl border border-stroke bg-white/80 text-t2 ${
        compact ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-xs"
      }`}
    >
      この画面は医療診断・治療判断のツールではありません。学校生活支援や早期の声かけのための
      <span className="font-semibold"> 参考情報 </span>
      です。
    </p>
  );
}
