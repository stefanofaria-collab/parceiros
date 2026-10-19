import { FilterParams } from "./types";

export function parseFilters(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): FilterParams {
  const get = (key: string): string | undefined => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key) || undefined;
    }
    const v = searchParams[key];
    return Array.isArray(v) ? v[0] : v || undefined;
  };

  const leads = get("leadsAtivos");
  const clientes = get("clientesAtivos");
  const responsavel = get("responsavelPagamento");

  return {
    parceiro: get("parceiro"),
    empresaIndicacaoId: get("empresaIndicacaoId"),
    nomePlano: get("nomePlano"),
    duracao: get("duracao"),
    cadastroDe: get("cadastroDe"),
    cadastroAte: get("cadastroAte"),
    ativacaoDe: get("ativacaoDe"),
    ativacaoAte: get("ativacaoAte"),
    vencimentoDe: get("vencimentoDe"),
    vencimentoAte: get("vencimentoAte"),
    responsavelPagamento:
      responsavel === "Cliente" ||
      responsavel === "Parceiro" ||
      responsavel === "Todos"
        ? responsavel
        : "Todos",
    leadsAtivos:
      leads === "Sim" || leads === "Nao" || leads === "Todos"
        ? leads
        : "Todos",
    clientesAtivos:
      clientes === "Sim" || clientes === "Nao" || clientes === "Todos"
        ? clientes
        : "Todos",
    mes: get("mes"),
    page: Number(get("page") || 1),
    pageSize: Number(get("pageSize") || 50),
  };
}

export function filtersToQuery(filters: FilterParams): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      value !== "Todos"
    ) {
      params.set(key, String(value));
    }
  });
  return params.toString();
}

/** Chave estável para cache (ignora paginação). */
export function filtersCacheKey(
  filters: FilterParams,
  extra = ""
): string {
  const rest = { ...filters };
  delete rest.page;
  delete rest.pageSize;
  return `${JSON.stringify(rest)}|${extra}`;
}
