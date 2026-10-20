"use client";

import { useEffect, useMemo, useState } from "react";
import { geoMercator, geoPath, GeoPermissibleObjects } from "d3-geo";
import { blueHeatColor } from "@/lib/brasil";
import { MapStateRow } from "@/lib/types";

type Feature = {
  type: "Feature";
  properties: { name: string; sigla: string };
  geometry: GeoPermissibleObjects;
};

type Props = {
  states: MapStateRow[];
  max: number;
  modoLabel: string;
  selectedUf?: string | null;
  onStateClick?: (uf: string) => void;
};

export function BrazilHeatMap({
  states,
  max,
  modoLabel,
  selectedUf = null,
  onStateClick,
}: Props) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [hover, setHover] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/brazil-states.geojson")
      .then((r) => r.json())
      .then((geo) => setFeatures(geo.features || []))
      .catch(() => setError("Não foi possível carregar o mapa."));
  }, []);

  const byUf = useMemo(() => {
    const m = new Map<string, MapStateRow>();
    states.forEach((s) => m.set(s.uf, s));
    return m;
  }, [states]);

  const pathGen = useMemo(() => {
    if (!features.length) return null;
    const projection = geoMercator().fitSize(
      [640, 640],
      {
        type: "FeatureCollection",
        features,
      } as never
    );
    return geoPath(projection);
  }, [features]);

  const hovered = hover ? byUf.get(hover) : null;

  if (error) {
    return (
      <div className="flex h-[480px] items-center justify-center text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (!pathGen || !features.length) {
    return (
      <div className="flex h-[480px] items-center justify-center text-sm text-[#94a3b8]">
        Carregando mapa…
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_200px]">
      <div className="relative overflow-hidden rounded-xl border border-[#eef2f6] bg-[#f8fafc] p-2">
        <svg viewBox="0 0 640 640" className="h-auto w-full max-h-[560px]">
          {features.map((f) => {
            const uf = f.properties.sigla;
            const row = byUf.get(uf);
            const valor = row?.valor || 0;
            const fill = blueHeatColor(valor, max);
            const active = hover === uf || selectedUf === uf;
            return (
              <path
                key={uf}
                d={pathGen(f as never) || undefined}
                fill={fill}
                stroke={active ? "#013c40" : "#ffffff"}
                strokeWidth={active ? 2.5 : 1}
                className="cursor-pointer transition"
                onMouseEnter={() => setHover(uf)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onStateClick?.(uf)}
              >
                <title>
                  {f.properties.name}: {valor.toLocaleString("pt-BR")} — clique
                  para ver a lista
                </title>
              </path>
            );
          })}
        </svg>
        {hovered && (
          <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-[#e5eaf0] bg-white px-3 py-2 text-sm shadow-card">
            <p className="font-semibold text-[#122033]">{hovered.nome}</p>
            <p className="text-[#6b7280]">
              {modoLabel}:{" "}
              <span className="font-medium text-brand">
                {hovered.valor.toLocaleString("pt-BR")}
              </span>
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#8b95a5]">
            Escala
          </p>
          <div
            className="h-40 w-8 rounded-md border border-[#e5eaf0]"
            style={{
              background: `linear-gradient(to top, #e8f4f8, #7eb8c0, #01636b)`,
            }}
          />
          <div className="mt-2 space-y-1 text-xs text-[#6b7280]">
            <p>Máx: {max.toLocaleString("pt-BR")}</p>
            <p>Mín: 0</p>
          </div>
        </div>
        <p className="text-xs text-[#8b95a5]">
          Tons mais escuros de azul indicam maior concentração de{" "}
          {modoLabel.toLowerCase()}. Clique em um estado para ver a lista.
        </p>
      </div>
    </div>
  );
}
