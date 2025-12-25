import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// .env dosyasının path'ini belirle
const envPath = path.resolve(process.cwd(), ".env");

console.log("=".repeat(50));
console.log("🔍 ENV DEBUG SCRIPT");
console.log("=".repeat(50));
console.log("CWD:", process.cwd());
console.log("Looking for .env at:", envPath);
console.log(".env file exists:", fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  const stats = fs.statSync(envPath);
  console.log(".env file size:", stats.size, "bytes");
  console.log(".env file modified:", stats.mtime);
}


const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error("❌ dotenv.config() ERROR:", result.error);
} else {
  console.log("✅ dotenv.config() loaded:", result.parsed ? Object.keys(result.parsed).length : 0, "variables");
}

console.log("\n" + "=".repeat(50));
console.log("📋 ENVIRONMENT VARIABLES");
console.log("=".repeat(50));

const envVars = ["DB_USER", "DB_PASSWORD", "DB_SERVER", "DB_PORT", "DB_NAME", "PORT"];

envVars.forEach((varName) => {
  const value = process.env[varName];
  if (value) {
    // Şifreleri gizle
    const displayValue = varName.includes("PASSWORD") ? "***" : value;
    console.log(`${varName}: ${displayValue}`);
  } else {
    console.log(`${varName}: ❌ UNDEFINED`);
  }
});

console.log("=".repeat(50));

