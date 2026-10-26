import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { BrandMark } from "./Brand";
import "@/styles/public.css";

export function PublicHeader() {
  const { user } = useAuth();
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="site-brand">
          <BrandMark />
          <span>Red de Acopio</span>
        </Link>
        <nav className="site-nav" aria-label="Navegación principal">
          <a href="/#mapa">Centros</a>
          <a href="/#necesidades">Necesidades</a>
          <a href="/#como-ayudar">Cómo ayudar</a>
        </nav>
        <div className="site-actions">
          {user ? (
            <Link to="/app" className="btn btn-primary">Ir a mi panel</Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">Iniciar sesión</Link>
              <Link to="/register" className="btn btn-primary">Quiero ayudar</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
