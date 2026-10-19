"use client";

import { formatCompactCurrency, formatNumber } from "@/lib/format";
import type { ExpirationDay } from "@/lib/data";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { format, parseISO, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

type Props = {
  mes: string;
  days: ExpirationDay[];
  selectedDate?: string | null;
  onMonthChange?: (mes: string) => void;
  onDayClick?: (day: ExpirationDay) => void;
};

export function ExpirationCalendar({
  mes,
  days,
  selectedDate,
  onMonthChange,
  onDayClick,
}: Props) {
  const [y, m] = mes.split("-").map(Number);
  const firstWeekday = new Date(y, m - 1, 1).getDay();
  const blanks = Array.from({ length: firstWeekday });
  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const monthLabel = format(parseISO(`${mes}-01`), "MMMM 'de' yyyy", {
    locale: ptBR,
  });

  const shiftMonth = (delta: number) => {
    const base = parseISO(`${mes}-01`);
    const next = delta < 0 ? subMonths(base, 1) : addMonths(base, 1);
    onMonthChange?.(format(next, "yyyy-MM"));
  };

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-[#122033]">
          Calendário de vencimentos do mês
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-secondary !px-2"
            onClick={() => shiftMonth(-1)}
            title="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[160px] text-center text-sm font-medium capitalize text-[#122033]">
            {monthLabel}
          </span>
          <button
            type="button"
            className="btn-secondary !px-2"
            onClick={() => shiftMonth(1)}
            title="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-7 gap-2">
        {weekdays.map((w) => (
          <div
            key={w}
            className="text-center text-[11px] font-semibold uppercase tracking-wide text-[#8b95a5]"
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {blanks.map((_, i) => (
          <div key={`b-${i}`} className="min-h-[88px] rounded-lg bg-transparent" />
        ))}
        {days.map((d) => {
          const clickable = d.clientes > 0;
          const selected = selectedDate === d.date;
          return (
            <button
              key={d.date}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onDayClick?.(d)}
              className={clsx(
                "min-h-[88px] rounded-lg border p-2 text-left transition",
                d.status === "future" && "border-blue-200 bg-blue-50/80",
                d.status === "expired" && "border-amber-200 bg-amber-50/80",
                d.status === "churn" && "border-red-200 bg-red-50/80",
                d.status === "empty" && "border-[#eef2f6] bg-[#fafbfd]",
                clickable && "cursor-pointer hover:ring-2 hover:ring-brand/30",
                selected && "ring-2 ring-brand",
                !clickable && "cursor-default opacity-80"
              )}
            >
              <div className="mb-1 text-sm font-semibold text-[#122033]">
                {d.day}
              </div>
              {d.clientes > 0 ? (
                <>
                  <div className="text-xs font-medium text-[#334155]">
                    {formatCompactCurrency(d.valor)}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#64748b]">
                    {formatNumber(d.clientes)} cliente(s)
                  </div>
                </>
              ) : (
                <div className="text-[11px] text-[#cbd5e1]">—</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
