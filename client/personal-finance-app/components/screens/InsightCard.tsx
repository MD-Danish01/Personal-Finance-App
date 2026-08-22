import { Icon } from "../ui/Icon";

interface InsightCardProps {
  text: string;
  tone?: "positive" | "warning" | "info";
  variant?: "block" | "row";
  title?: string;
}

const TONE_CLASSES: Record<NonNullable<InsightCardProps["tone"]>, string> = {
  positive: "bg-brand-green-soft text-foreground",
  warning: "bg-brand-orange-soft text-foreground",
  info: "bg-brand-blue-soft text-foreground",
};

export function InsightCard({
  text,
  tone = "info",
  variant = "block",
  title,
}: InsightCardProps) {
  const toneClass = TONE_CLASSES[tone];

  if (variant === "row") {
    return (
      <div
        className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${toneClass}`}
      >
        <p className="flex-1 text-sm leading-snug">
          {text}
        </p>
        <Icon name="chevron-right" size={18} className="opacity-70" />
      </div>
    );
  }

  return (
    <div className={`rounded-2xl px-4 py-3 ${toneClass}`}>
      {title && (
        <div className="text-sm font-semibold mb-0.5">{title}</div>
      )}
      <p className="text-sm leading-snug">{text}</p>
    </div>
  );
}
