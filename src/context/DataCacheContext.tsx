"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { FilterParams } from "@/lib/types";
import { filtersToQuery } from "@/lib/filters";
import { currentMonth } from "@/lib/format";

const defaults: FilterParams = {
  parceiro: "",
  empresaIndicacaoId: "",
  nomePlano: "",
  duracao: "",
  cadastroDe: "",
  cadastroAte: "",
  ativacaoDe: "",
  ativacaoAte: "",
  vencimentoDe: "",
  vencimentoAte: "",
  ultimaIndicacaoDe: "",
  ultimaIndicacaoAte: "",
  ultimaAtivacaoDe: "",
  ultimaAtivacaoAte: "",
  responsavelPagamento: "Todos",
  leadsAtivos: "Todos",
  clientesAtivos: "Todos",
  mes: currentMonth(),
  page: 1,
  pageSize: 50,
};

type CacheEntry = { data: unknown; ts: number };

type DataCacheContextValue = {
  filters: FilterParams;
  setFilters: (next: FilterParams | ((prev: FilterParams) => FilterParams)) => void;
  applied: FilterParams;
  apply: () => void;
  setPage: (page: number) => void;
  setMonth: (mes: string) => void;
  queryString: string;
  getCached: <T>(cacheKey: string) => T | null;
  cachedFetch: <T>(
    cacheKey: string,
    url: string,
    options?: { force?: boolean }
  ) => Promise<T>;
  invalidateClientCache: () => void;
  warm: boolean;
};

const DataCacheContext = createContext<DataCacheContextValue | null>(null);
const CLIENT_TTL = 10 * 60 * 1000;

export function DataCacheProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterParams>(defaults);
  const [applied, setApplied] = useState<FilterParams>(defaults);
  const [warm, setWarm] = useState(false);
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  useEffect(() => {
    fetch("/api/warmup")
      .then((r) => r.json())
      .then(() => setWarm(true))
      .catch(() => setWarm(true));
  }, []);

  const apply = useCallback(() => {
    setApplied({ ...filters, page: 1 });
    cacheRef.current.clear();
  }, [filters]);

  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
    setApplied((prev) => ({ ...prev, page }));
  }, []);

  const setMonth = useCallback((mes: string) => {
    setFilters((prev) => ({ ...prev, mes, page: 1 }));
    setApplied((prev) => ({ ...prev, mes, page: 1 }));
  }, []);

  const invalidateClientCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  const getCached = useCallback(<T,>(cacheKey: string): T | null => {
    const hit = cacheRef.current.get(cacheKey);
    if (!hit) return null;
    if (Date.now() - hit.ts >= CLIENT_TTL) {
      cacheRef.current.delete(cacheKey);
      return null;
    }
    return hit.data as T;
  }, []);

  const cachedFetch = useCallback(
    async <T,>(
      cacheKey: string,
      url: string,
      options?: { force?: boolean }
    ): Promise<T> => {
      if (!options?.force) {
        const hit = cacheRef.current.get(cacheKey);
        if (hit && Date.now() - hit.ts < CLIENT_TTL) {
          return hit.data as T;
        }
      }
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao carregar dados");
      }
      cacheRef.current.set(cacheKey, { data, ts: Date.now() });
      return data as T;
    },
    []
  );

  const queryString = useMemo(() => filtersToQuery(applied), [applied]);

  const value = useMemo(
    () => ({
      filters,
      setFilters,
      applied,
      apply,
      setPage,
      setMonth,
      queryString,
      getCached,
      cachedFetch,
      invalidateClientCache,
      warm,
    }),
    [
      filters,
      applied,
      apply,
      setPage,
      setMonth,
      queryString,
      getCached,
      cachedFetch,
      invalidateClientCache,
      warm,
    ]
  );

  return (
    <DataCacheContext.Provider value={value}>
      {children}
    </DataCacheContext.Provider>
  );
}

export function useDataCache() {
  const ctx = useContext(DataCacheContext);
  if (!ctx) {
    throw new Error("useDataCache must be used within DataCacheProvider");
  }
  return ctx;
}
