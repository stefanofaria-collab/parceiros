export type FilterParams = {
  parceiro?: string;
  empresaIndicacaoId?: string;
  nomePlano?: string;
  duracao?: string;
  cadastroDe?: string;
  cadastroAte?: string;
  ativacaoDe?: string;
  ativacaoAte?: string;
  vencimentoDe?: string;
  vencimentoAte?: string;
  responsavelPagamento?: "Todos" | "Cliente" | "Parceiro";
  leadsAtivos?: "Todos" | "Sim" | "Nao";
  clientesAtivos?: "Todos" | "Sim" | "Nao";
  mes?: string; // YYYY-MM for vencimentos
  page?: number;
  pageSize?: number;
};

export type ClienteParceiro = {
  empresa_id: number;
  cadastrado_em: string | Date | null;
  ativou_em: string | Date | null;
  nome_plano: string;
  duracao: string;
  data_vencimento: string | Date | null;
  valor: number;
  empresa_indicacao_id: number;
  parceiro: string;
  tipo_cobranca?: string | null;
};

export type PartnerSummary = {
  empresaIndicacaoId: number;
  parceiro: string;
  totalLeads: number;
  leadsAtivos: number;
  totalClientes: number;
  clientesAtivos: number;
  ativacoes3m: number;
  faturamento: number;
  taxaConversao: number;
  taxaChurn: number;
  tempoMedioConversaoDias: number | null;
  planos: Record<string, number>;
};

export type PartnerClientRow = {
  empresaId: number;
  plano: string;
  duracao: string;
  valor: number;
  vencimento: string | null;
  intranet: string;
};

export type DashboardData = {
  totalParceiros: number;
  totalLeads: number;
  leadsAtivos: number;
  totalClientes: number;
  clientesAtivos: number;
  faturamentoAtivo: number;
  taxaConversao: number;
  taxaChurn: number;
  ativacoes3m: number;
  tempoMedioConversaoDias: number | null;
  planosVendidos: { plano: string; quantidade: number; valor: number }[];
  topParceiros: PartnerSummary[];
  evolucaoLeads: { mes: string; ativos: number; novos: number }[];
  dbOk: boolean;
  cached?: boolean;
};
