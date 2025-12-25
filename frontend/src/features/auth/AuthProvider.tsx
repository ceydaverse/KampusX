import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getUser, saveUser, clearUser } from "./authStorage";

// User tipi
export interface ApiUser {
  id: number;
  ad: string;
  soyad: string;
  email: string;
  universite?: string | null;
  bolum?: string | null;
  cinsiyet?: string | null;
  kullanici_adi?: string | null;
}

interface AuthContextType {
  user: ApiUser | null;
  setUser: (user: ApiUser | null) => void;
  login: (user: ApiUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Initial state: localStorage'dan oku
  const [user, setUserState] = useState<ApiUser | null>(getUser);

  // Hydrate: Sayfa açıldığında localStorage'dan user oku
  useEffect(() => {
    const storedUser = getUser();
    setUserState(storedUser);
  }, []);

  // Login: localStorage'a kaydet + state güncelle
  const login = (userData: ApiUser) => {
    saveUser(userData);
    setUserState(userData);
  };

  // Logout: localStorage'dan sil + state temizle
  const logout = () => {
    clearUser(); // Kullanıcı ve token'ı temizler
    setUserState(null);
  };

  // setUser: Direkt state güncelleme (ihtiyaç durumunda)
  const setUser = (userData: ApiUser | null) => {
    if (userData) {
      login(userData);
    } else {
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

