import { Link } from "react-router-dom";
import { BrandMark } from "./Brand";
import "@/styles/public.css";

export function PublicFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="site-brand">
              <BrandMark />
              <span>Red de Acopio</span>
            </Link>
            <p>Conectamos a quienes quieren ayudar con los centros de acopio que más lo necesitan.</p>
          </div>
          <div className="footer-col">
            <h4>Plataforma</h4>
            <a href="/#mapa">Centros de acopio</a>
            <a href="/#necesidades">Necesidades urgentes</a>
            <a href="/#como-ayudar">Cómo ayudar</a>
          </div>
          <div className="footer-col">
            <h4>Participa</h4>
            <Link to="/register?rol=donante">Quiero donar</Link>
            <Link to="/register?rol=voluntario">Quiero ser voluntario</Link>
            <Link to="/login">Iniciar sesión</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Red de Acopio.</p>
          <p>Hecho en Bogotá, Colombia</p>
        </div>
      </div>
    </footer>
  );
}
