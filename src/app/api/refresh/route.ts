import { NextResponse } from "next/server";
import { invalidateDataCache, loadBaseRows } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Força recarga do MySQL e grava o cache do dia. Use só no botão Atualizar. */
export async function POST() {
  try {
    invalidateDataCache();
    const rows = await loadBaseRows(true);
    return NextResponse.json({
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
