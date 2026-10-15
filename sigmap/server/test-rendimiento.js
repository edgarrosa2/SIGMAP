// Mide la latencia de los endpoints principales (RNF-02: < 3 s por operacion).
// Uso: node test-rendimiento.js   (el servidor debe estar corriendo)
const BASE = "http://localhost:4000/api";
const N = 50;

async function login(email) {
  const r = await fetch(BASE + "/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "sigmap123" }),
  });
  return (await r.json()).token;
}

function pct(arr, p) {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
}

(async () => {
  const tk = await login("supervisor@sigmap.do");
  const pruebas = [
    ["GET  /api/maquinas", () => fetch(BASE + "/maquinas", { headers: { Authorization: "Bearer " + tk } })],
    ["GET  /api/ordenes", () => fetch(BASE + "/ordenes", { headers: { Authorization: "Bearer " + tk } })],
    ["GET  /api/ordenes/1 (detalle)", () => fetch(BASE + "/ordenes/1", { headers: { Authorization: "Bearer " + tk } })],
    ["GET  /api/maquinas/2/historial", () => fetch(BASE + "/maquinas/2/historial", { headers: { Authorization: "Bearer " + tk } })],
    ["GET  /api/reportes/resumen", () => fetch(BASE + "/reportes/resumen", { headers: { Authorization: "Bearer " + tk } })],
    ["POST /api/ordenes (crear)", () => fetch(BASE + "/ordenes", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + tk },
      body: JSON.stringify({ maquina_id: 3, tipo: "preventivo", descripcion: "prueba de rendimiento" }),
    })],
  ];
  console.log(`Latencia por endpoint (${N} peticiones secuenciales, servidor local)\n`);
  console.log("Endpoint".padEnd(32) + "media".padStart(9) + "p95".padStart(9) + "max".padStart(9));
  let peor = 0;
  for (const [nombre, fn] of pruebas) {
    const t = [];
    for (let i = 0; i < N; i++) {
      const t0 = performance.now();
      const r = await fn();
      await r.text();
      t.push(performance.now() - t0);
    }
    const media = t.reduce((a, b) => a + b, 0) / t.length;
    peor = Math.max(peor, ...t);
    console.log(nombre.padEnd(32) + (media.toFixed(1) + " ms").padStart(9) + (pct(t, 95).toFixed(1) + " ms").padStart(9) + (Math.max(...t).toFixed(1) + " ms").padStart(9));
  }
  console.log(`\nPeor tiempo observado: ${peor.toFixed(1)} ms  ->  ${peor < 3000 ? "CUMPLE RNF-02 (< 3000 ms)" : "NO CUMPLE RNF-02"}`);
})();
