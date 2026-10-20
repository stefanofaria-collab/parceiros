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
  minIndicacoes: "",
  maxIndicacoes: "",
  minAtivacoes: "",
  maxAtivacoes: "",
  responsavelPagamento: "Todos",
  leadsAtivos: "Todos",
  clientesAtivos: "Todos",
  mes: currentMonth(),
  page: 1,
  pageSize: 50,
};

type CacheEntry = { data: unknown; ts: number; day: string };

type DataCacheContextValue = {
  filters: FilterParams;
  setFilters: (
    next: FilterParams | ((prev: FilterParams) => FilterParams)
  ) => void;
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
  /** Recarrega MySQL (1x/dia no máximo, sob demanda). */
  refreshFromDb: () => Promise<void>;
  warm: boolean;
  cacheInfo: string | null;
};

const DataCacheContext = createContext<DataCacheContextValue | null>(null);

const SESSION_KEY = "parceiros_client_cache_v1";

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function loadSessionCache(): Map<string, CacheEntry> {
  if (typeof window === "undefined") return new Map();
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
    const day = todayStamp();
    const map = new Map<string, CacheEntry>();
    Object.entries(parsed).forEach(([k, v]) => {
      if (v && v.day === day) map.set(k, v);
    });
    return map;
  } catch {
    return new Map();
  }
}

function saveSessionCache(map: Map<string, CacheEntry>) {
  if (typeof window === "undefined") return;
  try {
    const obj: Record<string, CacheEntry> = {};
    map.forEach((v, k) => {
      obj[k] = v;
    });
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(obj));
  } catch {
    /* quota / private mode */
  }
}

export function DataCacheProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterParams>(defaults);
  const [applied, setApplied] = useState<FilterParams>(defaults);
  const [warm, setWarm] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current) {
      cacheRef.current = loadSessionCache();
      hydrated.current = true;
    }

    fetch("/api/warmup")
      .then((r) => r.json())
      .then((d) => {
        setWarm(true);
        if (d.fromCache && d.savedAt) {
          setCacheInfo(
            `Cache do dia · ${new Date(d.savedAt).toLocaleString("pt-BR")}`
          );
        } else if (d.ok) {
          setCacheInfo(
            `Dados carregados · ${new Date().toLocaleString("pt-BR")}`
          );
        }
      })
      .catch(() => setWarm(true));
  }, []);

  const apply = useCallback(() => {
    // Não limpa o cache inteiro: só a nova chave de filtro será buscada.
    // O dataset base no servidor continua em cache do dia.
    setApplied({ ...filters, page: 1 });
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
    saveSessionCache(cacheRef.current);
  }, []);

  const getCached = useCallback(<T,>(cacheKey: string): T | null => {
    const hit = cacheRef.current.get(cacheKey);
    if (!hit) return null;
    if (hit.day !== todayStamp()) {
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
        if (hit && hit.day === todayStamp()) {
          return hit.data as T;
        }
      }
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao carregar dados");
      }
      cacheRef.current.set(cacheKey, {
        data,
        ts: Date.now(),
        day: todayStamp(),
      });
      saveSessionCache(cacheRef.current);
      return data as T;
    },
    []
  );

  const refreshFromDb = useCallback(async () => {
    invalidateClientCache();
    const res = await fetch("/api/refresh", { method: "POST" });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      throw new Error(json.error || "Falha ao atualizar");
    }
    setCacheInfo(
      `Atualizado agora · ${new Date(json.refreshedAt).toLocaleString("pt-BR")}`
    );
  }, [invalidateClientCache]);

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
      refreshFromDb,
      warm,
      cacheInfo,
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
      refreshFromDb,
      warm,
      cacheInfo,
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
