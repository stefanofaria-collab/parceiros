import { ReactNode } from "react";
import clsx from "clsx";

type KpiCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  accent?: boolean;
};

export function KpiCard({ label, value, hint, icon, accent }: KpiCardProps) {
  return (
    <div
      className={clsx(
        "card relative overflow-hidden p-5",
        accent && "bg-brand text-white border-brand"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={clsx(
            "text-xs font-medium uppercase tracking-wide",
            accent ? "text-white/70" : "text-[#6b7280]"
          )}
        >
          {label}
        </p>
        {icon && (
          <div
            className={clsx(
              "rounded-lg p-2",
              accent ? "bg-white/15" : "bg-brand/10 text-brand"
            )}
          >
            {icon}
          </div>
        )}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      {hint && (
        <p
          className={clsx(
            "mt-1 text-xs",
            accent ? "text-white/70" : "text-[#8b95a5]"
          )}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
