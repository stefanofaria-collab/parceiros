"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { Filters } from "@/components/Filters";
import { PartnerClientsModal } from "@/components/PartnerClientsModal";
import { ExportPartnersModal } from "@/components/ExportPartnersModal";
import { useFilters } from "@/hooks/useFilters";
import { useDataCache } from "@/context/DataCacheContext";
import { PartnerSummary } from "@/lib/types";
import { intranetUrl } from "@/lib/intranet";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/lib/format";

export default function ParceirosPage() {
  const { filters, setFilters, applied, apply, setPage, queryString } =
    useFilters();
  const { cachedFetch, getCached, refreshFromDb, warm } = useDataCache();
  const [items, setItems] = useState<PartnerSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [selected, setSelected] = useState<{
    id: number;
    nome: string;
  } | null>(null);

  const page = applied.page || 1;
  const pageSize = applied.pageSize || 50;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const load = useCallback(
    async (force = false) => {
      const key = `partners:${queryString}`;
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
        }>(key, `/api/partners?${queryString}`, { force });
        setItems(json.items || []);
        setTotal(json.total || 0);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro desconhecido");
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
                  <th className="px-5 py-3 font-semibold">Parceiro</th>
                  <th className="px-5 py-3 font-semibold">Leads ativos</th>
                  <th className="px-5 py-3 font-semibold">Clientes ativos</th>
                  <th className="px-5 py-3 font-semibold">Conversão</th>
                  <th className="px-5 py-3 font-semibold">Churn</th>
                  <th className="px-5 py-3 font-semibold">Ativações 3m</th>
                  <th className="px-5 py-3 font-semibold">Tempo méd. conv.</th>
                  <th className="px-5 py-3 font-semibold">Faturamento</th>
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
                    <td className="px-5 py-3">{formatPercent(p.taxaChurn)}</td>
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
                      colSpan={9}
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
