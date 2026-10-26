import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./hooks/useAuth";
import { PublicLayout } from "./layouts/PublicLayout";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { Centers } from "./pages/Centers";
import { Needs } from "./pages/Needs";
import { Donations } from "./pages/Donations";
import { Inventory } from "./pages/Inventory";
import { Shifts } from "./pages/Shifts";
import { Users } from "./pages/Users";
import type { Role } from "./types";
import "./styles/public.css";

/** Protege rutas privadas; si se indican roles, también restringe por rol */
function PrivateRoute({ roles }: { roles?: Role[] }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-page">Cargando…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/app" replace />;
  return <Outlet />;
}

/** Login y registro no se muestran si ya hay sesión */
function GuestRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-page">Cargando…</div>;
  return user ? <Navigate to="/app" replace /> : <Outlet />;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Landing />} />
          </Route>

          <Route element={<GuestRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          <Route path="/app" element={<PrivateRoute />}>
            <Route index element={<Dashboard />} />
            <Route path="centros" element={<Centers />} />
            <Route path="necesidades" element={<Needs />} />
            <Route path="donaciones" element={<Donations />} />
            <Route element={<PrivateRoute roles={["admin", "coordinador"]} />}>
              <Route path="inventario" element={<Inventory />} />
            </Route>
            <Route element={<PrivateRoute roles={["admin", "coordinador", "voluntario"]} />}>
              <Route path="voluntariado" element={<Shifts />} />
            </Route>
            <Route element={<PrivateRoute roles={["admin"]} />}>
              <Route path="usuarios" element={<Users />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
