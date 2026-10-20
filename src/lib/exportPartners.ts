import * as XLSX from "xlsx";
import { PartnerExportRow } from "./types";

const HEADERS = [
  "Empresa Indicação ID",
  "Tipo de cobrança",
  "Quantidade de indicações",
  "Quantidade de ativações",
  "Taxa de conversão",
  "Estado",
  "Parceiro",
  "Telefone",
  "Celular",
  "E-mail",
] as const;

function toMatrix(rows: PartnerExportRow[]): (string | number)[][] {
  return [
    [...HEADERS],
    ...rows.map((r) => [
      r.empresaIndicacaoId,
      r.tipoCobranca,
      r.quantidadeIndicacoes,
      r.quantidadeAtivacoes,
      r.taxaConversao,
      r.estado,
      r.parceiro,
      r.telefone,
      r.celular,
      r.email,
    ]),
  ];
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPartnersCsv(rows: PartnerExportRow[]) {
  const matrix = toMatrix(rows);
  const csv = matrix
    .map((line) =>
      line
        .map((cell) => {
          const s = String(cell ?? "");
          if (/[;"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
          return s;
        })
        .join(";")
    )
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  downloadBlob(blob, `parceiros_${stamp()}.csv`);
}

export function exportPartnersXlsx(rows: PartnerExportRow[]) {
  const matrix = toMatrix(rows);
  const ws = XLSX.utils.aoa_to_sheet(matrix);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Parceiros");
  XLSX.writeFile(wb, `parceiros_${stamp()}.xlsx`);
}

/** Copia TSV para a área de transferência e abre uma planilha nova no Sheets. */
export async function exportPartnersGoogleSheets(rows: PartnerExportRow[]) {
  const matrix = toMatrix(rows);
  const tsv = matrix
    .map((line) =>
      line
        .map((cell) => {
          const s = String(cell ?? "");
          // Aspas se houver tab/quebra de linha (padrão TSV).
          if (/[\t\n"]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
          return s;
        })
        .join("\t")
    )
    .join("\n");

  try {
    await navigator.clipboard.writeText(tsv);
  } catch {
    // Fallback para ambientes sem permissão de clipboard API.
    const ta = document.createElement("textarea");
    ta.value = tsv;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (!ok) throw new Error("Não foi possível copiar para a área de transferência");
  }

  window.open("https://sheets.new", "_blank", "noopener,noreferrer");
}

function stamp() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}_${String(d.getHours()).padStart(2, "0")}${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}
