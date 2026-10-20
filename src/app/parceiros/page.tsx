"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  ExternalLink,
} from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { Filters } from "@/components/Filters";
import { PartnerClientsModal } from "@/components/PartnerClientsModal";
import { ExportPartnersModal } from "@/components/ExportPartnersModal";
import { useFilters } from "@/hooks/useFilters";
import { useDataCache } from "@/context/DataCacheContext";
import { PartnerSortKey, PartnerSummary } from "@/lib/types";
import { intranetUrl } from "@/lib/intranet";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
} from "@/lib/format";

type SortDir = "asc" | "desc";

export default function ParceirosPage() {
  const { filters, setFilters, applied, apply, setPage, queryString } =
    useFilters();
  const { cachedFetch, getCached, refreshFromDb, warm } = useDataCache();
  const [items, setItems] = useState<PartnerSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [sortBy, setSortBy] = useState<PartnerSortKey>("faturamento");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<{
    id: number;
    nome: string;
  } | null>(null);

  const page = applied.page || 1;
  const pageSize = applied.pageSize || 50;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const partnersQuery = useMemo(() => {
    const params = new URLSearchParams(queryString);
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    return params.toString();
  }, [queryString, sortBy, sortDir]);

  const load = useCallback(
    async (force = false) => {
      const key = `partners:${partnersQuery}`;
      if (!force) {
        const hit = getCached<{ items: PartnerSummary[]; total: number }>(key);
        if (hit) {
          setItems(hit.items || []);
          setTotal(hit.total || 0);
          setLoading(false);
          return;
        }
      }
      setLoading(true);
      setError(null);
      try {
        if (force) await refreshFromDb();
        const json = await cachedFetch<{
          items: PartnerSummary[];
          total: number;
        }>(key, `/api/partners?${partnersQuery}`, { force });
        setItems(json.items || []);
        setTotal(json.total || 0);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    },
    [cachedFetch, getCached, refreshFromDb, partnersQuery]
  );

  useEffect(() => {
    if (!warm) return;
    load();
  }, [load, warm]);

  const toggleSort = (key: PartnerSortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir(
        key === "parceiro" ||
          key === "ultimaIndicacao" ||
          key === "ultimaAtivacao"
          ? "asc"
          : "desc"
      );
    }
    if (page !== 1) setPage(1);
  };

  return (
    <>
      <TopBar
        eyebrow="Comercial / Parceiros"
        title="Desempenho por parceiro"
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

        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef2f6] px-5 py-4">
            <div>
              <h3 className="text-base font-semibold text-[#122033]">
                Parceiros no recorte
              </h3>
              <p className="text-sm text-[#6b7280]">
                {formatNumber(total)} parceiros encontrados · página {page} de{" "}
                {totalPages}
              </p>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setExportOpen(true)}
            >
              <Download className="h-4 w-4" />
              Exportar
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f8fafc] text-left text-[11px] uppercase tracking-wide text-[#8b95a5]">
                <tr>
                  <SortableTh
                    label="Parceiro"
                    active={sortBy === "parceiro"}
                    dir={sortDir}
                    onClick={() => toggleSort("parceiro")}
                  />
                  <SortableTh
                    label="Leads ativos"
                    active={sortBy === "leadsAtivos"}
                    dir={sortDir}
                    onClick={() => toggleSort("leadsAtivos")}
                  />
                  <SortableTh
                    label="Clientes ativos"
                    active={sortBy === "clientesAtivos"}
                    dir={sortDir}
                    onClick={() => toggleSort("clientesAtivos")}
                  />
                  <SortableTh
                    label="Conversão"
                    active={sortBy === "taxaConversao"}
                    dir={sortDir}
                    onClick={() => toggleSort("taxaConversao")}
                  />
                  <SortableTh
                    label="Última indicação"
                    active={sortBy === "ultimaIndicacao"}
                    dir={sortDir}
                    onClick={() => toggleSort("ultimaIndicacao")}
                  />
                  <SortableTh
                    label="Última ativação"
                    active={sortBy === "ultimaAtivacao"}
                    dir={sortDir}
                    onClick={() => toggleSort("ultimaAtivacao")}
                  />
                  <SortableTh
                    label="Ativações 3m"
                    active={sortBy === "ativacoes3m"}
                    dir={sortDir}
                    onClick={() => toggleSort("ativacoes3m")}
                  />
                  <SortableTh
                    label="Tempo méd. conv."
                    active={sortBy === "tempoMedioConversaoDias"}
                    dir={sortDir}
                    onClick={() => toggleSort("tempoMedioConversaoDias")}
                  />
                  <SortableTh
                    label="Faturamento"
                    active={sortBy === "faturamento"}
                    dir={sortDir}
                    onClick={() => toggleSort("faturamento")}
                  />
                  <th className="px-5 py-3 font-semibold">Intranet</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr
                    key={p.empresaIndicacaoId}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer border-t border-[#eef2f6] hover:bg-brand/5"
                    onClick={() =>
                      setSelected({
                        id: p.empresaIndicacaoId,
                        nome: p.parceiro,
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelected({
                          id: p.empresaIndicacaoId,
                          nome: p.parceiro,
                        });
                      }
                    }}
                  >
                    <td className="px-5 py-3">
                      <div className="font-medium text-brand">{p.parceiro}</div>
                      <div className="text-xs text-[#6b7280]">
                        ID {p.empresaIndicacaoId}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {formatNumber(p.leadsAtivos)}{" "}
                      <span className="text-[#94a3b8]">
                        / {formatNumber(p.totalLeads)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {formatNumber(p.clientesAtivos)}{" "}
                      <span className="text-[#94a3b8]">
                        / {formatNumber(p.totalClientes)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {formatPercent(p.taxaConversao)}
                    </td>
                    <td className="px-5 py-3">
                      {formatDate(p.ultimaIndicacao)}
                    </td>
                    <td className="px-5 py-3">
                      {formatDate(p.ultimaAtivacao)}
                    </td>
                    <td className="px-5 py-3">{formatNumber(p.ativacoes3m)}</td>
                    <td className="px-5 py-3">
                      {p.tempoMedioConversaoDias != null
                        ? `${formatNumber(p.tempoMedioConversaoDias)} dias`
                        : "—"}
                    </td>
                    <td className="px-5 py-3 font-semibold">
                      {formatCurrency(p.faturamento)}
                    </td>
                    <td className="px-5 py-3">
                      <a
                        href={intranetUrl(p.empresaIndicacaoId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-brand hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Abrir <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
                {!loading && items.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-5 py-10 text-center text-[#94a3b8]"
                    >
                      Nenhum parceiro encontrado.
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
              Página {page} de {totalPages} · 50 por página
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

      <PartnerClientsModal
        partnerId={selected?.id ?? null}
        partnerName={selected?.nome}
        queryString={queryString}
        onClose={() => setSelected(null)}
      />

      <ExportPartnersModal
        open={exportOpen}
        queryString={queryString}
        onClose={() => setExportOpen(false)}
      />
    </>
  );
}

function SortableTh({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <th className="px-5 py-3 font-semibold">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-brand"
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-brand" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-brand" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </th>
  );
}
