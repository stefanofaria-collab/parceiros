"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Wallet,
  Percent,
  Activity,
  Clock3,
  Flame,
} from "lucide-react";
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
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatMonthLabel,
} from "@/lib/format";

export default function HomePage() {
  const { filters, setFilters, apply, queryString } = useFilters();
  const { cachedFetch, getCached, invalidateClientCache } = useDataCache();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
      try {
        if (force) invalidateClientCache();
        const json = await cachedFetch<DashboardData>(
          key,
          `/api/dashboard?${queryString}`,
          { force }
        );
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    },
    [cachedFetch, getCached, invalidateClientCache, queryString]
  );

  useEffect(() => {
    load();
  }, [load]);

  const evolucaoIndicacoes =
    data?.evolucaoIndicacoes.map((e) => ({
      ...e,
      label: formatMonthLabel(e.mes),
    })) || [];

  const evolucaoAtivacoes =
    data?.evolucaoAtivacoes.map((e) => ({
      ...e,
      label: formatMonthLabel(e.mes),
    })) || [];

  return (
    <>
      <TopBar
        eyebrow="Comercial / Inteligência de parceiros"
        title="Visão geral"
        onRefresh={() => load(true)}
        loading={loading}
      />

      <main className="flex-1 space-y-5 overflow-y-auto p-6">
        <Filters value={filters} onChange={setFilters} onApply={apply} />

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Parceiros"
            value={formatNumber(data?.totalParceiros)}
            hint="Parceiros com indicação no recorte"
            icon={<Users className="h-4 w-4" />}
          />
          <KpiCard
            label="Leads ativos"
            value={formatNumber(data?.leadsAtivos)}
            hint={`Total de leads: ${formatNumber(data?.totalLeads)}`}
            icon={<UserPlus className="h-4 w-4" />}
          />
          <KpiCard
            label="Clientes ativos"
            value={formatNumber(data?.clientesAtivos)}
            hint={`Total clientes: ${formatNumber(data?.totalClientes)}`}
            icon={<Activity className="h-4 w-4" />}
          />
          <KpiCard
            label="Faturamento ativo"
            value={formatCurrency(data?.faturamentoAtivo)}
            hint="Soma dos planos vigentes"
            icon={<Wallet className="h-4 w-4" />}
            accent
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Taxa de conversão"
            value={formatPercent(data?.taxaConversao)}
            hint="Clientes / (leads + clientes)"
            icon={<Percent className="h-4 w-4" />}
          />
          <KpiCard
            label="Taxa de churn"
            value={formatPercent(data?.taxaChurn)}
            hint="Vencidos há 60+ dias"
            icon={<Flame className="h-4 w-4" />}
          />
          <KpiCard
            label="Ativações (3 meses)"
            value={formatNumber(data?.ativacoes3m)}
            hint="Clientes ativados no período"
            icon={<Activity className="h-4 w-4" />}
          />
          <KpiCard
            label="Tempo médio de conversão"
            value={
              data?.tempoMedioConversaoDias != null
                ? `${formatNumber(data.tempoMedioConversaoDias)} dias`
                : "—"
            }
            hint="Do cadastro até a ativação"
            icon={<Clock3 className="h-4 w-4" />}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div className="card p-5">
            <h3 className="mb-1 text-base font-semibold text-[#122033]">
              Evolução de indicações
            </h3>
            <p className="mb-4 text-sm text-[#6b7280]">
              Quantidade de indicações (cadastros) por mês nos últimos 12 meses.
            </p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolucaoIndicacoes}>
                  <defs>
                    <linearGradient id="indFill" x1="0" y1="0" x2="0" y2="1">
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
                    dataKey="quantidade"
                    name="Indicações"
                    stroke="#01636b"
                    fill="url(#indFill)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="mb-1 text-base font-semibold text-[#122033]">
              Evolução de ativações
            </h3>
            <p className="mb-4 text-sm text-[#6b7280]">
              Quantidade de ativações por mês nos últimos 12 meses.
            </p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolucaoAtivacoes}>
                  <defs>
                    <linearGradient id="ativFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#33a7af" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#33a7af" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="quantidade"
                    name="Ativações"
                    stroke="#33a7af"
                    fill="url(#ativFill)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div className="card p-5">
            <h3 className="mb-1 text-base font-semibold text-[#122033]">
              Planos vendidos
            </h3>
            <p className="mb-4 text-sm text-[#6b7280]">
              Distribuição por nome de plano (clientes).
            </p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(data?.planosVendidos || []).slice(0, 8)}
                  margin={{ bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                  <XAxis dataKey="plano" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="quantidade"
                    name="Qtd"
                    fill="#01636b"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="mb-1 text-base font-semibold text-[#122033]">
              Planos por duração
            </h3>
            <p className="mb-4 text-sm text-[#6b7280]">
              Quantidade de planos por duração (clientes).
            </p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.planosPorDuracao || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="quantidade"
                    name="Qtd"
                    fill="#33a7af"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-[#eef2f6] px-5 py-4">
            <h3 className="text-base font-semibold text-[#122033]">
              Top parceiros por faturamento ativo
            </h3>
            <p className="text-sm text-[#6b7280]">
              Conversão, churn e ativações recentes por parceiro.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f8fafc] text-left text-[11px] uppercase tracking-wide text-[#8b95a5]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Parceiro</th>
                  <th className="px-5 py-3 font-semibold">Leads</th>
                  <th className="px-5 py-3 font-semibold">Clientes</th>
                  <th className="px-5 py-3 font-semibold">Conv.</th>
                  <th className="px-5 py-3 font-semibold">Churn</th>
                  <th className="px-5 py-3 font-semibold">Ativ. 3m</th>
                  <th className="px-5 py-3 font-semibold">Faturamento</th>
                </tr>
              </thead>
              <tbody>
                {(data?.topParceiros || []).map((p) => (
                  <tr
                    key={p.empresaIndicacaoId}
                    className="border-t border-[#eef2f6] hover:bg-[#f8fafc]/40"
                  >
                    <td className="px-5 py-3">
                      <div className="font-medium text-[#122033]">
                        {p.parceiro}
                      </div>
                      <div className="text-xs text-[#6b7280]">
                        ID {p.empresaIndicacaoId}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {formatNumber(p.leadsAtivos)}
                      <span className="text-[#94a3b8]">
                        {" "}
                        / {formatNumber(p.totalLeads)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {formatNumber(p.clientesAtivos)}
                      <span className="text-[#94a3b8]">
                        {" "}
                        / {formatNumber(p.totalClientes)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {formatPercent(p.taxaConversao)}
                    </td>
                    <td className="px-5 py-3">{formatPercent(p.taxaChurn)}</td>
                    <td className="px-5 py-3">{formatNumber(p.ativacoes3m)}</td>
                    <td className="px-5 py-3 font-semibold">
                      {formatCurrency(p.faturamento)}
                    </td>
                  </tr>
                ))}
                {!loading && (data?.topParceiros || []).length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-8 text-center text-[#94a3b8]"
                    >
                      Nenhum dado para o filtro selecionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
