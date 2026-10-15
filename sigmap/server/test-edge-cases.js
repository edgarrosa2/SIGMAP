// Pruebas de casos limite y entrada invalida. Exige el codigo de estado exacto
// y, cuando importa, el mensaje. Uso: node test-edge-cases.js (servidor corriendo)
const BASE = "http://localhost:4000/api";
const hallazgos = [];

async function req(metodo, ruta, body, token) {
  const r = await fetch(BASE + ruta, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null, textoPlano = null;
  try { data = await r.clone().json(); }
  catch { try { textoPlano = await r.text(); } catch {} }
  return { status: r.status, data, textoPlano };
}

function reportar(caso, r, esperado, fragmentoMsg) {
  const msg = r.data && r.data.error ? r.data.error : "";
  let problema = r.status !== esperado;
  if (!problema && fragmentoMsg && !msg.includes(fragmentoMsg)) problema = true;
  console.log(`${problema ? "FALLA" : "PASA "}  ${caso} -> esperado ${esperado}, obtenido ${r.status}` +
    (msg ? ` (${msg})` : "") +
    (r.textoPlano ? ` [respuesta no-JSON: ${r.textoPlano.slice(0, 80)}]` : ""));
  if (problema) hallazgos.push({ caso, esperado, obtenido: r.status, detalle: r.data || r.textoPlano });
}

(async () => {
  let r = await req("POST", "/auth/login", { email: "supervisor@sigmap.do", password: "sigmap123" });
  const tokenSup = r.data.token;
  r = await req("POST", "/auth/login", { email: "tecnico@sigmap.do", password: "sigmap123" });
  const tokenTec = r.data.token;

  // Caso 1: login sin email/password
  r = await req("POST", "/auth/login", {});
  reportar("Login sin email/password", r, 401);

  // Caso 2: crear orden con tipo inválido
  r = await req("POST", "/ordenes",
    { maquina_id: 1, tipo: "invalido", descripcion: "prueba" }, tokenSup);
  reportar("Crear orden con tipo fuera de dominio", r, 400);

  // Caso 3: crear orden con prioridad inválida
  r = await req("POST", "/ordenes",
    { maquina_id: 1, tipo: "correctivo", prioridad: "urgentisima", descripcion: "prueba" }, tokenSup);
  reportar("Crear orden con prioridad fuera de dominio", r, 400);

  // Caso 4: causa raíz con categoría inválida
  const nueva = await req("POST", "/ordenes",
    { maquina_id: 1, tipo: "correctivo", descripcion: "prueba categoria" }, tokenSup);
  r = await req("POST", `/ordenes/${nueva.data.id}/causa-raiz`, {
    causa_identificada: "x", categoria: "otra_cosa", accion_correctiva: "y",
  }, tokenTec);
  reportar("Causa raíz con categoría fuera de dominio", r, 400);

  // Caso 5: historial de máquina con id no numérico
  r = await req("GET", "/maquinas/abc/historial", null, tokenSup);
  reportar("Historial con id no numérico", r, 404);

  // Caso 6: historial de máquina inexistente
  r = await req("GET", "/maquinas/9999/historial", null, tokenSup);
  reportar("Historial de máquina inexistente", r, 404);

  // Caso 7: registrar causa raíz sobre una orden ya cerrada
  const paraCerrar = await req("POST", "/ordenes",
    { maquina_id: 3, tipo: "preventivo", descripcion: "prueba cierre" }, tokenSup);
  await req("PATCH", `/ordenes/${paraCerrar.data.id}/estado`, { estado: "cerrada" }, tokenSup);
  r = await req("POST", `/ordenes/${paraCerrar.data.id}/causa-raiz`, {
    causa_identificada: "tardía", categoria: "maquina", accion_correctiva: "ninguna",
  }, tokenTec);
  reportar("Registrar causa raíz sobre orden ya cerrada (permitido por diseño: permite corregir el análisis)", r, 201);

  // Caso 8: crear máquina con tipo fuera de dominio
  r = await req("POST", "/maquinas",
    { codigo: "ZZ-01", nombre: "Prueba", tipo: "volador", area: "Nave Z" }, tokenSup);
  reportar("Crear máquina con tipo fuera de dominio", r, 400, "Tipo inválido");

  // Caso 9: asignar técnico con id no numérico
  r = await req("PATCH", `/ordenes/${nueva.data.id}/asignar`, { tecnico_id: "no-es-numero" }, tokenSup);
  reportar("Asignar técnico con id no numérico", r, 400, "no existe");

  // Caso 10: crear orden sin maquina_id
  r = await req("POST", "/ordenes", { tipo: "correctivo", descripcion: "sin maquina" }, tokenSup);
  reportar("Crear orden sin maquina_id", r, 400);

  // Caso 12: asignar técnico sin enviar tecnico_id
  r = await req("PATCH", `/ordenes/${nueva.data.id}/asignar`, {}, tokenSup);
  reportar("Asignar técnico sin tecnico_id", r, 400, "Debe indicar");

  // Caso 11: JSON malformado
  const rawRes = await fetch(BASE + "/ordenes", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + tokenSup },
    body: "{ esto no es json",
  });
  reportar("JSON malformado", { status: rawRes.status, data: null, textoPlano: null }, 400);

  console.log(`\n${hallazgos.length === 0 ? "TODOS LOS CASOS LIMITE PASARON" : hallazgos.length + " CASO(S) FALLARON"}`);
  if (hallazgos.length) console.log(JSON.stringify(hallazgos, null, 2));
  process.exit(hallazgos.length ? 1 : 0);
})();
