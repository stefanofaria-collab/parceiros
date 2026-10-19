"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { Info, Eye, ExternalLink, X } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { Filters } from "@/components/Filters";
import { KpiCard } from "@/components/KpiCard";
import { ExpirationCalendar } from "@/components/ExpirationCalendar";
import { StatusBadge } from "@/components/StatusBadge";
import { useFilters } from "@/hooks/useFilters";
import { useDataCache } from "@/context/DataCacheContext";
import type { ExpirationDay, ExpirationListItem, ExpirationsData } from "@/lib/data";
import { intranetUrl } from "@/lib/intranet";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  durationLabel,
  currentMonth,
} from "@/lib/format";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const PIE_COLORS = [
  "#01636b",
  "#33a7af",
  "#0ea5e9",
  "#6366f1",
  "#f59e0b",
  "#ef4444",
  "#10b981",
  "#8b5cf6",
  "#64748b",
  "#ec4899",
];

export default function VencimentosPage() {
  const { filters, setFilters, applied, apply, setPage, setMonth, queryString } =
    useFilters();
  const { cachedFetch, getCached, invalidateClientCache } = useDataCache();
  const [data, setData] = useState<ExpirationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const load = useCallback(
    async (force = false) => {
      const key = `expirations:${queryString}`;
      if (!force) {
        const hit = getCached<ExpirationsData>(key);
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
        const json = await cachedFetch<ExpirationsData>(
          key,
          `/api/expirations?${queryString}`,
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

  useEffect(() => {
    setSelectedDay(null);
  }, [applied.mes]);

  const page = applied.page || 1;
  const pageSize = applied.pageSize || 50;
  const totalPages = data
    ? Math.max(1, Math.ceil(data.totalLista / pageSize))
    : 1;

  const dayRows = useMemo(() => {
    if (!selectedDay || !data?.todosDoMes) return [];
    return data.todosDoMes.filter((r) => r.dataVencimento === selectedDay);
  }, [selectedDay, data]);

  const dayLabel = selectedDay
    ? format(parseISO(selectedDay), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : "";

  const handleMonthChange = (mes: string) => {
    setMonth(mes);
  };

  const handleDayClick = (day: ExpirationDay) => {
    setSelectedDay(day.date);
  };

  return (
    <>
      <TopBar
        eyebrow="Comercial / Vencimentos"
        title="Vencimentos futuros"
        onRefresh={() => load(true)}
        loading={loading}
      />

      <main className="flex-1 space-y-5 overflow-y-auto p-6">
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <span className="mr-4 inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            Azul: vencimentos futuros
          </span>
          <span className="mr-4 inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            Laranja: já vencidos
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            Vermelho: churn (60+ dias)
          </span>
        </div>

        <Filters
          value={filters}
          onChange={setFilters}
          onApply={apply}
          showMonth
        />

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            label="Valor que vence no período"
            value={formatCurrency(data?.kpis.valorPeriodo)}
            icon={<Info className="h-4 w-4" />}
          />
          <KpiCard
            label="Clientes com vencimento"
            value={formatNumber(data?.kpis.clientesVencimento)}
          />
          <KpiCard
            label="Ticket médio do vencimento"
            value={formatCurrency(data?.kpis.ticketMedio)}
          />
          <KpiCard
            label="Já em churn"
            value={formatNumber(data?.kpis.jaEmChurn)}
          />
          <KpiCard
            label="Na primeira renovação"
            value={formatNumber(data?.kpis.primeiraRenovacao)}
            accent
          />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <ExpirationCalendar
              mes={data?.mes || filters.mes || currentMonth()}
              days={data?.calendar || []}
              selectedDate={selectedDay}
              onMonthChange={handleMonthChange}
              onDayClick={handleDayClick}
            />
          </div>

          <div className="card p-5">
            <h3 className="mb-1 text-base font-semibold text-[#122033]">
              Vencimentos por plano
            </h3>
            <p className="mb-4 text-sm text-[#6b7280]">
              Distribuição dos planos que vencem no mês.
            </p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.porPlano || []}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                  >
                    {(data?.porPlano || []).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {selectedDay && (
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-[#eef2f6] px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-[#122033]">
                  Vencimentos de {dayLabel}
                </h3>
                <p className="text-sm text-[#6b7280]">
                  {formatNumber(dayRows.length)} cliente(s) ·{" "}
                  {formatCurrency(
                    dayRows.reduce((acc, r) => acc + (r.valor || 0), 0)
                  )}
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedDay(null)}
              >
                <X className="h-4 w-4" />
                Fechar
              </button>
            </div>
            <DayTable rows={dayRows} />
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <RankingTable
            title="10 maiores clientes que vencem no período"
            subtitle="Clientes com os planos de maior valor dentro do recorte selecionado."
            rows={data?.topValor || []}
          />
          <RankingTable
            title="10 clientes mais antigos que vencem no período"
            subtitle="Clientes com maior tempo de casa entre os vencimentos do recorte."
            rows={data?.topAntigos || []}
          />
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-[#eef2f6] px-5 py-4">
            <h3 className="text-base font-semibold text-[#122033]">
              10 parceiros com maior volume financeiro no mês
            </h3>
            <p className="text-sm text-[#6b7280]">
              Soma do valor dos planos vencendo no mês selecionado, por parceiro.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f8fafc] text-left text-[11px] uppercase tracking-wide text-[#8b95a5]">
                <tr>
                  <th className="px-5 py-3 font-semibold">#</th>
                  <th className="px-5 py-3 font-semibold">Parceiro</th>
                  <th className="px-5 py-3 font-semibold">Clientes</th>
                  <th className="px-5 py-3 font-semibold">Volume</th>
                </tr>
              </thead>
              <tbody>
                {(data?.topParceiros || []).map((p, idx) => (
                  <tr
                    key={p.empresaIndicacaoId}
                    className="border-t border-[#eef2f6]"
                  >
                    <td className="px-5 py-3 text-[#94a3b8]">{idx + 1}</td>
                    <td className="px-5 py-3">
                      <div className="font-medium">{p.parceiro}</div>
                      <div className="text-xs text-[#6b7280]">
                        ID {p.empresaIndicacaoId}
                      </div>
                    </td>
                    <td className="px-5 py-3">{formatNumber(p.clientes)}</td>
                    <td className="px-5 py-3 font-semibold text-brand">
                      {formatCurrency(p.valor)}
                    </td>
                  </tr>
                ))}
                {!loading && (data?.topParceiros || []).length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-8 text-center text-[#94a3b8]"
                    >
                      Sem dados no mês selecionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-[#eef2f6] px-5 py-4">
            <h3 className="text-base font-semibold text-[#122033]">
              Empresas com vencimento no período selecionado
            </h3>
            <p className="text-sm text-[#6b7280]">
              {formatNumber(data?.totalLista || 0)} registros
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f8fafc] text-left text-[11px] uppercase tracking-wide text-[#8b95a5]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Empresa</th>
                  <th className="px-5 py-3 font-semibold">Parceiro</th>
                  <th className="px-5 py-3 font-semibold">Plano</th>
                  <th className="px-5 py-3 font-semibold">Data vencimento</th>
                  <th className="px-5 py-3 font-semibold">Valor atual</th>
                  <th className="px-5 py-3 font-semibold">Duração</th>
                  <th className="px-5 py-3 font-semibold">Dias p/ venc.</th>
                  <th className="px-5 py-3 font-semibold">Situação</th>
                  <th className="px-5 py-3 font-semibold">Intranet</th>
                </tr>
              </thead>
              <tbody>
                {(data?.lista || []).map((row) => (
                  <tr key={row.empresaId} className="border-t border-[#eef2f6]">
                    <td className="px-5 py-3">
                      <div className="font-medium">
                        {row.empresaNome} ({row.empresaId})
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[#475569]">{row.parceiro}</td>
                    <td className="px-5 py-3">{row.plano}</td>
                    <td className="px-5 py-3">
                      {formatDate(row.dataVencimento)}
                    </td>
                    <td className="px-5 py-3 font-medium">
                      {formatCurrency(row.valor)}
                    </td>
                    <td className="px-5 py-3">{row.duracao}</td>
                    <td className="px-5 py-3">
                      {row.diasParaVencimento ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge situacao={row.situacao} />
                    </td>
                    <td className="px-5 py-3">
                      <a
                        href={intranetUrl(row.empresaId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-brand hover:underline"
                        title="Abrir no intranet"
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                    </td>
                  </tr>
                ))}
                {!loading && (data?.lista || []).length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-5 py-8 text-center text-[#94a3b8]"
                    >
                      Nenhuma empresa com vencimento no período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[#eef2f6] px-5 py-3">
            <button
              type="button"
              className="btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </button>
            <span className="text-xs text-[#6b7280]">
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              className="btn-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Próxima
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

function DayTable({ rows }: { rows: ExpirationListItem[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-[#f8fafc] text-left text-[11px] uppercase tracking-wide text-[#8b95a5]">
          <tr>
            <th className="px-5 py-3 font-semibold">Empresa</th>
            <th className="px-5 py-3 font-semibold">Parceiro</th>
            <th className="px-5 py-3 font-semibold">Plano</th>
            <th className="px-5 py-3 font-semibold">Valor</th>
            <th className="px-5 py-3 font-semibold">Duração</th>
            <th className="px-5 py-3 font-semibold">Situação</th>
            <th className="px-5 py-3 font-semibold">Intranet</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.empresaId} className="border-t border-[#eef2f6]">
              <td className="px-5 py-3 font-medium">#{row.empresaId}</td>
              <td className="px-5 py-3">{row.parceiro}</td>
              <td className="px-5 py-3">{row.plano}</td>
              <td className="px-5 py-3 font-semibold">
                {formatCurrency(row.valor)}
              </td>
              <td className="px-5 py-3">{durationLabel(row.duracao)}</td>
              <td className="px-5 py-3">
                <StatusBadge situacao={row.situacao} />
              </td>
              <td className="px-5 py-3">
                <a
                  href={intranetUrl(row.empresaId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-brand hover:underline"
                >
                  Abrir <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="px-5 py-8 text-center text-[#94a3b8]">
                Sem vencimentos neste dia.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function RankingTable({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: NonNullable<ExpirationsData["topValor"]>;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-[#eef2f6] px-5 py-4">
        <h3 className="text-base font-semibold text-[#122033]">{title}</h3>
        <p className="text-sm text-[#6b7280]">{subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f8fafc] text-left text-[11px] uppercase tracking-wide text-[#8b95a5]">
            <tr>
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 font-semibold">Plano</th>
              <th className="px-4 py-3 font-semibold">Tempo</th>
              <th className="px-4 py-3 font-semibold">Vence em</th>
              <th className="px-4 py-3 font-semibold">Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={`${title}-${r.empresaId}`}
                className="border-t border-[#eef2f6]"
              >
                <td className="px-4 py-3">
                  <div className="font-semibold text-[#122033]">
                    Cliente #{r.empresaId}
                  </div>
                  <div className="text-xs text-[#6b7280]">{r.parceiro}</div>
                </td>
                <td className="px-4 py-3">
                  {r.plano} · {durationLabel(r.duracao)}
                </td>
                <td className="px-4 py-3">
                  {r.tempoAnos != null
                    ? `${r.tempoAnos.toLocaleString("pt-BR", {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })} anos`
                    : "—"}
                </td>
                <td className="px-4 py-3">{formatDate(r.dataVencimento)}</td>
                <td className="px-4 py-3 font-semibold">
                  {formatCurrency(r.valor)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#94a3b8]">
                  Sem registros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
