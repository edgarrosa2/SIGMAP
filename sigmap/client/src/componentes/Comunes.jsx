export function Badge({ tipo, texto }) {
  const colores = {
    operativa: "verde", en_mantenimiento: "ambar", detenida: "rojo",
    abierta: "gris", asignada: "azul", en_proceso: "ambar", cerrada: "verde",
    baja: "gris", media: "azul", alta: "ambar", critica: "rojo",
    preventivo: "azul", correctivo: "ambar",
  };
  return (
    <span className={`badge ${colores[tipo] || "gris"}`}>
      {texto || String(tipo).replace(/_/g, " ")}
    </span>
  );
}

export function Barra({ etiqueta, valor, max, sufijo = "" }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0;
  return (
    <div className="barra-fila">
      <span>{etiqueta}</span>
      <div className="barra-pista">
        <div className="barra-valor" style={{ width: `${pct}%` }} />
      </div>
      <span className="barra-num">{valor}{sufijo}</span>
    </div>
  );
}

export function Dato({ k, children }) {
  return (
    <div className="dato">
      <div className="k">{k}</div>
      <div className="v">{children}</div>
    </div>
  );
}

export function fecha(str) {
  if (!str) return "—";
  return str.replace("T", " ").slice(0, 16);
}

export function minutos(m) {
  if (m == null) return "—";
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h > 0 ? `${h}h ${r}m` : `${r}m`;
}

export const CATEGORIAS = {
  maquina: "Máquina", metodo: "Método", material: "Material",
  mano_obra: "Mano de obra", medicion: "Medición", medio_ambiente: "Medio ambiente",
};
