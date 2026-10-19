import { format, differenceInCalendarDays, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  const str = String(value).slice(0, 19).replace(" ", "T");
  const d = parseISO(str.length === 10 ? `${str}T00:00:00` : str);
  return isValid(d) ? d : null;
}

export function formatCurrency(value: number | null | undefined): string {
  const n = Number(value || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatCompactCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    })} mi`;
  }
  if (abs >= 1_000) {
    return `R$ ${(value / 1_000).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    })} mil`;
  }
  return formatCurrency(value);
}

export function formatNumber(value: number | null | undefined): string {
  return Number(value || 0).toLocaleString("pt-BR");
}

export function formatPercent(value: number | null | undefined): string {
  return `${Number(value || 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })}%`;
}

export function formatDate(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";
  return format(d, "dd/MM/yyyy");
}

export function formatMonthLabel(yyyyMm: string): string {
  const d = parseISO(`${yyyyMm}-01`);
  if (!isValid(d)) return yyyyMm;
  return format(d, "MMM/yy", { locale: ptBR });
}

export function daysUntil(value: string | Date | null | undefined, today = new Date()): number | null {
  const d = toDate(value);
  if (!d) return null;
  return differenceInCalendarDays(d, today);
}

export function yearsBetween(from: string | Date | null | undefined, to = new Date()): number | null {
  const d = toDate(from);
  if (!d) return null;
  const days = differenceInCalendarDays(to, d);
  return Math.round((days / 365.25) * 10) / 10;
}

export function durationLabel(duracao: string): string {
  if (duracao === "A") return "Anual";
  if (duracao === "M") return "Mensal";
  if (duracao === "S") return "Semestral";
  if (duracao === "T") return "Trimestral";
  return duracao || "—";
}

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function currentMonth(): string {
  return format(new Date(), "yyyy-MM");
}
