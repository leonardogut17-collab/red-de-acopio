import { useState } from "react";
import { CalendarClock, PackageOpen } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ErrorNote } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import type { Role } from "@/types";
import "@/styles/auth.css";

const OPTIONS: { role: Role; title: string; text: string; Icon: typeof PackageOpen }[] = [
  { role: "donante", title: "Donante", text: "Quiero llevar donaciones a los centros", Icon: PackageOpen },
  { role: "voluntario", title: "Voluntario", text: "Quiero inscribirme en turnos de apoyo", Icon: CalendarClock },
];

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [role, setRole] = useState<Role>(params.get("rol") === "voluntario" ? "voluntario" : "donante");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register({ name, email, password, role, phone: phone || undefined });
      navigate("/app");
    } catch (err) {
      setError((err as Error).message || "Error al registrar");
      setLoading(false);
    }
  }

  return (
    <div className="auth-split">
      <div className="auth-visual">
        <div className="auth-visual-content">
          <img className="auth-logo" src="/assets/images/logo.png" alt="Logo de Red de Acopio" width={120} height={120} />
          <h1>Súmate a la red<br />en menos de un minuto.</h1>
          <p>Dona lo que más se necesita o regala unas horas en un centro de acopio.</p>
        </div>
      </div>
      <div className="auth-form-side">
        <div className="auth-card">
          <Link to="/" className="auth-back">← Volver al inicio</Link>
          <h1>Crea tu cuenta</h1>
          <p className="subtitle">¿Cómo quieres ayudar?</p>
          <ErrorNote message={error} />
          <form onSubmit={handleSubmit}>
            <div className="role-picker" role="radiogroup" aria-label="Tipo de cuenta">
              {OPTIONS.map(({ role: r, title, text, Icon }) => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={role === r}
                  className={`role-option${role === r ? " selected" : ""}`}
                  onClick={() => setRole(r)}
                >
                  <Icon size={20} />
                  <b>{title}</b>
                  <span>{text}</span>
                </button>
              ))}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="name">Nombre completo</label>
              <input id="name" className="form-input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Correo electrónico</label>
              <input id="email" type="email" className="form-input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="phone">Teléfono (opcional)</label>
              <input id="phone" type="tel" className="form-input" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Contraseña</label>
              <input id="password" type="password" className="form-input" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
              <small className="form-hint">Mínimo 8 caracteres</small>
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
              {loading ? "Creando cuenta…" : "Crear cuenta"}
            </button>
          </form>
          <p className="auth-footer">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
        </div>
      </div>
    </div>
  );
}
