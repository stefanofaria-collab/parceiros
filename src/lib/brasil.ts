/** Normaliza UF / nome do estado para sigla de 2 letras. */
const NOME_PARA_UF: Record<string, string> = {
  acre: "AC",
  alagoas: "AL",
  amapa: "AP",
  amazonas: "AM",
  bahia: "BA",
  ceara: "CE",
  "distrito federal": "DF",
  "espirito santo": "ES",
  goias: "GO",
  maranhao: "MA",
  "mato grosso": "MT",
  "mato grosso do sul": "MS",
  "minas gerais": "MG",
  para: "PA",
  paraiba: "PB",
  parana: "PR",
  pernambuco: "PE",
  piaui: "PI",
  "rio de janeiro": "RJ",
  "rio grande do norte": "RN",
  "rio grande do sul": "RS",
  rondonia: "RO",
  roraima: "RR",
  "santa catarina": "SC",
  "sao paulo": "SP",
  sergipe: "SE",
  tocantins: "TO",
};

export const UF_NOMES: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

export const ALL_UFS = Object.keys(UF_NOMES);

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeUF(estado: string | null | undefined): string | null {
  if (!estado) return null;
  const raw = String(estado).trim();
  if (!raw) return null;
  if (raw.length === 2) {
    const uf = raw.toUpperCase();
    return UF_NOMES[uf] ? uf : null;
  }
  const key = stripAccents(raw).toLowerCase();
  return NOME_PARA_UF[key] || null;
}

/** Escala azul: claro → escuro conforme valor / max. */
export function blueHeatColor(value: number, max: number): string {
  if (!max || value <= 0) return "#e8f4f8";
  const t = Math.min(1, value / max);
  // #dbeafe → #01636b
  const r = Math.round(219 + (1 - 219) * t);
  const g = Math.round(234 + (99 - 234) * t);
  const b = Math.round(254 + (107 - 254) * t);
  return `rgb(${r},${g},${b})`;
}

export function tipoCobrancaLabel(tipo: string | null | undefined): string {
  const t = String(tipo || "").toUpperCase();
  if (t === "E") return "Cliente";
  if (t === "P") return "Parceiro";
  return tipo || "—";
}
