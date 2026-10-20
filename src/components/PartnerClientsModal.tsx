"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarCheck2,
  ExternalLink,
  UserPlus,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { PartnerClientRow, PartnerDetailData } from "@/lib/types";
import {
  formatCurrency,
  formatDate,
  durationLabel,
  formatNumber,
} from "@/lib/format";
import { intranetUrl } from "@/lib/intranet";

type Props = {
  partnerId: number | null;
  partnerName?: string;
  queryString?: string;
  onClose: () => void;
};

type SortKey =
  | "empresaId"
  | "plano"
  | "duracao"
  | "valor"
  | "vencimento"
  | "intranet";

type SortDir = "asc" | "desc";

export function PartnerClientsModal({
  partnerId,
  partnerName,
  queryString = "",
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<PartnerDetailData | null>(null);
  const [plano, setPlano] = useState("");
  const [duracao, setDuracao] = useState("");
  const [vencimentoDe, setVencimentoDe] = useState("");
  const [vencimentoAte, setVencimentoAte] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("valor");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    if (!partnerId) return;
    setLoading(true);
    setPlano("");
    setDuracao("");
    setVencimentoDe("");
    setVencimentoAte("");
    setSortKey("valor");
    setSortDir("desc");
    fetch(`/api/partners/${partnerId}/clients?${queryString}`)
      .then((r) => r.json())
      .then((d: PartnerDetailData) => setDetail(d))
      .finally(() => setLoading(false));
  }, [partnerId, queryString]);

  const clientes = detail?.clientes || [];
  const nome = detail?.parceiro || partnerName || "";

  const planosDisponiveis = useMemo(() => {
    return Array.from(new Set(clientes.map((c) => c.plano).filter(Boolean))).sort(
      (a, b) => a.localeCompare(b, "pt-BR")
    );
  }, [clientes]);

  const filtered = useMemo(() => {
    let rows = [...clientes];

    if (plano) rows = rows.filter((c) => c.plano === plano);
    if (duracao) rows = rows.filter((c) => c.duracao === duracao);
    if (vencimentoDe) {
      rows = rows.filter(
        (c) => c.vencimento != null && c.vencimento >= vencimentoDe
      );
    }
    if (vencimentoAte) {
      rows = rows.filter(
        (c) => c.vencimento != null && c.vencimento <= vencimentoAte
      );
    }

    const dir = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const av = a[sortKey as keyof PartnerClientRow];
      const bv = b[sortKey as keyof PartnerClientRow];

      if (sortKey === "valor" || sortKey === "empresaId") {
        return (Number(av) - Number(bv)) * dir;
      }
      if (sortKey === "vencimento") {
        const as = String(av || "");
        const bs = String(bv || "");
        if (!as && !bs) return 0;
        if (!as) return 1;
        if (!bs) return -1;
        return as.localeCompare(bs) * dir;
      }
      if (sortKey === "duracao") {
        return (
          durationLabel(String(av || "")).localeCompare(
            durationLabel(String(bv || "")),
            "pt-BR"
          ) * dir
        );
      }
      return (
        String(av || "").localeCompare(String(bv || ""), "pt-BR", {
          sensitivity: "base",
        }) * dir
      );
    });

    return rows;
  }, [clientes, plano, duracao, vencimentoDe, vencimentoAte, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "valor" || key === "empresaId" ? "desc" : "asc");
    }
  };

  if (!partnerId) return null;

  const chartData = detail?.clientesAtivosPorPlano || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#eef2f6] px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8b95a5]">
              Clientes do parceiro
            </p>
            <h3 className="text-lg font-semibold text-[#122033]">{nome}</h3>
            <p className="text-sm text-[#6b7280]">
              ID {partnerId} · {formatNumber(filtered.length)} de{" "}
              {formatNumber(clientes.length)} cliente(s)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={intranetUrl(partnerId)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Intranet do parceiro
            </a>
            <button
              type="button"
              className="btn-secondary !px-2"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-auto">
          <div className="space-y-4 px-5 py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="card p-4">
                <div className="flex items-start justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280]">
                    Última indicação
                  </p>
                  <div className="rounded-lg bg-brand/10 p-2 text-brand">
                    <UserPlus className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-2 text-xl font-semibold text-[#122033]">
                  {formatDate(detail?.ultimaIndicacao)}
                </p>
                <p className="mt-1 text-xs text-[#8b95a5]">
                  Maior data em cadastrado_em
                </p>
              </div>
              <div className="card p-4">
                <div className="flex items-start justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280]">
                    Última ativação
                  </p>
                  <div className="rounded-lg bg-brand/10 p-2 text-brand">
                    <CalendarCheck2 className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-2 text-xl font-semibold text-[#122033]">
                  {formatDate(detail?.ultimaAtivacao)}
                </p>
                <p className="mt-1 text-xs text-[#8b95a5]">
                  Maior data em ativou_em
                </p>
              </div>
            </div>

            <div className="card p-4">
              <h4 className="mb-1 text-sm font-semibold text-[#122033]">
                Clientes ativos por plano e duração
              </h4>
              <p className="mb-3 text-xs text-[#6b7280]">
                Quantidade de clientes com vencimento ≥ hoje, agrupados por plano
                e duração.
              </p>
              <div className="h-64">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ bottom: 48, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10 }}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar
                        dataKey="quantidade"
                        name="Clientes ativos"
                        fill="#01636b"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[#94a3b8]">
                    {loading
                      ? "Carregando gráfico…"
                      : "Nenhum cliente ativo neste parceiro."}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 border-y border-[#eef2f6] px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label">Plano</label>
              <select
                className="input"
                value={plano}
                onChange={(e) => setPlano(e.target.value)}
              >
                <option value="">Todos</option>
                {planosDisponiveis.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Duração</label>
              <select
                className="input"
                value={duracao}
                onChange={(e) => setDuracao(e.target.value)}
              >
                <option value="">Todas</option>
                <option value="M">Mensal</option>
                <option value="A">Anual</option>
                <option value="S">Semestral</option>
                <option value="T">Trimestral</option>
              </select>
            </div>
            <div>
              <label className="label">Vencimento de</label>
              <input
                className="input"
                type="date"
                value={vencimentoDe}
                onChange={(e) => setVencimentoDe(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Vencimento até</label>
              <input
                className="input"
                type="date"
                value={vencimentoAte}
                onChange={(e) => setVencimentoAte(e.target.value)}
              />
            </div>
          </div>

          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-[#f8fafc] text-left text-[11px] uppercase tracking-wide text-[#8b95a5]">
              <tr>
                <SortableTh
                  label="Empresa ID"
                  active={sortKey === "empresaId"}
                  dir={sortDir}
                  onClick={() => toggleSort("empresaId")}
                />
                <SortableTh
                  label="Plano"
                  active={sortKey === "plano"}
                  dir={sortDir}
                  onClick={() => toggleSort("plano")}
                />
                <SortableTh
                  label="Duração"
                  active={sortKey === "duracao"}
                  dir={sortDir}
                  onClick={() => toggleSort("duracao")}
                />
                <SortableTh
                  label="Valor"
                  active={sortKey === "valor"}
                  dir={sortDir}
                  onClick={() => toggleSort("valor")}
                />
                <SortableTh
                  label="Vencimento"
                  active={sortKey === "vencimento"}
                  dir={sortDir}
                  onClick={() => toggleSort("vencimento")}
                />
                <th className="px-5 py-3 font-semibold">Intranet</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-[#94a3b8]"
                  >
                    Carregando clientes…
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((c) => (
                  <tr key={c.empresaId} className="border-t border-[#eef2f6]">
                    <td className="px-5 py-3 font-medium">{c.empresaId}</td>
                    <td className="px-5 py-3">{c.plano}</td>
                    <td className="px-5 py-3">{durationLabel(c.duracao)}</td>
                    <td className="px-5 py-3 font-semibold">
                      {formatCurrency(c.valor)}
                    </td>
                    <td className="px-5 py-3">{formatDate(c.vencimento)}</td>
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
                ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-[#94a3b8]"
                  >
                    Nenhum cliente encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
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
