"use client";

import { useDataCache } from "@/context/DataCacheContext";

/** Filtros compartilhados entre páginas (persistem na navegação). */
export function useFilters() {
  const {
    filters,
    setFilters,
    applied,
    apply,
    setPage,
    setMonth,
    queryString,
  } = useDataCache();

  return { filters, setFilters, applied, apply, setPage, setMonth, queryString };
}
