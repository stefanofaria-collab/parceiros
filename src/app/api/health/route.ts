import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { BASE_CTE } from "@/lib/sql";
import { bigQuerySnapshotHealth, isBigQuerySource } from "@/lib/bigquery";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };
const requiredVariables = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"] as const;

function safeCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && /^[A-Z][A-Z0-9_]{1,79}$/.test(code)
    ? code
    : "UNKNOWN";
}

export async function GET() {
  if (isBigQuerySource()) {
    try {
      const result = await bigQuerySnapshotHealth();
      return NextResponse.json(result, { headers });
    } catch (error) {
      console.error("[health] Falha BigQuery:", error);
      return NextResponse.json(
        { ok: false, source: "bigquery", stage: "query", code: "BQ_QUERY_FAILED" },
        { status: 503, headers }
      );
    }
  }
  const missing = requiredVariables.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, mysql: "indisponível", stage: "configuration", missing },
      { status: 503, headers }
    );
  }

  try {
    await query("SELECT 1 AS ok");
  } catch (error) {
    console.error("[health] Falha na conexão MySQL:", error);
    return NextResponse.json(
      { ok: false, mysql: "indisponível", stage: "connection", code: safeCode(error) },
      { status: 503, headers }
    );
  }

  try {
    // Valida a consulta real do dashboard, sem retornar dados de clientes.
    const rows = await query<{ empresa_id: number }>(
      `${BASE_CTE} SELECT empresa_id FROM clientes_parceiros LIMIT 1`
    );
    return NextResponse.json(
      { ok: true, mysql: "conectado", stage: "ready", query: "ok", hasRows: rows.length > 0 },
      { headers }
    );
  } catch (error) {
    console.error("[health] Falha na consulta de parceiros:", error);
    return NextResponse.json(
      { ok: false, mysql: "conectado", stage: "query", code: safeCode(error) },
      { status: 500, headers }
    );
  }
}
