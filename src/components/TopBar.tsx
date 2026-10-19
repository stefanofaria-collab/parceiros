"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RefreshCw } from "lucide-react";

type TopBarProps = {
  title: string;
  eyebrow?: string;
  onRefresh?: () => void;
  loading?: boolean;
};

export function TopBar({ title, eyebrow, onRefresh, loading }: TopBarProps) {
  const [dbOk, setDbOk] = useState<boolean | null>(null);
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setDbOk(!!d.ok))
      .catch(() => setDbOk(false));
  }, []);

  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#eef2f6] bg-white/80 px-6 py-4 backdrop-blur">
      <div>
        {eyebrow && (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8b95a5]">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-[#122033]">
          {title}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-[#e5eaf0] bg-[#f8fafc] px-3 py-1.5 text-xs">
          <span
            className={`h-2 w-2 rounded-full ${
              dbOk === null
                ? "bg-amber-400"
                : dbOk
                  ? "bg-emerald-500"
                  : "bg-red-500"
            }`}
          />
          <span className="text-[#4b5563]">
            {dbOk === null
              ? "Verificando MySQL…"
              : dbOk
                ? "MySQL conectado"
                : "MySQL indisponível"}
          </span>
        </div>
        <span className="text-xs text-[#6b7280] capitalize">{today}</span>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="btn-secondary"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        )}
      </div>
    </header>
  );
}
