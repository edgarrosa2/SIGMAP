import { useEffect, useState } from "react";
import { api } from "../api";
import { Badge, fecha, minutos } from "./Comunes";

export default function Dashboard({ usuario, irA }) {
  const [resumen, setResumen] = useState(null);
  const [ordenes, setOrdenes] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [error, setError] = useState("");

  async function cargar() {
    try {
      const [r, o, n] = await Promise.all([
        api.reportes(), api.ordenes(), api.notificaciones(),
      ]);
      setResumen(r);
      setOrdenes(o.filter((x) => x.estado !== "cerrada").slice(0, 6));
      setNotifs(n);
    } catch (e) { setError(e.message); }
  }

  useEffect(() => { cargar(); }, []);

  async function marcar(id) {
    await api.marcarLeida(id);
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, leida: 1 } : n)));
  }

  if (error) return <div className="alerta error">{error}</div>;
  if (!resumen) return <div className="vacio">Cargando indicadores...</div>;

  const detenidas = resumen.maquinas_por_estado.find((m) => m.estado === "detenida");

  return (
    <>
      <h1 className="titulo">Panel de control</h1>
      <p className="subtitulo">Bienvenido, {usuario.nombre}. Resumen general del mantenimiento.</p>

      <div className="kpis">
        <div className="kpi">
          <div className="valor">{resumen.totales.abiertas}</div>
          <div className="etiqueta">Órdenes abiertas</div>
        </div>
        <div className="kpi">
          <div className="valor">{resumen.totales.total}</div>
          <div className="etiqueta">Órdenes totales</div>
        </div>
        <div className="kpi">
          <div className="valor">{minutos(resumen.downtime.total_min)}</div>
          <div className="etiqueta">Tiempo de parada acumulado</div>
        </div>
        <div className="kpi">
          <div className="valor">{detenidas ? detenidas.cantidad : 0}</div>
          <div className="etiqueta">Máquinas detenidas</div>
        </div>
      </div>

      <div className="card">
        <h2>Órdenes pendientes</h2>
        {ordenes.length === 0 ? (
          <div className="vacio">No hay órdenes pendientes.</div>
        ) : (
          <div className="tabla-wrap">
            <table>
              <thead>
                <tr>
                  <th>Folio</th><th>Máquina</th><th>Tipo</th>
                  <th>Prioridad</th><th>Estado</th><th>Abierta</th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map((o) => (
                  <tr key={o.id} style={{ cursor: "pointer" }} onClick={() => irA("ordenes", o.id)}>
                    <td><strong>{o.folio}</strong></td>
                    <td>{o.maquina_codigo}</td>
                    <td><Badge tipo={o.tipo} /></td>
                    <td><Badge tipo={o.prioridad} /></td>
                    <td><Badge tipo={o.estado} /></td>
                    <td>{fecha(o.abierta_en)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Notificaciones</h2>
        {notifs.length === 0 ? (
          <div className="vacio">Sin notificaciones.</div>
        ) : (
          <ul className="notif-lista">
            {notifs.map((n) => (
              <li key={n.id} className={n.leida ? "" : "no-leida"}>
                <span>{n.mensaje}</span>
                {!n.leida && (
                  <button className="btn sec chico" onClick={() => marcar(n.id)}>
                    Marcar leída
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
