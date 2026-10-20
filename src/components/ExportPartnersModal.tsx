"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText, Sheet, X } from "lucide-react";
import {
  exportPartnersCsv,
  exportPartnersGoogleSheets,
  exportPartnersXlsx,
} from "@/lib/exportPartners";
import { PartnerExportRow } from "@/lib/types";

type Props = {
  open: boolean;
  queryString: string;
  onClose: () => void;
};

export function ExportPartnersModal({ open, queryString, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const run = async (format: "csv" | "xlsx" | "sheets") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/partners/export?${queryString}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Falha na exportação");
      const items = (json.items || []) as PartnerExportRow[];
      if (format === "csv") exportPartnersCsv(items);
      else if (format === "xlsx") exportPartnersXlsx(items);
      else await exportPartnersGoogleSheets(items);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao exportar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[#122033]">
              Exportar parceiros
            </h3>
            <p className="text-sm text-[#6b7280]">
              Escolha o formato. Os filtros aplicados serão respeitados.
            </p>
          </div>
          <button type="button" className="btn-secondary !px-2" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <button
            type="button"
            className="btn-secondary w-full justify-start"
            disabled={loading}
            onClick={() => run("sheets")}
          >
            <Sheet className="h-4 w-4 text-brand" />
            Google Sheets
          </button>
          <button
            type="button"
            className="btn-secondary w-full justify-start"
            disabled={loading}
            onClick={() => run("csv")}
          >
            <FileText className="h-4 w-4 text-brand" />
            CSV
          </button>
          <button
            type="button"
            className="btn-secondary w-full justify-start"
            disabled={loading}
            onClick={() => run("xlsx")}
          >
            <FileSpreadsheet className="h-4 w-4 text-brand" />
            XLSX
          </button>
        </div>

        {loading && (
          <p className="mt-3 text-center text-xs text-[#6b7280]">
            Preparando exportação…
          </p>
        )}

        <p className="mt-4 text-xs text-[#8b95a5]">
          No Google Sheets, os dados são copiados e uma planilha nova é aberta —
          basta colar com Ctrl+V (ou Cmd+V).
        </p>
      </div>
    </div>
  );
}
