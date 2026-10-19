import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
      timezone: "Z",
      dateStrings: true,
      charset: "utf8mb4",
    });

    pool.on("connection", (connection) => {
      connection.query("SET NAMES utf8mb4");
    });
  }
  return pool;
}

export async function query<T = unknown>(
  sql: string,
  params: (string | number | boolean | Date | null)[] = []
): Promise<T[]> {
  const [rows] = await getPool().execute(sql, params);
  return rows as T[];
}

export async function checkConnection(): Promise<boolean> {
  try {
    await query("SELECT 1 AS ok");
    return true;
  } catch {
    return false;
  }
}
