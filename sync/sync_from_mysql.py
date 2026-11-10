#!/usr/bin/env python3
"""Sincroniza snapshot do MySQL ao BigQuery, sem logs de dados pessoais."""
from __future__ import annotations

import os
import re
import sys
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path

import mysql.connector
from dotenv import load_dotenv
from google.api_core.exceptions import NotFound
from google.cloud import bigquery

ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = Path(__file__).resolve().parent / ".env.sync"

COLUMN_TYPES = {
    "empresa_id": "INTEGER",
    "modalidade": "STRING",
    "tipo_cobranca": "STRING",
    "tipo_cobranca_parceiro": "STRING",
    "cadastrado_em": "STRING",
    "ativou_em": "STRING",
    "nome_plano": "STRING",
    "duracao": "STRING",
    "data_vencimento": "STRING",
    "valor": "NUMERIC",
    "empresa_indicacao_id": "INTEGER",
    "estado": "STRING",
    "parceiro": "STRING",
    "telefone": "STRING",
    "celular": "STRING",
    "email": "STRING",
    "synced_at": "TIMESTAMP",
}


def required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Variável obrigatória não configurada: {name}")
    return value


def load_query() -> str:
    source = (ROOT / "src" / "lib" / "sql.ts").read_text(encoding="utf-8")
    values = {}
    quote = chr(96)
    for key in ("EXCLUDED_IDS_PARCEIROS", "EXCLUDED_IDS_CLIENTES", "BASE_CTE"):
        match = re.search(
            rf"export\s+const\s+{key}\s*=\s*" + quote + r"([\s\S]*?)" + quote + r"\s*;",
            source,
        )
        if not match:
            raise RuntimeError(f"Não foi possível obter {key} do SQL do projeto")
        values[key] = match.group(1)

    query = values["BASE_CTE"]
    for key in ("EXCLUDED_IDS_PARCEIROS", "EXCLUDED_IDS_CLIENTES"):
        query = query.replace("$" + "{" + key + "}", values[key])
    if "$" + "{" in query:
        raise RuntimeError("O SQL possui variáveis não resolvidas; carga cancelada")
    return query + "\nSELECT * FROM clientes_parceiros"


def as_json_value(value: object, field_type: str):
    if value is None:
        return None
    if field_type == "INTEGER":
        return int(value)
    if field_type == "NUMERIC":
        return str(Decimal(str(value)))
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(value, date):
        return value.isoformat()
    return str(value)


def fetch_mysql_rows() -> list[dict]:
    connection = mysql.connector.connect(
        host=required("DB_HOST"),
        port=int(os.getenv("DB_PORT", "3306")),
        database=required("DB_NAME"),
        user=required("DB_USER"),
        password=required("DB_PASSWORD"),
        connection_timeout=30,
        autocommit=True,
    )
    try:
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute(load_query())
            rows = cursor.fetchall()
        finally:
            cursor.close()
    finally:
        connection.close()

    if not rows:
        raise RuntimeError("A consulta MySQL não retornou dados: snapshot preservado")

    max_rows = int(os.getenv("MAX_SYNC_ROWS", "250000"))
    if len(rows) > max_rows:
        raise RuntimeError(
            f"Consulta retornou {len(rows)} registros, acima do limite de {max_rows}"
        )
    synced_at = datetime.now(timezone.utc).isoformat()
    result = []
    for row in rows:
        item = {
            name: as_json_value(row.get(name), field_type)
            for name, field_type in COLUMN_TYPES.items()
            if name != "synced_at"
        }
        item["synced_at"] = synced_at
        result.append(item)
    return result


def sync_to_bigquery(rows: list[dict]) -> str:
    project = required("BQ_PROJECT_ID")
    dataset_name = os.getenv("BQ_DATASET", "parceiros").strip()
    table_name = os.getenv("BQ_TABLE", "clientes_parceiros").strip()
    location = os.getenv("BQ_LOCATION", "US").strip()

    if not re.fullmatch(r"[a-z][a-z0-9-]{4,61}[a-z0-9]", project):
        raise RuntimeError("BQ_PROJECT_ID inválido")
    for name, value in (("BQ_DATASET", dataset_name), ("BQ_TABLE", table_name)):
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", value):
            raise RuntimeError(f"{name} inválido")
    if not re.fullmatch(r"[A-Za-z][A-Za-z0-9_-]*", location):
        raise RuntimeError("BQ_LOCATION inválido")

    client = bigquery.Client(project=project, location=location)
    dataset_id = f"{project}.{dataset_name}"
    try:
        client.get_dataset(dataset_id)
    except NotFound:
        dataset = bigquery.Dataset(dataset_id)
        dataset.location = location
        client.create_dataset(dataset)
        print(f"Dataset criado: {dataset_id} ({location})")

    target = f"{dataset_id}.{table_name}"
    staging = f"{dataset_id}.{table_name}_stage_{uuid.uuid4().hex[:12]}"
    schema = [
        bigquery.SchemaField(name, kind, mode="NULLABLE")
        for name, kind in COLUMN_TYPES.items()
    ]
    job_config = bigquery.LoadJobConfig(
        schema=schema,
        write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
        source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON,
    )
    try:
        load_job = client.load_table_from_json(
            rows, staging, job_config=job_config, location=location
        )
        load_job.result(timeout=600)
        staged = client.get_table(staging)
        if staged.num_rows != len(rows):
            raise RuntimeError(
                f"Carga incompleta: {staged.num_rows} de {len(rows)} registros"
            )

        promote = (
            f"CREATE OR REPLACE TABLE {chr(96)}{target}{chr(96)} "
            f"AS SELECT * FROM {chr(96)}{staging}{chr(96)}"
        )
        client.query(promote, location=location).result(timeout=600)
    finally:
        client.delete_table(staging, not_found_ok=True)
    return target


def main() -> int:
    load_dotenv(ENV_PATH, override=False)
    credential_path = os.getenv("GCP_SYNC_CREDENTIALS", "").strip()
    if credential_path:
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(
            Path(credential_path).expanduser().resolve()
        )
    try:
        print(f"[{datetime.now().astimezone().isoformat(timespec='seconds')}] Início")
        rows = fetch_mysql_rows()
        print(f"MySQL consultado: {len(rows)} registros (sem dados no log)")
        target = sync_to_bigquery(rows)
        print(f"Sincronização concluída: {len(rows)} registros em {target}")
        return 0
    except Exception as exc:
        print(f"Sincronização falhou: {type(exc).__name__}", file=sys.stderr)
        print("Verifique conectividade e permissões da origem e destino.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
