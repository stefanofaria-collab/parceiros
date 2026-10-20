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
  ultimaIndicacaoDe?: string;
  ultimaIndicacaoAte?: string;
  ultimaAtivacaoDe?: string;
  ultimaAtivacaoAte?: string;
  minIndicacoes?: string;
  maxIndicacoes?: string;
  minAtivacoes?: string;
  maxAtivacoes?: string;
  responsavelPagamento?: "Todos" | "Cliente" | "Parceiro";
  leadsAtivos?: "Todos" | "Sim" | "Nao";
  clientesAtivos?: "Todos" | "Sim" | "Nao";
  mes?: string;
  page?: number;
  pageSize?: number;
  mapaModo?: "clientes" | "parceiros";
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
  tipo_cobranca_parceiro?: string | null;
  estado?: string | null;
  telefone?: string | null;
  celular?: string | null;
  email?: string | null;
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
  tipoCobranca?: string | null;
  estado?: string | null;
  telefone?: string | null;
  celular?: string | null;
  email?: string | null;
  quantidadeIndicacoes: number;
  quantidadeAtivacoes: number;
};

export type PartnerExportRow = {
  empresaIndicacaoId: number;
  tipoCobranca: string;
  quantidadeIndicacoes: number;
  quantidadeAtivacoes: number;
  taxaConversao: number;
  estado: string;
  parceiro: string;
  telefone: string;
  celular: string;
  email: string;
};

export type PartnerClientRow = {
  empresaId: number;
  plano: string;
  duracao: string;
  valor: number;
  vencimento: string | null;
  intranet: string;
};

export type PartnerDetailData = {
  parceiro: string;
  empresaIndicacaoId: number;
  ultimaIndicacao: string | null;
  ultimaAtivacao: string | null;
  clientesAtivosPorPlano: {
    label: string;
    plano: string;
    duracao: string;
    quantidade: number;
  }[];
  clientes: PartnerClientRow[];
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
  planosPorDuracao: { duracao: string; label: string; quantidade: number }[];
  topParceiros: PartnerSummary[];
  evolucaoIndicacoes: { mes: string; quantidade: number }[];
  evolucaoAtivacoes: { mes: string; quantidade: number }[];
  evolucaoLeads: { mes: string; ativos: number; novos: number }[];
  dbOk: boolean;
  cached?: boolean;
};

export type MapStateRow = {
  uf: string;
  nome: string;
  valor: number;
};

export type MapData = {
  modo: "clientes" | "parceiros";
  states: MapStateRow[];
  max: number;
  total: number;
};

export type MapStatePartnerItem = {
  empresaIndicacaoId: number;
  parceiro: string;
  tipoCobranca: string;
  quantidadeIndicacoes: number;
  quantidadeAtivacoes: number;
  clientesAtivos: number;
  telefone: string;
  celular: string;
  email: string;
};

export type MapStateClientItem = {
  empresaId: number;
  plano: string;
  duracao: string;
  valor: number;
  vencimento: string | null;
  parceiro: string;
  empresaIndicacaoId: number;
  intranet: string;
};

export type MapStateDetail = {
  uf: string;
  nome: string;
  modo: "clientes" | "parceiros";
  total: number;
  parceiros: MapStatePartnerItem[];
  clientes: MapStateClientItem[];
};
