const BASE = import.meta.env.VITE_API_URL || "/api";

function token() {
  return localStorage.getItem("sigmap_token");
}

async function request(metodo, ruta, body) {
  const res = await fetch(BASE + ruta, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: "Bearer " + token() } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem("sigmap_token");
    localStorage.removeItem("sigmap_usuario");
    window.location.reload();
    return;
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || "Error en la solicitud");
  return data;
}

export const api = {
  login: (email, password) => request("POST", "/auth/login", { email, password }),
  maquinas: () => request("GET", "/maquinas"),
  crearMaquina: (m) => request("POST", "/maquinas", m),
  historial: (id) => request("GET", `/maquinas/${id}/historial`),
  ordenes: (q = "") => request("GET", "/ordenes" + q),
  orden: (id) => request("GET", `/ordenes/${id}`),
  crearOrden: (o) => request("POST", "/ordenes", o),
  asignar: (id, tecnico_id) => request("PATCH", `/ordenes/${id}/asignar`, { tecnico_id }),
  cambiarEstado: (id, estado) => request("PATCH", `/ordenes/${id}/estado`, { estado }),
  guardarCausaRaiz: (id, cr) => request("POST", `/ordenes/${id}/causa-raiz`, cr),
  reportes: () => request("GET", "/reportes/resumen"),
  notificaciones: () => request("GET", "/notificaciones"),
  marcarLeida: (id) => request("PATCH", `/notificaciones/${id}/leida`),
  tecnicos: () => request("GET", "/usuarios/tecnicos"),
};

export const sesion = {
  guardar(token, usuario) {
    localStorage.setItem("sigmap_token", token);
    localStorage.setItem("sigmap_usuario", JSON.stringify(usuario));
  },
  usuario() {
    const raw = localStorage.getItem("sigmap_usuario");
    return raw ? JSON.parse(raw) : null;
  },
  cerrar() {
    localStorage.removeItem("sigmap_token");
    localStorage.removeItem("sigmap_usuario");
  },
};
