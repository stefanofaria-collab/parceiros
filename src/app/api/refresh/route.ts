import { NextResponse } from "next/server";
import { invalidateDataCache, loadBaseRows } from "@/lib/data";
import { isBigQuerySource } from "@/lib/bigquery";

export const dynamic = "force-dynamic";

/** Recarrega o cache da fonte configurada; não executa sincronização no Windows. */
export async function POST() {
  try {
    invalidateDataCache();
    const rows = await loadBaseRows(true);
    return NextResponse.json({
      source: isBigQuerySource() ? "bigquery" : "mysql",
      ok: true,
      rows: rows.length,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: "Falha ao atualizar cache" },
      { status: 500 }
    );
  }
}
