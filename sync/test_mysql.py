"""Verifica conectividade e acesso de leitura MySQL usando sync/.env.sync."""
from __future__ import annotations

import os
import sys
from getpass import getpass
from pathlib import Path

import mysql.connector
from dotenv import load_dotenv

CONFIG = Path(__file__).resolve().parent / ".env.sync"


def main() -> int:
    if CONFIG.is_file():
        load_dotenv(CONFIG)
    required = ["DB_HOST", "DB_NAME", "DB_USER"]
    missing = [key for key in required if not os.getenv(key)]
    if missing:
        print("CONFIGURACAO: campos ausentes: " + ", ".join(missing))
        return 2
    password = os.getenv("DB_PASSWORD") or getpass("Senha MySQL (nao sera exibida): ")
    if not password:
        print("CONFIGURACAO: senha nao informada")
        return 2
    conn = None
    try:
        conn = mysql.connector.connect(
            host=os.environ["DB_HOST"],
            port=int(os.getenv("DB_PORT", "3306")),
            database=os.environ["DB_NAME"],
            user=os.environ["DB_USER"],
            password=password,
            connection_timeout=15,
        )
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT USER() AS origem, CURRENT_USER() AS conta_autenticada, "
                "DATABASE() AS banco, @@version AS versao"
            )
            result = cursor.fetchone()
            print("CONEXAO MYSQL: OK")
            print("Origem informada pelo servidor:", result["origem"])
            print("Conta autenticada:", result["conta_autenticada"])
            print("Banco selecionado:", result["banco"])
            print("Versao MySQL:", result["versao"])
            cursor.execute("SELECT 1 AS ok")
            cursor.fetchone()
            print("CONSULTA SOMENTE LEITURA: OK")
        finally:
            cursor.close()
        return 0
    except mysql.connector.Error as exc:
        print("CONEXAO MYSQL: FALHOU")
        print("Codigo:", getattr(exc, "errno", "desconhecido"))
        print("SQLSTATE:", getattr(exc, "sqlstate", "desconhecido"))
        print("Classe do erro:", type(exc).__name__)
        if getattr(exc, "errno", None) == 3118:
            print("Diagnostico: conta MySQL bloqueada para esta origem.")
        else:
            print("Confira rede, origem autorizada, credenciais e permissoes.")
        return 1
    except (ValueError, OSError) as exc:
        print("FALHA DE CONFIGURACAO:", type(exc).__name__)
        return 2
    finally:
        if conn is not None and conn.is_connected():
            conn.close()


if __name__ == "__main__":
    sys.exit(main())
