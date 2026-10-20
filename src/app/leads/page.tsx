"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { TopBar } from "@/components/TopBar";
import { Filters } from "@/components/Filters";
import { KpiCard } from "@/components/KpiCard";
import { useFilters } from "@/hooks/useFilters";
import { useDataCache } from "@/context/DataCacheContext";
import { DashboardData } from "@/lib/types";
import { formatMonthLabel, formatNumber } from "@/lib/format";
import { UserPlus, Activity } from "lucide-react";

export default function LeadsPage() {
  const { filters, setFilters, apply, queryString } = useFilters();
  const { cachedFetch, getCached, refreshFromDb, warm } = useDataCache();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (force = false) => {
      const key = `dashboard:${queryString}`;
      if (!force) {
        const hit = getCached<DashboardData>(key);
        if (hit) {
          setData(hit);
          setLoading(false);
          return;
        }
      }
      setLoading(true);
      try {
        if (force) await refreshFromDb();
        const json = await cachedFetch<DashboardData>(
          key,
          `/api/dashboard?${queryString}`,
          { force }
        );
        setData(json);
      } finally {
        setLoading(false);
      }
    },
    [cachedFetch, getCached, refreshFromDb, queryString]
  );

  useEffect(() => {
    if (!warm) return;
    load();
  }, [load, warm]);

  const evolucao =
    data?.evolucaoLeads.map((e) => ({
      ...e,
      label: formatMonthLabel(e.mes),
    })) || [];

  return (
    <>
      <TopBar
        eyebrow="Comercial / Leads"
        title="Leads ativos"
        onRefresh={() => load(true)}
        loading={loading}
      />
      <main className="flex-1 space-y-5 overflow-y-auto p-6">
        <div className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-brand-700">
          Regra: leads ativos = plano <strong>Teste</strong> com data de
          vencimento ≥ hoje.
        </div>

        <Filters value={filters} onChange={setFilters} onApply={apply} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <KpiCard
            label="Leads ativos hoje"
            value={formatNumber(data?.leadsAtivos)}
            icon={<UserPlus className="h-4 w-4" />}
            accent
          />
          <KpiCard
            label="Total de leads no recorte"
            value={formatNumber(data?.totalLeads)}
            icon={<Activity className="h-4 w-4" />}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div className="card p-5">
            <h3 className="mb-1 text-base font-semibold">Evolução acumulada</h3>
            <p className="mb-4 text-sm text-[#6b7280]">
              Estoque de leads ativos por mês de cadastro.
            </p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolucao}>
                  <defs>
                    <linearGradient id="lead2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#01636b" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#01636b" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="ativos"
                    name="Ativos acum."
                    stroke="#01636b"
                    fill="url(#lead2)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="mb-1 text-base font-semibold">Novos leads por mês</h3>
            <p className="mb-4 text-sm text-[#6b7280]">
              Quantidade de leads (Teste) cadastrados em cada mês.
            </p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evolucao}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="novos" name="Novos" fill="#33a7af" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-[#eef2f6] px-5 py-4">
            <h3 className="text-base font-semibold">Leads ativos por parceiro</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f8fafc] text-left text-[11px] uppercase tracking-wide text-[#8b95a5]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Parceiro</th>
                  <th className="px-5 py-3 font-semibold">Leads ativos</th>
                  <th className="px-5 py-3 font-semibold">Total leads</th>
                  <th className="px-5 py-3 font-semibold">Clientes ativos</th>
                </tr>
              </thead>
              <tbody>
                {(data?.topParceiros || [])
                  .filter((p) => p.leadsAtivos > 0 || p.totalLeads > 0)
                  .sort((a, b) => b.leadsAtivos - a.leadsAtivos)
                  .map((p) => (
                    <tr
                      key={p.empresaIndicacaoId}
                      className="border-t border-[#eef2f6]"
                    >
                      <td className="px-5 py-3">
                        <div className="font-medium">{p.parceiro}</div>
                        <div className="text-xs text-[#6b7280]">
                          ID {p.empresaIndicacaoId}
                        </div>
                      </td>
                      <td className="px-5 py-3 font-semibold text-brand">
                        {formatNumber(p.leadsAtivos)}
                      </td>
                      <td className="px-5 py-3">{formatNumber(p.totalLeads)}</td>
                      <td className="px-5 py-3">
                        {formatNumber(p.clientesAtivos)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
