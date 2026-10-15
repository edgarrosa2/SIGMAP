import { useEffect, useState } from "react";
import { api } from "../api";
import { Badge, Dato, fecha, minutos, CATEGORIAS } from "./Comunes";

const CR_VACIA = {
  porque_1: "", porque_2: "", porque_3: "", porque_4: "", porque_5: "",
  causa_identificada: "", categoria: "maquina", accion_correctiva: "",
};

export default function Ordenes({ usuario, ordenInicial, limpiarOrdenInicial }) {
  const [ordenes, setOrdenes] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [filtro, setFiltro] = useState({ estado: "", tipo: "" });
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [form, setForm] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [cr, setCr] = useState(null);

  const puedeAsignar = ["supervisor", "gerencia"].includes(usuario.rol);
  const puedeCausaRaiz = ["tecnico", "supervisor", "gerencia"].includes(usuario.rol);

  async function cargar() {
    try {
      const q = [];
      if (filtro.estado) q.push("estado=" + filtro.estado);
      if (filtro.tipo) q.push("tipo=" + filtro.tipo);
      const [o, m, t] = await Promise.all([
        api.ordenes(q.length ? "?" + q.join("&") : ""),
        api.maquinas(),
        api.tecnicos().catch(() => []),
      ]);
      setOrdenes(o); setMaquinas(m); setTecnicos(t);
    } catch (e) { setError(e.message); }
  }

  useEffect(() => { cargar(); }, [filtro]);

  useEffect(() => {
    if (ordenInicial) {
      abrirDetalle(ordenInicial);
      limpiarOrdenInicial();
    }
  }, [ordenInicial]);

  async function abrirDetalle(id) {
    setError(""); setOk("");
    try {
      const d = await api.orden(id);
      setDetalle(d);
      setCr(d.causa_raiz ? { ...d.causa_raiz } : null);
    } catch (e) { setError(e.message); }
  }

  async function crear() {
    setError(""); setOk("");
    try {
      const nueva = await api.crearOrden(form);
      setOk(`Orden ${nueva.folio} creada correctamente.`);
      setForm(null);
      cargar();
    } catch (e) { setError(e.message); }
  }

  async function asignar(tecnico_id) {
    setError(""); setOk("");
    try {
      await api.asignar(detalle.id, Number(tecnico_id));
      await abrirDetalle(detalle.id);
      cargar();
      setOk("Técnico asignado.");
    } catch (e) { setError(e.message); }
  }

  async function cambiarEstado(estado) {
    setError(""); setOk("");
    try {
      await api.cambiarEstado(detalle.id, estado);
      await abrirDetalle(detalle.id);
      cargar();
      setOk(estado === "cerrada" ? "Orden cerrada." : "Orden en proceso.");
    } catch (e) { setError(e.message); }
  }

  async function guardarCr() {
    setError(""); setOk("");
    try {
      await api.guardarCausaRaiz(detalle.id, cr);
      await abrirDetalle(detalle.id);
      setOk("Análisis de causa raíz guardado.");
    } catch (e) { setError(e.message); }
  }

  /* ---------------- Detalle de orden ---------------- */
  if (detalle) {
    return (
      <>
        <button className="btn sec chico" onClick={() => { setDetalle(null); setCr(null); }}>
          ← Volver a órdenes
        </button>
        <h1 className="titulo" style={{ marginTop: 14 }}>Orden {detalle.folio}</h1>
        <p className="subtitulo">{detalle.maquina_codigo} — {detalle.maquina_nombre}</p>

        {error && <div className="alerta error">{error}</div>}
        {ok && <div className="alerta ok">{ok}</div>}

        <div className="card">
          <h2>Información general</h2>
          <div className="detalle-grid">
            <Dato k="Tipo"><Badge tipo={detalle.tipo} /></Dato>
            <Dato k="Prioridad"><Badge tipo={detalle.prioridad} /></Dato>
            <Dato k="Estado"><Badge tipo={detalle.estado} /></Dato>
            <Dato k="Reportado por">{detalle.reportante}</Dato>
            <Dato k="Técnico">{detalle.tecnico || "Sin asignar"}</Dato>
            <Dato k="Abierta">{fecha(detalle.abierta_en)}</Dato>
            <Dato k="Cerrada">{fecha(detalle.cerrada_en)}</Dato>
            <Dato k="Tiempo de parada">{minutos(detalle.downtime_min)}</Dato>
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="dato"><div className="k">Descripción</div></div>
            <div style={{ fontSize: 14 }}>{detalle.descripcion}</div>
          </div>
        </div>

        {detalle.estado !== "cerrada" && puedeCausaRaiz && (
          <div className="card">
            <h2>Acciones</h2>
            <div className="acciones">
              {puedeAsignar && (
                <select style={{ maxWidth: 240 }} defaultValue=""
                  onChange={(e) => e.target.value && asignar(e.target.value)}>
                  <option value="">Asignar técnico...</option>
                  {tecnicos.map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              )}
              {detalle.estado === "asignada" && (
                <button className="btn" onClick={() => cambiarEstado("en_proceso")}>
                  Iniciar trabajo
                </button>
              )}
              <button className="btn" onClick={() => cambiarEstado("cerrada")}>
                Cerrar orden
              </button>
            </div>
            {detalle.tipo === "correctivo" && !detalle.causa_raiz && (
              <p style={{ fontSize: 13, color: "var(--amber)", marginTop: 12, marginBottom: 0 }}>
                Esta orden es correctiva: debe registrar el análisis de causa raíz antes de cerrarla.
              </p>
            )}
          </div>
        )}

        <div className="card">
          <h2>Análisis de causa raíz (5 porqués)</h2>

          {detalle.causa_raiz && !cr?.editando && (
            <>
              <ol className="porques">
                {[1, 2, 3, 4, 5].map((i) =>
                  detalle.causa_raiz["porque_" + i] ? (
                    <li key={i}>{detalle.causa_raiz["porque_" + i]}</li>
                  ) : null
                )}
              </ol>
              <div className="detalle-grid">
                <Dato k="Categoría">{CATEGORIAS[detalle.causa_raiz.categoria]}</Dato>
                <Dato k="Registrado">{fecha(detalle.causa_raiz.registrado_en)}</Dato>
              </div>
              <div style={{ marginTop: 10, fontSize: 14 }}>
                <strong>Causa identificada:</strong> {detalle.causa_raiz.causa_identificada}
              </div>
              <div style={{ marginTop: 6, fontSize: 14 }}>
                <strong>Acción correctiva:</strong> {detalle.causa_raiz.accion_correctiva}
              </div>
              {puedeCausaRaiz && (
                <button className="btn sec chico" style={{ marginTop: 14 }}
                  onClick={() => setCr({ ...detalle.causa_raiz, editando: true })}>
                  Editar análisis
                </button>
              )}
            </>
          )}

          {!detalle.causa_raiz && !cr && (
            puedeCausaRaiz ? (
              <button className="btn" onClick={() => setCr({ ...CR_VACIA, editando: true })}>
                Registrar análisis
              </button>
            ) : (
              <div className="vacio">Aún no se ha registrado el análisis de causa raíz.</div>
            )
          )}

          {cr?.editando && (
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <div className="campo" key={i}>
                  <label>¿Por qué? #{i}{i > 2 ? " (opcional)" : ""}</label>
                  <input value={cr["porque_" + i] || ""}
                    onChange={(e) => setCr({ ...cr, ["porque_" + i]: e.target.value })} />
                </div>
              ))}
              <div className="campo">
                <label>Causa raíz identificada *</label>
                <textarea value={cr.causa_identificada}
                  onChange={(e) => setCr({ ...cr, causa_identificada: e.target.value })} />
              </div>
              <div className="campo">
                <label>Categoría (6M) *</label>
                <select value={cr.categoria}
                  onChange={(e) => setCr({ ...cr, categoria: e.target.value })}>
                  {Object.entries(CATEGORIAS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label>Acción correctiva *</label>
                <textarea value={cr.accion_correctiva}
                  onChange={(e) => setCr({ ...cr, accion_correctiva: e.target.value })} />
              </div>
              <div className="acciones">
                <button className="btn" onClick={guardarCr}>Guardar análisis</button>
                <button className="btn sec"
                  onClick={() => setCr(detalle.causa_raiz ? { ...detalle.causa_raiz } : null)}>
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      </>
    );
  }

  /* ---------------- Listado ---------------- */
  return (
    <>
      <h1 className="titulo">Órdenes de mantenimiento</h1>
      <p className="subtitulo">Registro y seguimiento de trabajos preventivos y correctivos.</p>

      {error && <div className="alerta error">{error}</div>}
      {ok && <div className="alerta ok">{ok}</div>}

      {!form && (
        <button className="btn" style={{ marginBottom: 16 }}
          onClick={() => setForm({
            maquina_id: maquinas[0]?.id || "", tipo: "correctivo",
            prioridad: "media", descripcion: "",
          })}>
          + Reportar falla / crear orden
        </button>
      )}

      {form && (
        <div className="card">
          <h2>Nueva orden</h2>
          <div className="fila">
            <div className="campo">
              <label>Máquina</label>
              <select value={form.maquina_id}
                onChange={(e) => setForm({ ...form, maquina_id: Number(e.target.value) })}>
                {maquinas.map((m) => (
                  <option key={m.id} value={m.id}>{m.codigo} — {m.nombre}</option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label>Tipo</label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                <option value="correctivo">Correctivo</option>
                <option value="preventivo">Preventivo</option>
              </select>
            </div>
            <div className="campo">
              <label>Prioridad</label>
              <select value={form.prioridad}
                onChange={(e) => setForm({ ...form, prioridad: e.target.value })}>
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
            </div>
          </div>
          <div className="campo">
            <label>Descripción de la falla o trabajo</label>
            <textarea value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </div>
          <div className="acciones">
            <button className="btn" onClick={crear}>Crear orden</button>
            <button className="btn sec" onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="fila" style={{ marginBottom: 14 }}>
          <div className="campo" style={{ marginBottom: 0 }}>
            <label>Filtrar por estado</label>
            <select value={filtro.estado}
              onChange={(e) => setFiltro({ ...filtro, estado: e.target.value })}>
              <option value="">Todos</option>
              <option value="abierta">Abierta</option>
              <option value="asignada">Asignada</option>
              <option value="en_proceso">En proceso</option>
              <option value="cerrada">Cerrada</option>
            </select>
          </div>
          <div className="campo" style={{ marginBottom: 0 }}>
            <label>Filtrar por tipo</label>
            <select value={filtro.tipo}
              onChange={(e) => setFiltro({ ...filtro, tipo: e.target.value })}>
              <option value="">Todos</option>
              <option value="preventivo">Preventivo</option>
              <option value="correctivo">Correctivo</option>
            </select>
          </div>
        </div>

        <div className="tabla-wrap">
          <table>
            <thead>
              <tr>
                <th>Folio</th><th>Máquina</th><th>Tipo</th><th>Prioridad</th>
                <th>Estado</th><th>Técnico</th><th>Causa raíz</th><th></th>
              </tr>
            </thead>
            <tbody>
              {ordenes.map((o) => (
                <tr key={o.id}>
                  <td><strong>{o.folio}</strong></td>
                  <td>{o.maquina_codigo}</td>
                  <td><Badge tipo={o.tipo} /></td>
                  <td><Badge tipo={o.prioridad} /></td>
                  <td><Badge tipo={o.estado} /></td>
                  <td>{o.tecnico || "—"}</td>
                  <td>{o.tiene_causa_raiz ? "Sí" : "—"}</td>
                  <td>
                    <button className="btn sec chico" onClick={() => abrirDetalle(o.id)}>
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {ordenes.length === 0 && <div className="vacio">No hay órdenes con esos filtros.</div>}
      </div>
    </>
  );
}
