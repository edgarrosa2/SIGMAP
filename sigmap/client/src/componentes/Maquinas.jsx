import { useEffect, useState } from "react";
import { api } from "../api";
import { Badge, Dato, fecha, minutos, CATEGORIAS } from "./Comunes";

export default function Maquinas({ usuario }) {
  const [maquinas, setMaquinas] = useState([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [form, setForm] = useState(null);
  const [detalle, setDetalle] = useState(null);

  const puedeCrear = ["supervisor", "gerencia"].includes(usuario.rol);

  async function cargar() {
    try { setMaquinas(await api.maquinas()); }
    catch (e) { setError(e.message); }
  }
  useEffect(() => { cargar(); }, []);

  async function guardar() {
    setError(""); setOk("");
    try {
      await api.crearMaquina(form);
      setOk("Máquina registrada correctamente.");
      setForm(null);
      cargar();
    } catch (e) { setError(e.message); }
  }

  async function verHistorial(id) {
    setError("");
    try { setDetalle(await api.historial(id)); }
    catch (e) { setError(e.message); }
  }

  if (detalle) {
    const { maquina, ordenes, indicadores } = detalle;
    return (
      <>
        <button className="btn sec chico" onClick={() => setDetalle(null)}>
          ← Volver a máquinas
        </button>
        <h1 className="titulo" style={{ marginTop: 14 }}>
          {maquina.codigo} — {maquina.nombre}
        </h1>
        <p className="subtitulo">Historial de mantenimiento</p>

        <div className="kpis">
          <div className="kpi">
            <div className="valor">{indicadores.total_ordenes}</div>
            <div className="etiqueta">Órdenes registradas</div>
          </div>
          <div className="kpi">
            <div className="valor">{minutos(indicadores.downtime_total_min)}</div>
            <div className="etiqueta">Parada acumulada</div>
          </div>
          <div className="kpi">
            <div className="valor">{minutos(indicadores.downtime_promedio_min)}</div>
            <div className="etiqueta">Parada promedio</div>
          </div>
        </div>

        <div className="card">
          <h2>Órdenes de la máquina</h2>
          {ordenes.length === 0 ? (
            <div className="vacio">Sin historial de mantenimiento.</div>
          ) : ordenes.map((o) => (
            <div key={o.id} style={{ borderBottom: "1px solid var(--border)", padding: "12px 0" }}>
              <div className="detalle-grid">
                <Dato k="Folio"><strong>{o.folio}</strong></Dato>
                <Dato k="Tipo"><Badge tipo={o.tipo} /></Dato>
                <Dato k="Estado"><Badge tipo={o.estado} /></Dato>
                <Dato k="Parada">{minutos(o.downtime_min)}</Dato>
                <Dato k="Abierta">{fecha(o.abierta_en)}</Dato>
              </div>
              <div style={{ fontSize: 14, marginTop: 6 }}>{o.descripcion}</div>
              {o.causa_identificada && (
                <div style={{ fontSize: 13, marginTop: 8, color: "var(--muted)" }}>
                  <strong>Causa raíz</strong> ({CATEGORIAS[o.categoria]}): {o.causa_identificada}
                  <br />
                  <strong>Acción correctiva:</strong> {o.accion_correctiva}
                </div>
              )}
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="titulo">Máquinas</h1>
      <p className="subtitulo">Equipos registrados en la planta y su estado actual.</p>

      {error && <div className="alerta error">{error}</div>}
      {ok && <div className="alerta ok">{ok}</div>}

      {puedeCrear && !form && (
        <button className="btn" style={{ marginBottom: 16 }}
          onClick={() => setForm({ codigo: "", nombre: "", tipo: "inyeccion", area: "" })}>
          + Registrar máquina
        </button>
      )}

      {form && (
        <div className="card">
          <h2>Nueva máquina</h2>
          <div className="fila">
            <div className="campo">
              <label>Código</label>
              <input value={form.codigo} placeholder="INY-04"
                onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
            </div>
            <div className="campo">
              <label>Nombre</label>
              <input value={form.nombre} placeholder="Inyectora Arburg 320T"
                onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div className="campo">
              <label>Tipo</label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                <option value="inyeccion">Inyección</option>
                <option value="soplado">Soplado</option>
                <option value="auxiliar">Auxiliar</option>
              </select>
            </div>
            <div className="campo">
              <label>Área</label>
              <input value={form.area} placeholder="Nave A"
                onChange={(e) => setForm({ ...form, area: e.target.value })} />
            </div>
          </div>
          <div className="acciones">
            <button className="btn" onClick={guardar}>Guardar</button>
            <button className="btn sec" onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="tabla-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th><th>Nombre</th><th>Tipo</th><th>Área</th>
                <th>Estado</th><th>Órdenes abiertas</th><th></th>
              </tr>
            </thead>
            <tbody>
              {maquinas.map((m) => (
                <tr key={m.id}>
                  <td><strong>{m.codigo}</strong></td>
                  <td>{m.nombre}</td>
                  <td>{m.tipo}</td>
                  <td>{m.area}</td>
                  <td><Badge tipo={m.estado} /></td>
                  <td>{m.ordenes_abiertas}</td>
                  <td>
                    <button className="btn sec chico" onClick={() => verHistorial(m.id)}>
                      Historial
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
