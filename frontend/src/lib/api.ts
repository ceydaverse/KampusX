import axios from "axios";

// API base URL - env'den oku, yoksa varsayılan localhost:5001
// Kesinlikle http:// kullan (https/wss kullanma)
let API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";
// wss:// veya https:// varsa http://'ye çevir
if (API_URL.startsWith("wss://") || API_URL.startsWith("https://")) {
  API_URL = API_URL.replace(/^wss?:\/\//, "http://").replace(/^https:\/\//, "http://");
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Backend health check fonksiyonu
let backendStatus: boolean | null = null;
let lastHealthCheck: number = 0;
const HEALTH_CHECK_INTERVAL = 5000; // 5 saniye

export async function checkBackendHealth(): Promise<boolean> {
  const now = Date.now();
  // Cache: 5 saniye içinde tekrar kontrol etme
  if (backendStatus !== null && now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
    return backendStatus;
  }

  try {
    const response = await axios.get(`${API_URL}/health`, {
      timeout: 3000,
      withCredentials: false,
    });
    backendStatus = response.data?.ok === true;
    lastHealthCheck = now;
    return backendStatus;
  } catch (err) {
    backendStatus = false;
    lastHealthCheck = now;
    console.warn("⚠️ Backend health check failed:", err);
    return false;
  }
}

// Export backend status getter
export function getBackendStatus(): boolean | null {
  return backendStatus;
}

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
          // Debug log (sadece likes endpoint'i için)
          if (config.url?.includes("/likes")) {
            console.log("API INTERCEPTOR: x-user-id header eklendi:", userId, "user object:", user);
          }
        } else {
          // Debug log (sadece likes endpoint'i için)
          if (config.url?.includes("/likes")) {
            console.warn("API INTERCEPTOR: user.id bulunamadı, user object:", user);
          }
        }
      } else {
        // Debug log (sadece likes endpoint'i için)
        if (config.url?.includes("/likes")) {
          console.warn("API INTERCEPTOR: kampusxUser localStorage'da yok");
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



