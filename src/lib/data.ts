import { checkConnection, query } from "./db";
import { cacheGet, cacheSet, cacheClear } from "./cache";
import { filtersCacheKey } from "./filters";
import { intranetUrl } from "./intranet";
import {
  toDate,
  daysUntil,
  yearsBetween,
  currentMonth,
  durationLabel,
} from "./format";
import { BASE_CTE } from "./sql";
import {
  ClienteParceiro,
  DashboardData,
  FilterParams,
  PartnerClientRow,
  PartnerDetailData,
  PartnerSummary,
} from "./types";

const CHURN_DAYS = 60;
const BASE_TTL_MS = 5 * 60 * 1000;
const RESULT_TTL_MS = 2 * 60 * 1000;
const BASE_KEY = "base:clientes_parceiros";

function isLead(row: ClienteParceiro): boolean {
  return String(row.nome_plano || "").trim().toLowerCase() === "teste";
}

function isClient(row: ClienteParceiro): boolean {
  return row.ativou_em != null && String(row.ativou_em).trim() !== "";
}

function isActiveByDate(row: ClienteParceiro, today = new Date()): boolean {
  const d = toDate(row.data_vencimento);
  if (!d) return false;
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return d >= t;
}

function isChurn(row: ClienteParceiro, today = new Date()): boolean {
  const d = toDate(row.data_vencimento);
  if (!d) return false;
  const diff = daysUntil(d, today);
  return diff !== null && diff <= -CHURN_DAYS;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function dateStr(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function normalizeRow(r: ClienteParceiro): ClienteParceiro {
  return {
    ...r,
    empresa_id: num(r.empresa_id),
    empresa_indicacao_id: num(r.empresa_indicacao_id),
    valor: num(r.valor),
    tipo_cobranca: r.tipo_cobranca ?? null,
  };
}

export async function loadBaseRows(force = false): Promise<ClienteParceiro[]> {
  if (!force) {
    const cached = cacheGet<ClienteParceiro[]>(BASE_KEY);
    if (cached) return cached;
  }

  const sql = `${BASE_CTE} select * from clientes_parceiros`;
  const rows = await query<ClienteParceiro>(sql);
  const normalized = rows.map(normalizeRow);
  cacheSet(BASE_KEY, normalized, BASE_TTL_MS);
  return normalized;
}

export async function warmupCache(): Promise<{ ok: boolean; rows: number }> {
  try {
    const rows = await loadBaseRows(true);
    return { ok: true, rows: rows.length };
  } catch {
    return { ok: false, rows: 0 };
  }
}

export function invalidateDataCache(): void {
  cacheClear();
}

function matchesFilters(
  row: ClienteParceiro,
  filters: FilterParams,
  today = new Date()
): boolean {
  if (filters.parceiro) {
    const q = filters.parceiro.toLowerCase();
    if (!String(row.parceiro || "").toLowerCase().includes(q)) return false;
  }

  if (filters.empresaIndicacaoId) {
    if (row.empresa_indicacao_id !== Number(filters.empresaIndicacaoId)) {
      return false;
    }
  }

  if (filters.nomePlano) {
    const q = filters.nomePlano.toLowerCase();
    if (!String(row.nome_plano || "").toLowerCase().includes(q)) return false;
  }

  if (filters.duracao && row.duracao !== filters.duracao) return false;

  if (filters.cadastroDe) {
    const d = dateStr(row.cadastrado_em);
    if (!d || d < filters.cadastroDe) return false;
  }
  if (filters.cadastroAte) {
    const d = dateStr(row.cadastrado_em);
    if (!d || d > filters.cadastroAte) return false;
  }

  if (filters.ativacaoDe) {
    const d = dateStr(row.ativou_em);
    if (!d || d < filters.ativacaoDe) return false;
  }
  if (filters.ativacaoAte) {
    const d = dateStr(row.ativou_em);
    if (!d || d > filters.ativacaoAte) return false;
  }

  if (filters.vencimentoDe) {
    const d = dateStr(row.data_vencimento);
    if (!d || d < filters.vencimentoDe) return false;
  }
  if (filters.vencimentoAte) {
    const d = dateStr(row.data_vencimento);
    if (!d || d > filters.vencimentoAte) return false;
  }

  if (filters.responsavelPagamento === "Cliente") {
    if (String(row.tipo_cobranca || "").toUpperCase() !== "E") return false;
  } else if (filters.responsavelPagamento === "Parceiro") {
    if (String(row.tipo_cobranca || "").toUpperCase() !== "P") return false;
  }

  if (filters.leadsAtivos === "Sim") {
    if (!isLead(row) || !isActiveByDate(row, today)) return false;
  } else if (filters.leadsAtivos === "Nao") {
    if (!isLead(row) || isActiveByDate(row, today)) return false;
  }

  if (filters.clientesAtivos === "Sim") {
    if (!isClient(row) || !isActiveByDate(row, today)) return false;
  } else if (filters.clientesAtivos === "Nao") {
    if (!isClient(row) || isActiveByDate(row, today)) return false;
  }

  return true;
}

function partnerMaxDates(rows: ClienteParceiro[]) {
  const map = new Map<
    number,
    { ultimaIndicacao: string | null; ultimaAtivacao: string | null }
  >();
  for (const row of rows) {
    const id = row.empresa_indicacao_id;
    const prev = map.get(id) || {
      ultimaIndicacao: null,
      ultimaAtivacao: null,
    };
    const cad = dateStr(row.cadastrado_em);
    if (cad && (!prev.ultimaIndicacao || cad > prev.ultimaIndicacao)) {
      prev.ultimaIndicacao = cad;
    }
    const ativ = dateStr(row.ativou_em);
    if (ativ && (!prev.ultimaAtivacao || ativ > prev.ultimaAtivacao)) {
      prev.ultimaAtivacao = ativ;
    }
    map.set(id, prev);
  }
  return map;
}

function matchesPartnerDateFilters(
  partnerId: number,
  partnerDates: Map<
    number,
    { ultimaIndicacao: string | null; ultimaAtivacao: string | null }
  >,
  filters: FilterParams
): boolean {
  const hasIndicacao =
    !!filters.ultimaIndicacaoDe || !!filters.ultimaIndicacaoAte;
  const hasAtivacao = !!filters.ultimaAtivacaoDe || !!filters.ultimaAtivacaoAte;
  if (!hasIndicacao && !hasAtivacao) return true;

  const dates = partnerDates.get(partnerId);
  if (!dates) return false;

  if (hasIndicacao) {
    if (!dates.ultimaIndicacao) return false;
    if (
      filters.ultimaIndicacaoDe &&
      dates.ultimaIndicacao < filters.ultimaIndicacaoDe
    ) {
      return false;
    }
    if (
      filters.ultimaIndicacaoAte &&
      dates.ultimaIndicacao > filters.ultimaIndicacaoAte
    ) {
      return false;
    }
  }

  if (hasAtivacao) {
    if (!dates.ultimaAtivacao) return false;
    if (
      filters.ultimaAtivacaoDe &&
      dates.ultimaAtivacao < filters.ultimaAtivacaoDe
    ) {
      return false;
    }
    if (
      filters.ultimaAtivacaoAte &&
      dates.ultimaAtivacao > filters.ultimaAtivacaoAte
    ) {
      return false;
    }
  }

  return true;
}

export async function fetchClientes(
  filters: FilterParams
): Promise<ClienteParceiro[]> {
  const base = await loadBaseRows();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const needsPartnerDates =
    !!filters.ultimaIndicacaoDe ||
    !!filters.ultimaIndicacaoAte ||
    !!filters.ultimaAtivacaoDe ||
    !!filters.ultimaAtivacaoAte;

  const partnerDates = needsPartnerDates ? partnerMaxDates(base) : null;

  return base.filter((row) => {
    if (!matchesFilters(row, filters, today)) return false;
    if (
      partnerDates &&
      !matchesPartnerDateFilters(
        row.empresa_indicacao_id,
        partnerDates,
        filters
      )
    ) {
      return false;
    }
    return true;
  });
}

export async function fetchPartnerNames(q?: string): Promise<
  { id: number; nome: string }[]
> {
  const base = await loadBaseRows();
  const map = new Map<number, string>();
  const needle = (q || "").trim().toLowerCase();

  for (const row of base) {
    if (map.has(row.empresa_indicacao_id)) continue;
    if (needle) {
      const nome = String(row.parceiro || "").toLowerCase();
      const id = String(row.empresa_indicacao_id);
      if (!nome.includes(needle) && !id.includes(needle)) continue;
    }
    map.set(row.empresa_indicacao_id, row.parceiro);
  }

  return Array.from(map.entries())
    .map(([id, nome]) => ({ id, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .slice(0, 30);
}

export async function fetchPlanNames(): Promise<string[]> {
  const cached = cacheGet<string[]>("plans:names");
  if (cached) return cached;
  const base = await loadBaseRows();
  const set = new Set<string>();
  for (const row of base) {
    if (row.nome_plano) set.add(row.nome_plano);
  }
  const items = Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  cacheSet("plans:names", items, BASE_TTL_MS);
  return items;
}

function buildPartnerSummaries(rows: ClienteParceiro[]): PartnerSummary[] {
  const today = new Date();
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const map = new Map<number, PartnerSummary & { conversionDays: number[] }>();

  for (const row of rows) {
    const id = row.empresa_indicacao_id;
    if (!map.has(id)) {
      map.set(id, {
        empresaIndicacaoId: id,
        parceiro: row.parceiro,
        totalLeads: 0,
        leadsAtivos: 0,
        totalClientes: 0,
        clientesAtivos: 0,
        ativacoes3m: 0,
        faturamento: 0,
        taxaConversao: 0,
        taxaChurn: 0,
        tempoMedioConversaoDias: null,
        planos: {},
        conversionDays: [],
      });
    }
    const p = map.get(id)!;

    if (isLead(row)) {
      p.totalLeads += 1;
      if (isActiveByDate(row, today)) p.leadsAtivos += 1;
    }

    if (isClient(row)) {
      p.totalClientes += 1;
      if (isActiveByDate(row, today)) {
        p.clientesAtivos += 1;
        p.faturamento += num(row.valor);
      }

      const ativou = toDate(row.ativou_em);
      if (ativou && ativou >= threeMonthsAgo) p.ativacoes3m += 1;

      const cad = toDate(row.cadastrado_em);
      if (cad && ativou) {
        const dias = daysUntil(ativou, cad);
        if (dias !== null && dias >= 0) p.conversionDays.push(dias);
      }

      if (!isLead(row)) {
        const key = `${row.nome_plano} · ${row.duracao}`;
        p.planos[key] = (p.planos[key] || 0) + 1;
      }
    }
  }

  const churnCounts = new Map<number, { churn: number; total: number }>();
  for (const row of rows) {
    if (!isClient(row) || isLead(row)) continue;
    const id = row.empresa_indicacao_id;
    const c = churnCounts.get(id) || { churn: 0, total: 0 };
    c.total += 1;
    if (isChurn(row, today)) c.churn += 1;
    churnCounts.set(id, c);
  }

  return Array.from(map.values()).map((p) => {
    const denom = p.totalLeads + p.totalClientes;
    const taxaConversao = denom > 0 ? (p.totalClientes / denom) * 100 : 0;
    const ch = churnCounts.get(p.empresaIndicacaoId);
    const taxaChurn = ch && ch.total > 0 ? (ch.churn / ch.total) * 100 : 0;
    const tempoMedioConversaoDias =
      p.conversionDays.length > 0
        ? Math.round(
            (p.conversionDays.reduce((a, b) => a + b, 0) /
              p.conversionDays.length) *
              10
          ) / 10
        : null;

    return {
      empresaIndicacaoId: p.empresaIndicacaoId,
      parceiro: p.parceiro,
      totalLeads: p.totalLeads,
      leadsAtivos: p.leadsAtivos,
      totalClientes: p.totalClientes,
      clientesAtivos: p.clientesAtivos,
      ativacoes3m: p.ativacoes3m,
      faturamento: p.faturamento,
      taxaConversao,
      taxaChurn,
      tempoMedioConversaoDias,
      planos: p.planos,
    };
  });
}

export async function getDashboardData(
  filters: FilterParams
): Promise<DashboardData> {
  const key = `dashboard:${filtersCacheKey(filters)}`;
  const cached = cacheGet<DashboardData>(key);
  if (cached) return { ...cached, cached: true };

  const dbOk = await checkConnection();
  if (!dbOk) {
    return {
      totalParceiros: 0,
      totalLeads: 0,
      leadsAtivos: 0,
      totalClientes: 0,
      clientesAtivos: 0,
      faturamentoAtivo: 0,
      taxaConversao: 0,
      taxaChurn: 0,
      ativacoes3m: 0,
      tempoMedioConversaoDias: null,
      planosVendidos: [],
      planosPorDuracao: [],
      topParceiros: [],
      evolucaoIndicacoes: [],
      evolucaoAtivacoes: [],
      evolucaoLeads: [],
      dbOk: false,
    };
  }

  const rows = await fetchClientes(filters);
  const today = new Date();
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const partners = new Set<number>();
  let totalLeads = 0;
  let leadsAtivos = 0;
  let totalClientes = 0;
  let clientesAtivos = 0;
  let faturamentoAtivo = 0;
  let ativacoes3m = 0;
  let churnCount = 0;
  let churnBase = 0;
  const conversionDays: number[] = [];
  const planosMap = new Map<string, { quantidade: number; valor: number }>();
  const duracaoMap = new Map<string, number>();
  const indicacoesMap = new Map<string, number>();
  const ativacoesMap = new Map<string, number>();
  const leadsMap = new Map<string, { ativos: number; novos: number }>();

  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    indicacoesMap.set(k, 0);
    ativacoesMap.set(k, 0);
    leadsMap.set(k, { ativos: 0, novos: 0 });
  }

  for (const row of rows) {
    partners.add(row.empresa_indicacao_id);

    const cad = toDate(row.cadastrado_em);
    if (cad) {
      const k = `${cad.getFullYear()}-${String(cad.getMonth() + 1).padStart(2, "0")}`;
      if (indicacoesMap.has(k)) {
        indicacoesMap.set(k, (indicacoesMap.get(k) || 0) + 1);
      }
    }

    if (isLead(row)) {
      totalLeads += 1;
      if (isActiveByDate(row, today)) leadsAtivos += 1;
      if (cad) {
        const k = `${cad.getFullYear()}-${String(cad.getMonth() + 1).padStart(2, "0")}`;
        const slot = leadsMap.get(k);
        if (slot) {
          slot.novos += 1;
          if (isActiveByDate(row, today)) slot.ativos += 1;
        }
      }
    }

    if (isClient(row)) {
      totalClientes += 1;
      if (isActiveByDate(row, today)) {
        clientesAtivos += 1;
        faturamentoAtivo += num(row.valor);
      }

      const ativou = toDate(row.ativou_em);
      if (ativou) {
        const k = `${ativou.getFullYear()}-${String(ativou.getMonth() + 1).padStart(2, "0")}`;
        if (ativacoesMap.has(k)) {
          ativacoesMap.set(k, (ativacoesMap.get(k) || 0) + 1);
        }
        if (ativou >= threeMonthsAgo) ativacoes3m += 1;
      }

      if (cad && ativou) {
        const dias = daysUntil(ativou, cad);
        if (dias !== null && dias >= 0) conversionDays.push(dias);
      }

      if (!isLead(row)) {
        churnBase += 1;
        if (isChurn(row, today)) churnCount += 1;

        const plano = row.nome_plano || "Outros";
        const prev = planosMap.get(plano) || { quantidade: 0, valor: 0 };
        prev.quantidade += 1;
        if (isActiveByDate(row, today)) prev.valor += num(row.valor);
        planosMap.set(plano, prev);

        const dur = row.duracao || "?";
        duracaoMap.set(dur, (duracaoMap.get(dur) || 0) + 1);
      }
    }
  }

  const evolucaoIndicacoes = Array.from(indicacoesMap.entries()).map(
    ([mes, quantidade]) => ({ mes, quantidade })
  );
  const evolucaoAtivacoes = Array.from(ativacoesMap.entries()).map(
    ([mes, quantidade]) => ({ mes, quantidade })
  );

  let runningLeads = 0;
  const evolucaoLeads = Array.from(leadsMap.entries()).map(([mes, v]) => {
    runningLeads += v.ativos;
    return { mes, ativos: runningLeads, novos: v.novos };
  });

  const summaries = buildPartnerSummaries(rows).sort(
    (a, b) => b.faturamento - a.faturamento
  );

  const denom = totalLeads + totalClientes;

  const result: DashboardData = {
    totalParceiros: partners.size,
    totalLeads,
    leadsAtivos,
    totalClientes,
    clientesAtivos,
    faturamentoAtivo,
    taxaConversao: denom > 0 ? (totalClientes / denom) * 100 : 0,
    taxaChurn: churnBase > 0 ? (churnCount / churnBase) * 100 : 0,
    ativacoes3m,
    tempoMedioConversaoDias:
      conversionDays.length > 0
        ? Math.round(
            (conversionDays.reduce((a, b) => a + b, 0) / conversionDays.length) *
              10
          ) / 10
        : null,
    planosVendidos: Array.from(planosMap.entries())
      .map(([plano, v]) => ({ plano, ...v }))
      .sort((a, b) => b.quantidade - a.quantidade),
    planosPorDuracao: Array.from(duracaoMap.entries())
      .map(([duracao, quantidade]) => ({
        duracao,
        label: durationLabel(duracao),
        quantidade,
      }))
      .sort((a, b) => b.quantidade - a.quantidade),
    topParceiros: summaries.slice(0, 15),
    evolucaoIndicacoes,
    evolucaoAtivacoes,
    evolucaoLeads,
    dbOk: true,
    cached: false,
  };

  cacheSet(key, result, RESULT_TTL_MS);
  return result;
}

export async function getPartnersTable(filters: FilterParams): Promise<{
  items: PartnerSummary[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;
  const key = `partners:${filtersCacheKey(filters)}`;
  let all = cacheGet<PartnerSummary[]>(key);

  if (!all) {
    const rows = await fetchClientes(filters);
    all = buildPartnerSummaries(rows).sort(
      (a, b) => b.faturamento - a.faturamento
    );
    cacheSet(key, all, RESULT_TTL_MS);
  }

  const start = (page - 1) * pageSize;
  return {
    items: all.slice(start, start + pageSize),
    total: all.length,
    page,
    pageSize,
  };
}

export async function getPartnerClients(
  partnerId: number,
  filters: FilterParams = {}
): Promise<PartnerDetailData> {
  const rows = await fetchClientes({
    ...filters,
    empresaIndicacaoId: String(partnerId),
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parceiro = rows[0]?.parceiro || `Parceiro #${partnerId}`;

  let ultimaIndicacao: string | null = null;
  let ultimaAtivacao: string | null = null;
  for (const row of rows) {
    const cad = dateStr(row.cadastrado_em);
    if (cad && (!ultimaIndicacao || cad > ultimaIndicacao)) {
      ultimaIndicacao = cad;
    }
    const ativ = dateStr(row.ativou_em);
    if (ativ && (!ultimaAtivacao || ativ > ultimaAtivacao)) {
      ultimaAtivacao = ativ;
    }
  }

  const ativosMap = new Map<
    string,
    { plano: string; duracao: string; quantidade: number }
  >();
  for (const row of rows) {
    if (isLead(row)) continue;
    if (!isActiveByDate(row, today)) continue;
    const plano = row.nome_plano || "Outros";
    const duracao = row.duracao || "?";
    const key = `${plano}|${duracao}`;
    const prev = ativosMap.get(key) || { plano, duracao, quantidade: 0 };
    prev.quantidade += 1;
    ativosMap.set(key, prev);
  }

  const clientesAtivosPorPlano = Array.from(ativosMap.values())
    .map((v) => ({
      ...v,
      label: `${v.plano} · ${durationLabel(v.duracao)}`,
    }))
    .sort((a, b) => b.quantidade - a.quantidade);

  const clientes: PartnerClientRow[] = rows
    .filter((r) => !isLead(r))
    .map((r) => ({
      empresaId: r.empresa_id,
      plano: r.nome_plano,
      duracao: r.duracao,
      valor: num(r.valor),
      vencimento: dateStr(r.data_vencimento),
      intranet: intranetUrl(r.empresa_id),
    }))
    .sort((a, b) => b.valor - a.valor);

  return {
    parceiro,
    empresaIndicacaoId: partnerId,
    ultimaIndicacao,
    ultimaAtivacao,
    clientesAtivosPorPlano,
    clientes,
  };
}

export type ExpirationDay = {
  day: number;
  date: string;
  valor: number;
  clientes: number;
  status: "future" | "expired" | "churn" | "empty";
};

export type ExpirationListItem = {
  empresaId: number;
  empresaNome: string;
  parceiro: string;
  empresaIndicacaoId: number;
  plano: string;
  dataVencimento: string | null;
  valor: number;
  duracao: string;
  diasParaVencimento: number | null;
  situacao: "Ativo" | "Vencido" | "Churn";
  tempoAnos: number | null;
  cadastradoEm: string | null;
};

export type ExpirationsData = {
  mes: string;
  kpis: {
    valorPeriodo: number;
    clientesVencimento: number;
    ticketMedio: number;
    jaEmChurn: number;
    primeiraRenovacao: number;
  };
  calendar: ExpirationDay[];
  porPlano: { name: string; value: number; valor: number }[];
  lista: ExpirationListItem[];
  todosDoMes: ExpirationListItem[];
  totalLista: number;
  topValor: ExpirationListItem[];
  topAntigos: ExpirationListItem[];
  topParceiros: {
    empresaIndicacaoId: number;
    parceiro: string;
    valor: number;
    clientes: number;
  }[];
  cached?: boolean;
};

function situacaoOf(
  row: ClienteParceiro,
  today: Date
): "Ativo" | "Vencido" | "Churn" {
  if (isChurn(row, today)) return "Churn";
  if (!isActiveByDate(row, today)) return "Vencido";
  return "Ativo";
}

function toListItem(row: ClienteParceiro, today: Date): ExpirationListItem {
  return {
    empresaId: row.empresa_id,
    empresaNome: `Cliente #${row.empresa_id}`,
    parceiro: row.parceiro,
    empresaIndicacaoId: row.empresa_indicacao_id,
    plano: row.nome_plano,
    dataVencimento: dateStr(row.data_vencimento),
    valor: num(row.valor),
    duracao: row.duracao,
    diasParaVencimento: daysUntil(row.data_vencimento, today),
    situacao: situacaoOf(row, today),
    tempoAnos: yearsBetween(row.ativou_em || row.cadastrado_em, today),
    cadastradoEm: row.cadastrado_em ? String(row.cadastrado_em) : null,
  };
}

export async function getExpirationsData(
  filters: FilterParams
): Promise<ExpirationsData> {
  const mes = filters.mes || currentMonth();
  const key = `expirations:${filtersCacheKey(filters, mes)}`;
  const cached = cacheGet<ExpirationsData>(key);
  if (cached) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const startIdx = (page - 1) * pageSize;
    return {
      ...cached,
      lista: cached.todosDoMes.slice(startIdx, startIdx + pageSize),
      cached: true,
    };
  }

  const [yearStr, monthStr] = mes.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = `${mes}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${mes}-${String(lastDay).padStart(2, "0")}`;

  const filtered = await fetchClientes(filters);
  const normalized = filtered.filter((row) => {
    if (isLead(row)) return false;
    const d = dateStr(row.data_vencimento);
    if (!d) return false;
    return d >= start && d <= end;
  });

  const byDay = new Map<number, { valor: number; clientes: number }>();
  for (let d = 1; d <= lastDay; d++) {
    byDay.set(d, { valor: 0, clientes: 0 });
  }

  let valorPeriodo = 0;
  let jaEmChurn = 0;
  let primeiraRenovacao = 0;
  const planoMap = new Map<string, { value: number; valor: number }>();
  const partnerMap = new Map<
    number,
    { parceiro: string; valor: number; clientes: number }
  >();
  const lista: ExpirationListItem[] = [];

  for (const row of normalized) {
    const d = toDate(row.data_vencimento);
    if (!d) continue;
    const day = d.getDate();
    const slot = byDay.get(day)!;
    slot.valor += num(row.valor);
    slot.clientes += 1;
    valorPeriodo += num(row.valor);

    if (isChurn(row, today)) jaEmChurn += 1;

    const anos = yearsBetween(row.ativou_em || row.cadastrado_em, today);
    if (anos !== null && anos < 1.2) primeiraRenovacao += 1;

    const planoKey = `${row.nome_plano} - ${
      row.duracao === "A"
        ? "Anual"
        : row.duracao === "M"
          ? "Mensal"
          : row.duracao
    }`;
    const pm = planoMap.get(planoKey) || { value: 0, valor: 0 };
    pm.value += 1;
    pm.valor += num(row.valor);
    planoMap.set(planoKey, pm);

    const pid = row.empresa_indicacao_id;
    const pp = partnerMap.get(pid) || {
      parceiro: row.parceiro,
      valor: 0,
      clientes: 0,
    };
    pp.valor += num(row.valor);
    pp.clientes += 1;
    partnerMap.set(pid, pp);

    lista.push(toListItem(row, today));
  }

  const calendar: ExpirationDay[] = [];
  for (let d = 1; d <= lastDay; d++) {
    const dateStrValue = `${mes}-${String(d).padStart(2, "0")}`;
    const cellDate = new Date(year, month - 1, d);
    const slot = byDay.get(d)!;
    let status: ExpirationDay["status"] = "empty";
    if (slot.clientes > 0) {
      const diff = daysUntil(cellDate, today);
      if (diff !== null && diff <= -CHURN_DAYS) status = "churn";
      else if (diff !== null && diff < 0) status = "expired";
      else status = "future";
    }
    calendar.push({
      day: d,
      date: dateStrValue,
      valor: slot.valor,
      clientes: slot.clientes,
      status,
    });
  }

  lista.sort((a, b) => (b.valor || 0) - (a.valor || 0));

  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;
  const startIdx = (page - 1) * pageSize;

  const result: ExpirationsData = {
    mes,
    kpis: {
      valorPeriodo,
      clientesVencimento: lista.length,
      ticketMedio: lista.length > 0 ? valorPeriodo / lista.length : 0,
      jaEmChurn,
      primeiraRenovacao,
    },
    calendar,
    porPlano: Array.from(planoMap.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.value - a.value),
    lista: lista.slice(startIdx, startIdx + pageSize),
    todosDoMes: lista,
    totalLista: lista.length,
    topValor: [...lista].sort((a, b) => b.valor - a.valor).slice(0, 10),
    topAntigos: [...lista]
      .sort((a, b) => (b.tempoAnos || 0) - (a.tempoAnos || 0))
      .slice(0, 10),
    topParceiros: Array.from(partnerMap.entries())
      .map(([empresaIndicacaoId, v]) => ({ empresaIndicacaoId, ...v }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10),
    cached: false,
  };

  cacheSet(key, result, RESULT_TTL_MS);
  return result;
}
