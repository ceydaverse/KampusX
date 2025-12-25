import type { ApiUser } from "./AuthProvider";

// localStorage key'leri - merkezi sabitler
const USER_KEY = "kampusxUser";
const TOKEN_KEY = "kampusxToken";

// ==================== USER FUNCTIONS ====================

/**
 * localStorage'dan kullanıcı bilgisini getir
 * @returns ApiUser | null
 */
export function getUser(): ApiUser | null {
  try {
    const stored = localStorage.getItem(USER_KEY);
    if (!stored) {
      return null;
    }
    const user = JSON.parse(stored) as ApiUser;
    return user;
  } catch (err) {
    console.error("getUser error:", err);
    return null;
  }
}

/**
 * Kullanıcı bilgisini localStorage'a kaydet
 * @param user ApiUser
 */
export function saveUser(user: ApiUser): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.error("saveUser error:", err);
  }
}

/**
 * Kullanıcı bilgisini localStorage'dan temizle
 */
export function clearUser(): void {
  try {
    localStorage.removeItem(USER_KEY);
  } catch (err) {
    console.error("clearUser error:", err);
  }
}

// ==================== TOKEN FUNCTIONS ====================

/**
 * localStorage'dan token'ı getir
 * @returns string | null
 */
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (err) {
    console.error("getToken error:", err);
    return null;
  }
}

/**
 * Token'ı localStorage'a kaydet
 * @param token string
 */
export function saveToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (err) {
    console.error("saveToken error:", err);
  }
}

/**
 * Token'ı localStorage'dan temizle
 */
export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    console.error("clearToken error:", err);
  }
}

// ==================== AUTH FUNCTIONS ====================

/**
 * Tüm auth bilgilerini temizle (user + token)
 */
export function clearAuth(): void {
  clearUser();
  clearToken();
}
