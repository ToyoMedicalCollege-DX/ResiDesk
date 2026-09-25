import type { CheckAnswerItem, ScaleKey } from "./types";

type ChoiceOption = { label: string; value: number };

type QuestionDef =
  | { id: string; text: string; kind: "choice"; options: ChoiceOption[] }
  | { id: string; text: string; kind: "time" };

const FREQUENCY: ChoiceOption[] = [
  { label: "全くない", value: 0 },
  { label: "数日", value: 1 },
  { label: "半分以上", value: 2 },
  { label: "ほぼ毎日", value: 3 },
];

const QUESTIONS: Record<ScaleKey, QuestionDef[]> = {
  phq: [
    { id: "phq1", kind: "choice", text: "物事に対してほとんど興味がない、または楽しめない", options: FREQUENCY },
    { id: "phq2", kind: "choice", text: "気分が落ち込んでいる、憂うつ、または絶望的な気持ち", options: FREQUENCY },
    { id: "phq3", kind: "choice", text: "眠れない、眠りすぎる", options: FREQUENCY },
    { id: "phq4", kind: "choice", text: "疲れた感じがする、気力がない", options: FREQUENCY },
    { id: "phq5", kind: "choice", text: "食欲がない、または食べすぎる", options: FREQUENCY },
    { id: "phq6", kind: "choice", text: "自分が悪い人間だと感じる、または自分を責める", options: FREQUENCY },
    { id: "phq7", kind: "choice", text: "物事に集中するのが難しい（新聞を読んだり、テレビを見たりするとき）", options: FREQUENCY },
    { id: "phq8", kind: "choice", text: "動いたり、しゃべったりするのが普段よりも遅い。または反対にそわそわして、じっとしていられない", options: FREQUENCY },
    { id: "phq9", kind: "choice", text: "自分を何らかの形で傷つけたいと思う", options: FREQUENCY },
  ],
  gad: [
    { id: "gad1", kind: "choice", text: "緊張感や不安を感じる、または神経が高ぶっている", options: FREQUENCY },
    { id: "gad2", kind: "choice", text: "心配するのをやめることができない、または心配をコントロールできない", options: FREQUENCY },
    { id: "gad3", kind: "choice", text: "いろいろなことについて心配しすぎる", options: FREQUENCY },
    { id: "gad4", kind: "choice", text: "くつろぐのが難しい", options: FREQUENCY },
    { id: "gad5", kind: "choice", text: "じっとしていられないほどそわそわする", options: FREQUENCY },
    { id: "gad6", kind: "choice", text: "イライラしたり、すぐ腹を立てたりする", options: FREQUENCY },
    { id: "gad7", kind: "choice", text: "何か恐ろしいことが起きそうな気がする", options: FREQUENCY },
  ],
  psqi: [
    { id: "psqi1", kind: "time", text: "普段の就寝時刻は何時ですか？" },
    {
      id: "psqi2",
      kind: "choice",
      text: "寝るまでに通常どのくらいかかりますか？",
      options: [
        { label: "15分未満", value: 0 },
        { label: "15〜30分", value: 1 },
        { label: "31〜60分", value: 2 },
        { label: "60分以上", value: 3 },
      ],
    },
    { id: "psqi3", kind: "time", text: "普段の起床時刻は何時ですか？" },
    {
      id: "psqi4",
      kind: "choice",
      text: "実際に眠れている時間は1日どのくらいですか？",
      options: [
        { label: "7時間以上", value: 0 },
        { label: "6〜7時間", value: 1 },
        { label: "5〜6時間", value: 2 },
        { label: "5時間未満", value: 3 },
      ],
    },
    {
      id: "psqi5",
      kind: "choice",
      text: "過去1ヶ月の睡眠の質を全体的に評価してください",
      options: [
        { label: "とても良い", value: 0 },
        { label: "まあ良い", value: 1 },
        { label: "悪い", value: 2 },
        { label: "とても悪い", value: 3 },
      ],
    },
  ],
};

export function formatCheckAnswers(
  scale: ScaleKey,
  rows: {
    question_id: string;
    question_no: number;
    answer_value: number | null;
    answer_text: string | null;
  }[]
): CheckAnswerItem[] {
  const defs = QUESTIONS[scale];
  return [...rows]
    .sort((a, b) => a.question_no - b.question_no)
    .map((row) => {
      const def = defs.find((q) => q.id === row.question_id) ?? defs[row.question_no - 1];
      let answerLabel = "—";
      if (def?.kind === "time") {
        answerLabel = row.answer_text?.trim() || "—";
      } else if (def?.kind === "choice") {
        const hit = def.options.find((o) => o.value === row.answer_value);
        answerLabel = hit?.label ?? (row.answer_value == null ? "—" : String(row.answer_value));
      } else if (row.answer_text) {
        answerLabel = row.answer_text;
      } else if (row.answer_value != null) {
        answerLabel = String(row.answer_value);
      }
      return {
        questionNo: row.question_no,
        questionId: row.question_id,
        text: def?.text ?? row.question_id,
        answerLabel,
        flagged: scale === "phq" && row.question_id === "phq9" && (row.answer_value ?? 0) >= 1,
      };
    });
}
