import { useState } from "react";
import { sesion } from "./api";
import Login from "./componentes/Login";
import Dashboard from "./componentes/Dashboard";
import Maquinas from "./componentes/Maquinas";
import Ordenes from "./componentes/Ordenes";
import Reportes from "./componentes/Reportes";

const MENU = [
  { id: "dashboard", texto: "Panel de control" },
  { id: "ordenes", texto: "Órdenes" },
  { id: "maquinas", texto: "Máquinas" },
  { id: "reportes", texto: "Reportes" },
];

const ROLES = {
  gerencia: "Gerencia", supervisor: "Supervisor",
  tecnico: "Técnico", operador: "Operador",
};

export default function App() {
  const [usuario, setUsuario] = useState(sesion.usuario());
  const [vista, setVista] = useState("dashboard");
  const [ordenInicial, setOrdenInicial] = useState(null);

  if (!usuario) return <Login onEntrar={setUsuario} />;

  function irA(v, ordenId = null) {
    setOrdenInicial(ordenId);
    setVista(v);
  }

  function salir() {
    sesion.cerrar();
    setUsuario(null);
    setVista("dashboard");
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">SIGMAP<small>Mantenimiento industrial</small></div>
        <nav>
          {MENU.map((m) => (
            <button key={m.id}
              className={vista === m.id ? "activo" : ""}
              onClick={() => irA(m.id)}>
              {m.texto}
            </button>
          ))}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="usuario">
            <strong>{usuario.nombre}</strong>
            {ROLES[usuario.rol]}
          </div>
          <button className="btn sec chico" onClick={salir}>Cerrar sesión</button>
        </header>

        <div className="contenido">
          {vista === "dashboard" && <Dashboard usuario={usuario} irA={irA} />}
          {vista === "ordenes" && (
            <Ordenes usuario={usuario}
              ordenInicial={ordenInicial}
              limpiarOrdenInicial={() => setOrdenInicial(null)} />
          )}
          {vista === "maquinas" && <Maquinas usuario={usuario} />}
          {vista === "reportes" && <Reportes />}
        </div>
      </div>
    </div>
  );
}
