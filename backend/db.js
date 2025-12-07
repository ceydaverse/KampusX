const sql = require("mssql");

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function connectDB() {
  try {
    await sql.connect(config);
    console.log("MSSQL bağlantısı başarılı");
  } catch (err) {
    console.error("Veritabanı bağlantı hatası:", err);
  }
}

module.exports = { connectDB, sql };

