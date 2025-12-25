import api from "../../lib/api";

export interface ApiUser {
  id: number;
  ad: string;
  soyad: string;
  email: string;
  universite?: string | null;
  bolum?: string | null;
  cinsiyet?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  ad: string;
  soyad: string;
  email: string;
  password: string;
  universite?: string | null;
  bolum?: string | null;
  cinsiyet?: string | null;
  dogum_yili?: number | null;
}

export interface AuthResponse {
  success: boolean;
  user?: ApiUser;
  message?: string;
  token?: string;
}

export async function login(credentials: LoginRequest): Promise<AuthResponse> {
  try {
    const response = await api.post<AuthResponse>("/api/auth/login", credentials);
    return response.data;
  } catch (err: any) {
    throw {
      message: err?.response?.data?.message || "Giriş yapılırken bir hata oluştu.",
      response: err?.response,
    };
  }
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  try {
    const response = await api.post<AuthResponse>("/api/auth/register", data);
    return response.data;
  } catch (err: any) {
    throw {
      message: err?.response?.data?.message || "Kayıt olurken bir hata oluştu.",
      response: err?.response,
    };
  }
}













