import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000",
});

// Request interceptor: Her istekte x-user-id header'ını ekle
api.interceptors.request.use(
  (config) => {
    try {
      const stored = localStorage.getItem("kampusxUser");
      if (stored) {
        const user = JSON.parse(stored);
        // Güvenli userId alma: id veya kullanici_id
        const userId = user?.id ?? user?.kullanici_id;
        if (userId) {
          config.headers["x-user-id"] = String(userId);
        }
      }
    } catch (err) {
      console.error("User ID header eklenirken hata:", err);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;



