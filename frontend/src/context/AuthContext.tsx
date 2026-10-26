import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, storage } from "@/lib/api";
import type { Role, User } from "@/types";

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: Role;
  phone?: string;
}

interface AuthValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  /** true si el usuario tiene alguno de los roles indicados */
  hasRole: (...roles: Role[]) => boolean;
}

export const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Al cargar la app, si hay token guardado se valida contra /auth/profile
  useEffect(() => {
    if (!storage.getToken()) { setLoading(false); return; }
    api.auth.profile()
      .then(setUser)
      .catch(() => storage.clear())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api.auth.login({ email, password });
    storage.setToken(r.token);
    setUser(r.user);
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const r = await api.auth.register(data);
    storage.setToken(r.token);
    setUser(r.user);
  }, []);

  const logout = useCallback(() => { storage.clear(); setUser(null); }, []);

  const hasRole = useCallback((...roles: Role[]) => !!user && roles.includes(user.role), [user]);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, hasRole }),
    [user, loading, login, register, logout, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
