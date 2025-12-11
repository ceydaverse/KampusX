import bcrypt from "bcryptjs";

async function main() {
  const plainPassword = "123456"; // seed kullanıcıların şifresi
  const hash = await bcrypt.hash(plainPassword, 10);
  console.log("Bu şifre için hash:", hash);
}

main();
