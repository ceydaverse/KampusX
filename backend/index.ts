import express from "express";

const app = express();
const PORT = 5000;

app.get("/", (_req, res) => {
  res.send("Backend çalışıyor 🚀");
});

app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
});
