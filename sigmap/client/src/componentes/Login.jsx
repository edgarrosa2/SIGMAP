import { useState } from "react";
import { api, sesion } from "../api";

export default function Login({ onEntrar }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function entrar() {
    setError("");
    setCargando(true);
    try {
      const r = await api.login(email, password);
      sesion.guardar(r.token, r.usuario);
      onEntrar(r.usuario);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-box">
        <div className="logo">SIGMAP</div>
        <div className="sub">Sistema de Gestión de Mantenimiento Industrial</div>

        {error && <div className="alerta error">{error}</div>}

        <div className="campo">
          <label>Correo electrónico</label>
          <input
            type="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && entrar()}
            placeholder="usuario@sigmap.do"
          />
        </div>

        <div className="campo">
          <label>Contraseña</label>
          <input
            type="password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && entrar()}
            placeholder="••••••••"
          />
        </div>

        <button className="btn" style={{ width: "100%" }} onClick={entrar} disabled={cargando}>
          {cargando ? "Ingresando..." : "Iniciar sesión"}
        </button>

        <div className="demo-creds">
          <strong>Usuarios de prueba</strong> (contraseña <code>sigmap123</code>):<br />
          <code>gerencia@sigmap.do</code> — Gerencia<br />
          <code>supervisor@sigmap.do</code> — Supervisor<br />
          <code>tecnico@sigmap.do</code> — Técnico<br />
          <code>operador@sigmap.do</code> — Operador
        </div>
      </div>
    </div>
  );
}
