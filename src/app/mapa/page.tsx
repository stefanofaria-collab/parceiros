"use client";

import { useCallback, useEffect, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { Filters } from "@/components/Filters";
import { BrazilHeatMap } from "@/components/BrazilHeatMap";
import { MapStateModal } from "@/components/MapStateModal";
import { useFilters } from "@/hooks/useFilters";
import { useDataCache } from "@/context/DataCacheContext";
import { MapData } from "@/lib/types";
import { formatNumber } from "@/lib/format";

export default function MapaPage() {
  const { filters, setFilters, apply, queryString } = useFilters();
  const { cachedFetch, getCached, refreshFromDb, warm } = useDataCache();
  const [modo, setModo] = useState<"clientes" | "parceiros">("clientes");
  const [data, setData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUf, setSelectedUf] = useState<string | null>(null);

  const mapQuery = `${queryString}${queryString ? "&" : ""}mapaModo=${modo}`;

  const load = useCallback(
    async (force = false) => {
      const key = `map:${mapQuery}`;
      if (!force) {
        const hit = getCached<MapData>(key);
        if (hit) {
          setData(hit);
          setLoading(false);
          return;
        }
      }
      setLoading(true);
      setError(null);
      try {
        if (force) await refreshFromDb();
        const json = await cachedFetch<MapData>(
          key,
          `/api/map?${mapQuery}`,
          { force }
        );
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao carregar mapa");
      } finally {
        setLoading(false);
      }
    },
    [cachedFetch, getCached, refreshFromDb, mapQuery]
  );

  useEffect(() => {
    if (!warm) return;
    load();
  }, [load, warm]);

  const modoLabel =
    modo === "parceiros" ? "Parceiros" : "Clientes ativos";

  return (
    <>
      <TopBar
        eyebrow="Comercial / Mapa"
        title="Mapa de Parceiros"
        onRefresh={() => load(true)}
        loading={loading}
      />
      <main className="flex-1 space-y-5 overflow-y-auto p-6">
        <Filters value={filters} onChange={setFilters} onApply={apply} />

        <div className="card p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[#122033]">
                Mapa de calor por estado
              </h2>
              <p className="text-sm text-[#6b7280]">
                Visualização em azul — estados mais escuros concentram mais
                volume.
              </p>
            </div>
            <div className="min-w-[220px]">
              <label className="label">Visualizar por</label>
              <select
                className="input"
                value={modo}
                onChange={(e) => {
                  setSelectedUf(null);
                  setModo(e.target.value as "clientes" | "parceiros");
                }}
              >
                <option value="clientes">Clientes por parceiro</option>
                <option value="parceiros">Parceiros</option>
              </select>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-4 text-sm text-[#475569]">
            <span>
              Modo: <strong className="text-[#122033]">{modoLabel}</strong>
            </span>
            <span>
              Total:{" "}
              <strong className="text-[#122033]">
                {formatNumber(data?.total)}
              </strong>
            </span>
            <span>
              Máximo em um estado:{" "}
              <strong className="text-[#122033]">
                {formatNumber(data?.max)}
              </strong>
            </span>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <BrazilHeatMap
            states={data?.states || []}
            max={data?.max || 0}
            modoLabel={modoLabel}
            selectedUf={selectedUf}
            onStateClick={setSelectedUf}
          />
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-[#eef2f6] px-5 py-4">
            <h3 className="text-base font-semibold text-[#122033]">
              Ranking por estado
            </h3>
            <p className="text-sm text-[#6b7280]">
              Clique em uma linha para ver a lista do estado.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f8fafc] text-left text-[11px] uppercase tracking-wide text-[#8b95a5]">
                <tr>
                  <th className="px-5 py-3 font-semibold">UF</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                  <th className="px-5 py-3 font-semibold">{modoLabel}</th>
                </tr>
              </thead>
              <tbody>
                {[...(data?.states || [])]
                  .sort((a, b) => b.valor - a.valor)
                  .map((s) => (
                    <tr
                      key={s.uf}
                      className={`cursor-pointer border-t border-[#eef2f6] transition hover:bg-[#f0f9fa] ${
                        selectedUf === s.uf ? "bg-[#e8f4f8]" : ""
                      }`}
                      onClick={() => setSelectedUf(s.uf)}
                    >
                      <td className="px-5 py-3 font-medium">{s.uf}</td>
                      <td className="px-5 py-3">{s.nome}</td>
                      <td className="px-5 py-3 font-semibold text-brand">
                        {formatNumber(s.valor)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <MapStateModal
        uf={selectedUf}
        mapQuery={mapQuery}
        onClose={() => setSelectedUf(null)}
      />
    </>
  );
}
