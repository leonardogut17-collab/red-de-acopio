import type {
  AdminUser, AuthResponse, Center, CenterDetail, Delivery, Donation,
  InventoryRow, Need, Role, Shift, Stats, User, Volunteer,
} from "@/types";

const API_URL = import.meta.env.VITE_API_URL ?? "/api";
const TOKEN_KEY = "redacopio.token";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export const storage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const { method = "GET", body } = options;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = storage.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    // Sesión vencida: se limpia el token y se envía al login
    if (response.status === 401 && token && !path.startsWith("/auth/login")) {
      storage.clear();
      if (window.location.pathname.startsWith("/app")) window.location.href = "/login";
    }
    throw new ApiError(response.status, payload?.message ?? `Error HTTP ${response.status}`);
  }
  return payload as T;
}

const qs = (params: Record<string, string | number | undefined>) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "");
  return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}` : "";
};

type NeedInput = Pick<Need, "center_id" | "category" | "item" | "quantity" | "unit" | "priority">;
type CenterInput = {
  name: string; address: string; city?: string; latitude: number; longitude: number;
  phone?: string; schedule?: string; description?: string;
  coordinator_id?: number | null; is_active?: boolean;
};

export const api = {
  auth: {
    register: (data: { name: string; email: string; password: string; role: Role; phone?: string }) =>
      request<AuthResponse>("/auth/register", { method: "POST", body: data }),
    login: (data: { email: string; password: string }) =>
      request<AuthResponse>("/auth/login", { method: "POST", body: data }),
    profile: () => request<{ user: User }>("/auth/profile").then((r) => r.user),
  },
  stats: () => request<Stats>("/stats"),
  centers: {
    list: (all = false) => request<Center[]>(`/centers${all ? "?all=1" : ""}`),
    mine: () => request<Center[]>("/centers/mine"),
    get: (id: number) => request<CenterDetail>(`/centers/${id}`),
    create: (data: CenterInput) => request<Center>("/centers", { method: "POST", body: data }),
    update: (id: number, data: Partial<CenterInput>) =>
      request<Center>(`/centers/${id}`, { method: "PUT", body: data }),
    remove: (id: number) => request<{ message: string }>(`/centers/${id}`, { method: "DELETE" }),
    inventory: (id: number) => request<InventoryRow[]>(`/centers/${id}/inventory`),
  },
  needs: {
    list: (params: { centerId?: number; status?: string; category?: string } = {}) =>
      request<Need[]>(`/needs${qs(params)}`),
    create: (data: NeedInput) => request<Need>("/needs", { method: "POST", body: data }),
    update: (id: number, data: Partial<NeedInput & { status: string }>) =>
      request<Need>(`/needs/${id}`, { method: "PUT", body: data }),
    remove: (id: number) => request<{ message: string }>(`/needs/${id}`, { method: "DELETE" }),
  },
  donations: {
    mine: () => request<Donation[]>("/donations/mine"),
    list: (params: { centerId?: number; status?: string } = {}) =>
      request<Donation[]>(`/donations${qs(params)}`),
    create: (data: {
      center_id: number; category: string; item: string; quantity: number; unit: string;
      notes?: string; status?: "recibida"; donor_name?: string;
    }) => request<Donation>("/donations", { method: "POST", body: data }),
    receive: (id: number, quantity?: number) =>
      request<Donation>(`/donations/${id}/receive`, { method: "PATCH", body: { quantity } }),
    cancel: (id: number) => request<Donation>(`/donations/${id}/cancel`, { method: "PATCH", body: {} }),
  },
  deliveries: {
    list: (centerId: number) => request<Delivery[]>(`/deliveries?centerId=${centerId}`),
    create: (data: {
      center_id: number; category: string; item: string; quantity: number; unit: string;
      beneficiary: string; notes?: string;
    }) => request<Delivery>("/deliveries", { method: "POST", body: data }),
  },
  shifts: {
    list: (params: { centerId?: number } = {}) => request<Shift[]>(`/shifts${qs(params)}`),
    mine: () => request<Shift[]>("/shifts/mine"),
    create: (data: {
      center_id: number; title: string; description?: string; date: string;
      start_time: string; end_time: string; slots: number;
    }) => request<Shift>("/shifts", { method: "POST", body: data }),
    remove: (id: number) => request<{ message: string }>(`/shifts/${id}`, { method: "DELETE" }),
    signUp: (id: number) => request<Shift>(`/shifts/${id}/signup`, { method: "POST" }),
    cancel: (id: number) => request<Shift>(`/shifts/${id}/signup`, { method: "DELETE" }),
    volunteers: (id: number) => request<Volunteer[]>(`/shifts/${id}/volunteers`),
  },
  users: {
    list: () => request<AdminUser[]>("/users"),
    update: (id: number, data: { role?: Role; is_active?: boolean }) =>
      request<AdminUser>(`/users/${id}`, { method: "PATCH", body: data }),
  },
};
