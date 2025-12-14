import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

// SQL Server bağlantı ayarları
const sqlConfig: sql.config = {
  user: process.env.DB_USER,         // Örn: sa
  password: process.env.DB_PASSWORD, // Örn: harikaceren
  database: process.env.DB_NAME,     // Örn: KampusX
  server: process.env.DB_SERVER || 'localhost', 
  port:1433,                        // MSSQL'in varsayılan portu
  options: {
    encrypt: false,                  // Lokal ortamda false olmalı
    trustServerCertificate: true     // SSL hatalarına karşı true olmalı
  }
};

let pool: sql.ConnectionPool | null = null;

// Bağlantı havuzu oluştur veya mevcut olanı döndür
export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool) return pool;

  try {
    pool = await sql.connect(sqlConfig);
    console.log('MSSQL bağlantısı başarılı 🚀');
    return pool;
  } catch (err) {
    console.error('MSSQL bağlantı hatası ❌:', err);
    throw err;
  }
}

export { sql };

