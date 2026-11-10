/**
 * Leitor BigQuery via API REST oficial.
 * Usa apenas APIs nativas do Node.js para manter o package-lock.
 */
import fs from "node:fs";
import { createSign } from "node:crypto";
import type { ClienteParceiro } from "./types";

type ServiceAccount = { client_email: string; private_key: string };
type BqValue = { v: string | null };
type BqResponse = {
  jobComplete?: boolean;
  jobReference?: { jobId: string };
  schema?: { fields: Array<{ name: string }> };
  rows?: Array<{ f: BqValue[] }>;
  pageToken?: string;
  errors?: unknown[];
};

let cachedToken: { token: string; expiresAt: number } | null = null;

export function isBigQuerySource(): boolean {
  return (process.env.DATA_SOURCE || "mysql").toLowerCase() === "bigquery";
}

function settings() {
  const project = process.env.BQ_PROJECT_ID || "";
  const dataset = process.env.BQ_DATASET || "parceiros";
  const table = process.env.BQ_TABLE || "clientes_parceiros";
  const location = process.env.BQ_LOCATION || "US";
  if (!/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(project)) {
    throw new Error("BQ_PROJECT_ID ausente ou inválido");
  }
  if (!/^[A-Za-z_][A-Za-z_0-9]*$/.test(dataset) ||
      !/^[A-Za-z_][A-Za-z_0-9]*$/.test(table)) {
    throw new Error("BQ_DATASET ou BQ_TABLE inválido");
  }
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(location)) {
    throw new Error("BQ_LOCATION inválido");
  }
  return { project, dataset, table, location };
}

export function bigQueryTableId(): string {
  const { project, dataset, table } = settings();
  return [project, dataset, table].join(".");
}

function serviceAccount(): ServiceAccount {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS não configurado no servidor");
  }
  const data = JSON.parse(fs.readFileSync(credentialsPath, "utf8")) as ServiceAccount;
  if (!data.client_email || !data.private_key) {
    throw new Error("Credencial Google Cloud inválida");
  }
  return data;
}

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 90_000) {
    return cachedToken.token;
  }
  const account = serviceAccount();
  const now = Math.floor(Date.now() / 1000);
  const base64 = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = [
    base64({ alg: "RS256", typ: "JWT" }),
    base64({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/bigquery",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  ].join(".");
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = unsigned + "." + signer.sign(account.private_key, "base64url");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error("Falha na autenticação Google Cloud (HTTP " + response.status + ")");
  }
  const result = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!result.access_token) throw new Error("Google Cloud não retornou token");
  cachedToken = {
    token: result.access_token,
    expiresAt: Date.now() + (result.expires_in || 3600) * 1000,
  };
  return cachedToken.token;
}

async function apiJson(url: string, init: RequestInit = {}): Promise<BqResponse> {
  const token = await accessToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const body = await response.text();
    console.error("[bigquery] HTTP", response.status, body.slice(0, 350));
    throw new Error("Consulta BigQuery indisponível (HTTP " + response.status + ")");
  }
  return (await response.json()) as BqResponse;
}

export async function runBigQuerySql(sql: string): Promise<Record<string, string | null>[]> {
  const { project, location } = settings();
  const base = "https://bigquery.googleapis.com/bigquery/v2/projects/" +
    encodeURIComponent(project) + "/queries";
  const maxBytes = process.env.BQ_MAX_BYTES_BILLED || "1073741824";
  if (!/^[1-9][0-9]*$/.test(maxBytes)) {
    throw new Error("BQ_MAX_BYTES_BILLED deve ser inteiro positivo");
  }
  let response = await apiJson(base, {
    method: "POST",
    body: JSON.stringify({
      query: sql,
      useLegacySql: false,
      location,
      timeoutMs: 30000,
      maxResults: 10000,
      maximumBytesBilled: maxBytes,
    }),
  });
  const jobId = response.jobReference?.jobId;
  if (!jobId) throw new Error("BigQuery não retornou ID da consulta");

  const results: Record<string, string | null>[] = [];
  let columns = response.schema?.fields.map((f) => f.name) || [];
  let attempts = 0;
  for (;;) {
    if (response.jobComplete) {
      columns = response.schema?.fields.map((f) => f.name) || columns;
      if (response.errors?.length) throw new Error("Consulta BigQuery retornou erros");
      for (const row of response.rows || []) {
        const entry: Record<string, string | null> = {};
        row.f.forEach((v, i) => { entry[columns[i]] = v.v; });
        results.push(entry);
      }
    }
    if (response.jobComplete && !response.pageToken) break;
    if (++attempts > 100) throw new Error("BigQuery excedeu limite de páginas/espera");
    const params = new URLSearchParams({
      location,
      maxResults: "10000",
      timeoutMs: "30000",
    });
    if (response.jobComplete && response.pageToken) {
      params.set("pageToken", response.pageToken);
    }
    response = await apiJson(base + "/" + encodeURIComponent(jobId) + "?" + params);
  }
  return results;
}

export async function loadBigQueryRows(): Promise<ClienteParceiro[]> {
  const fields = [
    "empresa_id", "modalidade", "tipo_cobranca", "tipo_cobranca_parceiro",
    "cadastrado_em", "ativou_em", "nome_plano", "duracao",
    "data_vencimento", "valor", "empresa_indicacao_id", "estado",
    "parceiro", "telefone", "celular", "email",
  ];
  const quote = String.fromCharCode(96);
  const raw = await runBigQuerySql(
    "SELECT " + fields.map((f) => quote + f + quote).join(", ") +
    " FROM " + quote + bigQueryTableId() + quote
  );
  return raw.map((r) => ({
    empresa_id: Number(r.empresa_id) || 0,
    modalidade: r.modalidade,
    tipo_cobranca: r.tipo_cobranca,
    tipo_cobranca_parceiro: r.tipo_cobranca_parceiro,
    cadastrado_em: r.cadastrado_em,
    ativou_em: r.ativou_em,
    nome_plano: r.nome_plano || "",
    duracao: r.duracao || "",
    data_vencimento: r.data_vencimento,
    valor: Number(r.valor) || 0,
    empresa_indicacao_id: Number(r.empresa_indicacao_id) || 0,
    estado: r.estado,
    parceiro: r.parceiro || "",
    telefone: r.telefone,
    celular: r.celular,
    email: r.email,
  }));
}

export async function bigQuerySnapshotHealth() {
  const quote = String.fromCharCode(96);
  const rows = await runBigQuerySql(
    "SELECT COUNT(*) AS total, " +
    "FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', MAX(synced_at)) AS lastSync " +
    "FROM " + quote + bigQueryTableId() + quote
  );
  return {
    ok: true,
    source: "bigquery",
    stage: "ready",
    rows: Number(rows[0]?.total || 0),
    lastSync: rows[0]?.lastSync || null,
  };
}
