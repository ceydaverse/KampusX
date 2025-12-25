import sql from "mssql";
import dotenv from "dotenv";
import path from "path";

// ✅ .env'yi kesin backend klasöründen oku
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

let sqlConfig: sql.config | null = null;
let pool: sql.ConnectionPool | null = null;

function getSqlConfig(): sql.config {
  // Lazy initialization - sadece ilk çağrıldığında env'leri oku
  if (sqlConfig) return sqlConfig;

  function getEnv(name: string): string | undefined {
    return process.env[name]?.trim();
  }

  const DB_USER = getEnv("DB_USER");
  const DB_PASSWORD = getEnv("DB_PASSWORD");
  const DB_NAME = getEnv("DB_NAME");
  const DB_SERVER = getEnv("DB_SERVER");
  const DB_PORT_STR = getEnv("DB_PORT");

  // Env variable'lar yoksa hata fırlatma, sadece log bas
  if (!DB_USER || !DB_PASSWORD || !DB_NAME || !DB_SERVER || !DB_PORT_STR) {
    const missing = [];
    if (!DB_USER) missing.push("DB_USER");
    if (!DB_PASSWORD) missing.push("DB_PASSWORD");
    if (!DB_NAME) missing.push("DB_NAME");
    if (!DB_SERVER) missing.push("DB_SERVER");
    if (!DB_PORT_STR) missing.push("DB_PORT");
    throw new Error(`Missing DB env vars: ${missing.join(", ")}`);
  }

  const DB_PORT = Number(DB_PORT_STR);
  if (Number.isNaN(DB_PORT)) {
    throw new Error(`DB_PORT is not a number: "${DB_PORT_STR}"`);
  }

  sqlConfig = {
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    server: DB_SERVER,
    port: DB_PORT,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };

  return sqlConfig;
}

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) return pool;

  try {
    // Lazy config initialization
    const config = getSqlConfig();
    pool = await new sql.ConnectionPool(config).connect();
    console.log("✅ DB connected");
    return pool;
  } catch (err: any) {
    console.error("❌ MSSQL bağlantı hatası:", {
      message: err?.message,
      code: err?.code,
      originalError: err?.originalError?.message,
    });
    pool = null;
    throw err;
  }
}

export { sql };

