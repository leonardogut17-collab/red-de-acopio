import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ErrorNote } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import "@/styles/auth.css";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      navigate("/app");
    } catch (err) {
      setError((err as Error).message || "Error al iniciar sesión");
      setLoading(false);
    }
  }

  return (
    <div className="auth-split">
      <div className="auth-visual">
        <div className="auth-visual-content">
          <img className="auth-logo" src="/assets/images/logo.png" alt="Logo de Red de Acopio" width={120} height={120} />
          <h1>Cada donación<br />llega a donde se necesita.</h1>
          <p>Coordina centros de acopio, donaciones y voluntarios desde un solo panel.</p>
        </div>
      </div>
      <div className="auth-form-side">
        <div className="auth-card">
          <Link to="/" className="auth-back">← Volver al inicio</Link>
          <h1>Bienvenido de vuelta</h1>
          <p className="subtitle">Ingresa a tu panel de Red de Acopio</p>
          <ErrorNote message={error} />
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Correo electrónico</label>
              <input id="email" type="email" className="form-input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Contraseña</label>
              <input id="password" type="password" className="form-input" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
              {loading ? "Ingresando…" : "Iniciar sesión"}
            </button>
          </form>
          <p className="auth-footer">¿No tienes cuenta? <Link to="/register">Regístrate</Link></p>
        </div>
      </div>
    </div>
  );
}
