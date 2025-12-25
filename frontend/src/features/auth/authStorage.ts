import type { ApiUser } from "./AuthProvider";

const STORAGE_KEY = "kampusxUser";
const TOKEN_KEY = "token";

/**
 * localStorage'dan kullanıcı bilgisini okur
 * @returns Kullanıcı bilgisi veya null
 */
export function getUser(): ApiUser | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    const parsed: ApiUser = JSON.parse(stored);
    return parsed;
  } catch (err) {
    console.error("Kullanıcı bilgisi okunamadı:", err);
    return null;
  }
}

/**
 * Kullanıcı bilgisini localStorage'a kaydeder
 * @param user Kullanıcı bilgisi
 */
export function saveUser(user: ApiUser): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch (err) {
    console.error("Kullanıcı bilgisi kaydedilemedi:", err);
  }
}

/**
 * Kullanıcı bilgisini ve token'ı localStorage'dan siler
 */
export function clearUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    console.error("Kullanıcı bilgisi silinemedi:", err);
  }
}

/**
 * Token'ı localStorage'a kaydeder
 * @param token Token string
 */
export function saveToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (err) {
    console.error("Token kaydedilemedi:", err);
  }
}

/**
 * Token'ı localStorage'dan okur
 * @returns Token string veya null
 */
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (err) {
    console.error("Token okunamadı:", err);
    return null;
  }
}




