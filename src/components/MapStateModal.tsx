"use client";

import { useEffect, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { MapStateDetail } from "@/lib/types";
import {
  durationLabel,
  formatCurrency,
  formatDate,
  formatNumber,
} from "@/lib/format";

type Props = {
  uf: string | null;
  mapQuery: string;
  onClose: () => void;
};

export function MapStateModal({ uf, mapQuery, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<MapStateDetail | null>(null);

  useEffect(() => {
    if (!uf) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setError(null);
    setDetail(null);
    const qs = mapQuery ? `${mapQuery}&uf=${uf}` : `uf=${uf}`;
    fetch(`/api/map/state?${qs}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || "Falha ao carregar");
        setDetail(json as MapStateDetail);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Erro ao carregar")
      )
      .finally(() => setLoading(false));
  }, [uf, mapQuery]);

  if (!uf) return null;

  const isParceiros = detail?.modo === "parceiros";
  const title = detail
    ? `${detail.nome} (${detail.uf})`
    : uf;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#eef2f6] px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[#122033]">{title}</h3>
            <p className="text-sm text-[#6b7280]">
              {loading
                ? "Carregando…"
                : detail
                  ? `${formatNumber(detail.total)} ${
                      isParceiros ? "parceiro(s)" : "cliente(s) ativo(s)"
                    }`
                  : "Detalhe do estado"}
            </p>
          </div>
          <button type="button" className="btn-secondary !px-2" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-auto p-0">
          {error && (
            <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading && (
            <p className="px-5 py-10 text-center text-sm text-[#94a3b8]">
              Buscando registros do estado…
            </p>
          )}

          {!loading && detail && isParceiros && (
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-[#f8fafc] text-left text-[11px] uppercase tracking-wide text-[#8b95a5]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Parceiro</th>
                  <th className="px-5 py-3 font-semibold">Cobrança</th>
                  <th className="px-5 py-3 font-semibold">Indicações</th>
                  <th className="px-5 py-3 font-semibold">Ativações</th>
                  <th className="px-5 py-3 font-semibold">Clientes ativos</th>
                  <th className="px-5 py-3 font-semibold">Contato</th>
                </tr>
              </thead>
              <tbody>
                {detail.parceiros.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-[#94a3b8]"
                    >
                      Nenhum parceiro neste estado com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  detail.parceiros.map((p) => (
                    <tr
                      key={p.empresaIndicacaoId}
                      className="border-t border-[#eef2f6]"
                    >
                      <td className="px-5 py-3 font-medium text-[#122033]">
                        {p.parceiro}
                        <span className="mt-0.5 block text-xs text-[#8b95a5]">
                          ID {p.empresaIndicacaoId}
                        </span>
                      </td>
                      <td className="px-5 py-3">{p.tipoCobranca || "—"}</td>
                      <td className="px-5 py-3">
                        {formatNumber(p.quantidadeIndicacoes)}
                      </td>
                      <td className="px-5 py-3">
                        {formatNumber(p.quantidadeAtivacoes)}
                      </td>
                      <td className="px-5 py-3 font-semibold text-brand">
                        {formatNumber(p.clientesAtivos)}
                      </td>
                      <td className="px-5 py-3 text-xs text-[#475569]">
                        {[p.telefone, p.celular, p.email]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {!loading && detail && !isParceiros && (
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-[#f8fafc] text-left text-[11px] uppercase tracking-wide text-[#8b95a5]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Empresa</th>
                  <th className="px-5 py-3 font-semibold">Parceiro</th>
                  <th className="px-5 py-3 font-semibold">Plano</th>
                  <th className="px-5 py-3 font-semibold">Duração</th>
                  <th className="px-5 py-3 font-semibold">Valor</th>
                  <th className="px-5 py-3 font-semibold">Vencimento</th>
                  <th className="px-5 py-3 font-semibold">Intranet</th>
                </tr>
              </thead>
              <tbody>
                {detail.clientes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-10 text-center text-[#94a3b8]"
                    >
                      Nenhum cliente ativo neste estado com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  detail.clientes.map((c) => (
                    <tr key={c.empresaId} className="border-t border-[#eef2f6]">
                      <td className="px-5 py-3 font-medium">{c.empresaId}</td>
                      <td className="px-5 py-3">{c.parceiro}</td>
                      <td className="px-5 py-3">{c.plano}</td>
                      <td className="px-5 py-3">
                        {durationLabel(c.duracao)}
                      </td>
                      <td className="px-5 py-3 font-semibold text-brand">
                        {formatCurrency(c.valor)}
                      </td>
                      <td className="px-5 py-3">
                        {formatDate(c.vencimento)}
                      </td>
                      <td className="px-5 py-3">
                        <a
                          href={c.intranet}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-brand hover:underline"
                        >
                          Abrir <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
