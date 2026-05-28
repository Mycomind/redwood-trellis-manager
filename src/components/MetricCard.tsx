import { clsx } from "clsx";

type MetricCardProps = {
  label: string;
  value: string;
  tone?: "plain" | "good" | "warn";
  help?: string;
};

export function MetricCard({ label, value, tone = "plain", help }: MetricCardProps) {
  return (
    <div
      className={clsx(
        "rounded-lg border p-4 shadow-soft",
        tone === "plain" && "border-shop bg-white",
        tone === "good" && "border-moss/30 bg-moss/10",
        tone === "warn" && "border-gold/40 bg-gold/10",
      )}
    >
      <div className="text-sm font-semibold uppercase tracking-wide text-barkSoft">
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold text-bark">{value}</div>
      {help ? <div className="mt-1 text-sm text-barkSoft">{help}</div> : null}
    </div>
  );
}
