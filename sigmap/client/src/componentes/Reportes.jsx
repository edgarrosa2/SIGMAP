import { useEffect, useState } from "react";
import { api } from "../api";
import { Barra, minutos, CATEGORIAS } from "./Comunes";

export default function Reportes() {
  const [r, setR] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.reportes().then(setR).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="alerta error">{error}</div>;
  if (!r) return <div className="vacio">Cargando reportes...</div>;

  const maxFallas = Math.max(1, ...r.frecuencia_fallas_por_maquina.map((m) => m.fallas));
  const maxDown = Math.max(1, ...r.frecuencia_fallas_por_maquina.map((m) => m.downtime_min));
  const maxCat = Math.max(1, ...r.causas_por_categoria.map((c) => c.cantidad));

  const pctCorrectivo = r.totales.total
    ? Math.round((r.totales.correctivas / r.totales.total) * 100)
    : 0;

  return (
    <>
      <h1 className="titulo">Reportes e indicadores</h1>
      <p className="subtitulo">Información consolidada para la toma de decisiones.</p>

      <div className="kpis">
        <div className="kpi">
          <div className="valor">{r.totales.total}</div>
          <div className="etiqueta">Órdenes totales</div>
        </div>
        <div className="kpi">
          <div className="valor">{pctCorrectivo}%</div>
          <div className="etiqueta">Proporción correctiva</div>
        </div>
        <div className="kpi">
          <div className="valor">{minutos(r.downtime.total_min)}</div>
          <div className="etiqueta">Parada acumulada</div>
        </div>
        <div className="kpi">
          <div className="valor">{minutos(r.downtime.promedio_min)}</div>
          <div className="etiqueta">Parada promedio por orden</div>
        </div>
      </div>

      <div className="card">
        <h2>Frecuencia de fallas por máquina</h2>
        {r.frecuencia_fallas_por_maquina.map((m) => (
          <Barra key={m.codigo} etiqueta={m.codigo} valor={m.fallas} max={maxFallas} />
        ))}
      </div>

      <div className="card">
        <h2>Tiempo de parada por máquina (minutos)</h2>
        {r.frecuencia_fallas_por_maquina.map((m) => (
          <Barra key={m.codigo} etiqueta={m.codigo} valor={m.downtime_min} max={maxDown} />
        ))}
      </div>

      <div className="card">
        <h2>Causas raíz por categoría (6M)</h2>
        {r.causas_por_categoria.length === 0 ? (
          <div className="vacio">Aún no hay análisis de causa raíz registrados.</div>
        ) : r.causas_por_categoria.map((c) => (
          <Barra key={c.categoria} etiqueta={CATEGORIAS[c.categoria]}
            valor={c.cantidad} max={maxCat} />
        ))}
      </div>

      <div className="card">
        <h2>Estado actual del parque de máquinas</h2>
        <div className="tabla-wrap">
          <table>
            <thead><tr><th>Estado</th><th>Cantidad</th></tr></thead>
            <tbody>
              {r.maquinas_por_estado.map((m) => (
                <tr key={m.estado}>
                  <td>{m.estado.replace(/_/g, " ")}</td>
                  <td>{m.cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
