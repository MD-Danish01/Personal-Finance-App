import { Icon } from "../ui/Icon";

interface InsightCardProps {
  text: string;
  tone?: "positive" | "warning" | "info";
  variant?: "block" | "row";
  title?: string;
}

const TONE_CLASSES: Record<NonNullable<InsightCardProps["tone"]>, { bg: string; icon: string }> = {
  positive: {
    bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300",
    icon: "text-emerald-500",
  },
  warning: {
    bg: "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300",
    icon: "text-amber-500",
  },
  info: {
    bg: "bg-primary-soft border-primary-soft-border text-foreground",
    icon: "text-primary",
  },
};

export function InsightCard({
  text,
  tone = "info",
  variant = "block",
  title,
}: InsightCardProps) {
  const toneMeta = TONE_CLASSES[tone] || TONE_CLASSES.info;

  if (variant === "row") {
    return (
      <div
        className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-colors ${toneMeta.bg}`}
      >
        <span className={`shrink-0 ${toneMeta.icon}`}>
          <Icon name="sparkles" size={17} />
        </span>
        <p className="flex-1 text-xs leading-relaxed font-medium">
          {text}
        </p>
        <Icon name="chevron-right" size={16} className="opacity-60" />
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-4 transition-colors space-y-1.5 ${toneMeta.bg}`}>
      {title && (
        <div className="flex items-center gap-2">
          <span className={`shrink-0 ${toneMeta.icon}`}>
            <Icon name="sparkles" size={16} />
          </span>
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">{title}</h4>
        </div>
      )}
      <p className="text-xs leading-relaxed font-medium text-foreground">{text}</p>
    </div>
  );
}
