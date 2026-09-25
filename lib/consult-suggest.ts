import type { ConsultSuggestKind, ConsultSuggestion } from "./types";

const LABELS: Record<ConsultSuggestKind, string> = {
  sk1: "トレーニングへ促し：行動活性化",
  sk2: "トレーニングへ促し：認知再構成",
  sk5: "トレーニングへ促し：睡眠",
  support: "サポートセンターへ案内",
};

export function suggestionFromKind(kind: string | null | undefined): ConsultSuggestion | null {
  if (kind !== "sk1" && kind !== "sk2" && kind !== "sk5" && kind !== "support") return null;
  return { kind, label: LABELS[kind] };
}

function kindFromText(text: string): ConsultSuggestKind | null {
  const t = text;
  if (
    /死にたい|消えたい|限界|一人で抱え|相談窓口|サポートセンター|スチューデントサービス|傷つけたい/.test(
      t
    )
  ) {
    return "support";
  }
  if (/睡眠|眠れない|寝つき|朝起きられない|睡眠リズム/.test(t)) return "sk5";
  if (/考えすぎ|自分を責め|認知再構成|ネガティブ|不安が止ま/.test(t)) return "sk2";
  if (
    /行動活性化|動けない|何もしたくない|やる気が出ない|気分が沈|行動するのが苦手|だるい|トレーニング/.test(
      t
    )
  ) {
    return "sk1";
  }
  return null;
}

export function suggestionFromContent(content: string): ConsultSuggestion | null {
  return suggestionFromKind(kindFromText(content));
}

/** 学生の発言とAI返信から、誘導（トレーニング／窓口）を推定する */
export function suggestionFromExchange(
  userContent: string | undefined,
  assistantContent: string | undefined
): ConsultSuggestion | null {
  const fromUser = kindFromText(userContent ?? "");
  if (fromUser === "support") return suggestionFromKind("support");
  const fromAssistant = kindFromText(assistantContent ?? "");
  if (fromAssistant === "support") return suggestionFromKind("support");
  return suggestionFromKind(fromUser ?? fromAssistant);
}

export function suggestKindFromProps(props: Record<string, unknown> | string | null | undefined): string {
  if (!props) return "";
  const obj = typeof props === "string" ? safeParse(props) : props;
  if (!obj || typeof obj !== "object") return "";
  const nested = obj.props;
  if (nested && typeof nested === "object" && nested !== null && "suggest" in nested) {
    return String((nested as { suggest?: unknown }).suggest ?? "");
  }
  return String(obj.suggest ?? "");
}

function safeParse(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
