const BASE = "http://localhost:4000/api";
let fallos = 0;

function check(nombre, cond, extra = "") {
  console.log(`${cond ? "PASA" : "FALLA"}  ${nombre}${extra ? " :: " + extra : ""}`);
  if (!cond) fallos++;
}

async function req(metodo, ruta, body, token) {
  const r = await fetch(BASE + ruta, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await r.json(); } catch {}
  return { status: r.status, data };
}

(async () => {
  // 1. Login inválido
  let r = await req("POST", "/auth/login", { email: "supervisor@sigmap.do", password: "malo" });
  check("Login rechaza credenciales incorrectas", r.status === 401);

  // 2. Login por cada rol
  const tokens = {};
  for (const [rol, email] of Object.entries({
    gerencia: "gerencia@sigmap.do", supervisor: "supervisor@sigmap.do",
    tecnico: "tecnico@sigmap.do", operador: "operador@sigmap.do",
  })) {
    r = await req("POST", "/auth/login", { email, password: "sigmap123" });
    tokens[rol] = r.data.token;
    check(`Login correcto (${rol})`, r.status === 200 && !!r.data.token);
  }

  // 3. Acceso sin token
  r = await req("GET", "/ordenes");
  check("Endpoint protegido rechaza petición sin token", r.status === 401);

  // 4. Listar máquinas
  r = await req("GET", "/maquinas", null, tokens.tecnico);
  check("Lista de máquinas", r.status === 200 && r.data.length === 6);

  // 5. Control de roles: operador NO puede crear máquinas
  r = await req("POST", "/maquinas",
    { codigo: "X-99", nombre: "Prueba", tipo: "auxiliar", area: "Nave C" }, tokens.operador);
  check("Operador no puede crear máquinas (403)", r.status === 403);

  // 6. Supervisor SÍ puede crear máquinas
  r = await req("POST", "/maquinas",
    { codigo: "INY-03", nombre: "Inyectora Arburg 320T", tipo: "inyeccion", area: "Nave A" },
    tokens.supervisor);
  check("Supervisor crea máquina", r.status === 201);

  // 7. Código duplicado
  r = await req("POST", "/maquinas",
    { codigo: "INY-03", nombre: "Duplicada", tipo: "inyeccion", area: "Nave A" },
    tokens.supervisor);
  check("Rechaza código de máquina duplicado", r.status === 400);

  // 8. Operador reporta falla
  r = await req("POST", "/ordenes", {
    maquina_id: 1, tipo: "correctivo", prioridad: "alta",
    descripcion: "Ruido anormal en el motor del husillo.",
  }, tokens.operador);
  const nuevaOrden = r.data;
  check("Operador reporta una falla", r.status === 201 && !!nuevaOrden.folio,
    "folio " + (nuevaOrden.folio || "-"));

  // 9. Notificación automática al supervisor por prioridad alta
  r = await req("GET", "/notificaciones", null, tokens.supervisor);
  check("Supervisor recibe notificación por orden de prioridad alta",
    r.data.some((n) => n.mensaje.includes(nuevaOrden.folio)));

  // 10. Técnico NO puede asignar
  r = await req("PATCH", `/ordenes/${nuevaOrden.id}/asignar`, { tecnico_id: 3 }, tokens.tecnico);
  check("Técnico no puede asignar órdenes (403)", r.status === 403);

  // 11. Supervisor asigna técnico
  r = await req("PATCH", `/ordenes/${nuevaOrden.id}/asignar`, { tecnico_id: 3 }, tokens.supervisor);
  check("Supervisor asigna técnico", r.status === 200 && r.data.estado === "asignada");

  // 12. La máquina pasa a 'en_mantenimiento'
  r = await req("GET", "/maquinas", null, tokens.supervisor);
  check("Máquina cambia a estado en_mantenimiento",
    r.data.find((m) => m.id === 1).estado === "en_mantenimiento");

  // 12b. Autorización: el operador no puede cambiar el estado de una orden
  r = await req("PATCH", `/ordenes/${nuevaOrden.id}/estado`, { estado: "cerrada" }, tokens.operador);
  check("Operador no puede cambiar el estado de una orden (403)", r.status === 403);

  // 13. Regla de negocio: no cerrar correctivo sin causa raíz
  r = await req("PATCH", `/ordenes/${nuevaOrden.id}/estado`, { estado: "cerrada" }, tokens.tecnico);
  check("Bloquea cierre de correctivo sin causa raíz (400)", r.status === 400,
    r.data && r.data.error);

  // 14. Registrar causa raíz
  r = await req("POST", `/ordenes/${nuevaOrden.id}/causa-raiz`, {
    porque_1: "El motor hace ruido anormal.",
    porque_2: "El rodamiento presenta desgaste.",
    porque_3: "Falta de lubricación en el punto de engrase.",
    causa_identificada: "Punto de engrase omitido en la rutina preventiva.",
    categoria: "metodo",
    accion_correctiva: "Actualizar la checklist preventiva incluyendo el punto de engrase del husillo.",
  }, tokens.tecnico);
  check("Registra análisis de causa raíz", r.status === 201);

  // 15. Causa raíz incompleta es rechazada
  r = await req("POST", `/ordenes/${nuevaOrden.id}/causa-raiz`,
    { porque_1: "algo" }, tokens.tecnico);
  check("Rechaza causa raíz sin campos obligatorios (400)", r.status === 400);

  // 16. Ahora sí cierra
  r = await req("PATCH", `/ordenes/${nuevaOrden.id}/estado`, { estado: "cerrada" }, tokens.tecnico);
  check("Cierra la orden y calcula downtime",
    r.status === 200 && r.data.estado === "cerrada" && r.data.downtime_min > 0,
    "downtime " + (r.data.downtime_min || "-") + " min");

  // 17. Máquina vuelve a operativa
  r = await req("GET", "/maquinas", null, tokens.supervisor);
  check("Máquina vuelve a operativa al no tener órdenes pendientes",
    r.data.find((m) => m.id === 1).estado === "operativa");

  // 18. No se modifica una orden cerrada
  r = await req("PATCH", `/ordenes/${nuevaOrden.id}/asignar`, { tecnico_id: 3 }, tokens.supervisor);
  check("No permite reasignar una orden cerrada (400)", r.status === 400);

  // 19. Filtros
  r = await req("GET", "/ordenes?tipo=preventivo", null, tokens.gerencia);
  check("Filtro por tipo de orden", r.status === 200 && r.data.every((o) => o.tipo === "preventivo"));

  // 20. Historial por máquina
  r = await req("GET", "/maquinas/2/historial", null, tokens.gerencia);
  check("Historial de máquina con indicadores",
    r.status === 200 && r.data.ordenes.length >= 2 && r.data.indicadores.downtime_total_min > 0,
    "downtime total " + r.data.indicadores.downtime_total_min + " min");

  // 21. Reportes
  r = await req("GET", "/reportes/resumen", null, tokens.gerencia);
  check("Reporte resumen con indicadores",
    r.status === 200 && r.data.totales.total > 0 &&
    r.data.frecuencia_fallas_por_maquina.length > 0 &&
    r.data.causas_por_categoria.length > 0,
    "órdenes " + r.data.totales.total);

  // 22. Detalle de orden incluye causa raíz
  r = await req("GET", `/ordenes/${nuevaOrden.id}`, null, tokens.gerencia);
  check("Detalle de orden incluye su análisis de causa raíz", !!r.data.causa_raiz);

  // 23. Token inválido
  r = await req("GET", "/ordenes", null, "token-falso");
  check("Rechaza token inválido", r.status === 401);

  // 24. Orden inexistente
  r = await req("GET", "/ordenes/9999", null, tokens.gerencia);
  check("Orden inexistente devuelve 404", r.status === 404);

  console.log(`\n${fallos === 0 ? "TODAS LAS PRUEBAS PASARON" : fallos + " PRUEBA(S) FALLARON"}`);
  process.exit(fallos === 0 ? 0 : 1);
})();
