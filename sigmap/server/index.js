const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 4000;
const SECRET = process.env.JWT_SECRET || "sigmap-dev-secret";

app.use(cors());
app.use(express.json());

/* ---------- Middleware de autenticación y roles ---------- */

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Token no proporcionado" });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

function permitir(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol))
      return res.status(403).json({ error: "No autorizado para esta acción" });
    next();
  };
}

function notificar(usuarioId, mensaje) {
  if (!usuarioId) return;
  db.prepare("INSERT INTO notificaciones (usuario_id,mensaje) VALUES (?,?)")
    .run(usuarioId, mensaje);
}

// Dominios válidos, reflejando las restricciones CHECK de la base de datos.
// Se validan aquí también para devolver un 400 controlado en lugar de dejar
// que la base de datos rechace el valor con una excepción no manejada.
const TIPOS_ORDEN = ["preventivo", "correctivo"];
const PRIORIDADES = ["baja", "media", "alta", "critica"];
const TIPOS_MAQUINA = ["inyeccion", "soplado", "auxiliar"];
const CATEGORIAS_CR = ["maquina", "metodo", "material", "mano_obra", "medicion", "medio_ambiente"];

function valorInvalido(valor, permitidos) {
  return valor !== undefined && !permitidos.includes(valor);
}

function siguienteFolio() {
  const row = db.prepare("SELECT folio FROM ordenes ORDER BY id DESC LIMIT 1").get();
  const n = row ? parseInt(row.folio.split("-")[1], 10) + 1 : 1001;
  return `OT-${n}`;
}

/* ---------- Autenticación ---------- */

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email) return res.status(401).json({ error: "Credenciales incorrectas" });
  const u = db.prepare("SELECT * FROM usuarios WHERE email = ?").get(email);
  if (!u || !bcrypt.compareSync(password || "", u.password_hash))
    return res.status(401).json({ error: "Credenciales incorrectas" });

  const payload = { id: u.id, nombre: u.nombre, rol: u.rol, email: u.email };
  const token = jwt.sign(payload, SECRET, { expiresIn: "8h" });
  res.json({ token, usuario: payload });
});

app.get("/api/auth/me", auth, (req, res) => res.json(req.user));

/* ---------- Máquinas ---------- */

app.get("/api/maquinas", auth, (req, res) => {
  const maquinas = db.prepare(`
    SELECT m.*,
      (SELECT COUNT(*) FROM ordenes o WHERE o.maquina_id = m.id) AS total_ordenes,
      (SELECT COUNT(*) FROM ordenes o WHERE o.maquina_id = m.id AND o.estado <> 'cerrada')
        AS ordenes_abiertas
    FROM maquinas m ORDER BY m.codigo
  `).all();
  res.json(maquinas);
});

app.post("/api/maquinas", auth, permitir("supervisor", "gerencia"), (req, res) => {
  const { codigo, nombre, tipo, area } = req.body;
  if (!codigo || !nombre || !tipo || !area)
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  if (valorInvalido(tipo, TIPOS_MAQUINA))
    return res.status(400).json({ error: `Tipo inválido. Use: ${TIPOS_MAQUINA.join(", ")}` });
  try {
    const r = db.prepare(
      "INSERT INTO maquinas (codigo,nombre,tipo,area) VALUES (?,?,?,?)"
    ).run(codigo, nombre, tipo, area);
    res.status(201).json(db.prepare("SELECT * FROM maquinas WHERE id=?").get(r.lastInsertRowid));
  } catch (e) {
    // Solo la violación de UNIQUE (código repetido) es un error del usuario;
    // cualquier otro fallo se propaga al manejador global (500 genérico).
    if (/UNIQUE/i.test(e.message))
      return res.status(400).json({ error: "El código de máquina ya existe" });
    throw e;
  }
});

// Historial de mantenimiento de una máquina
app.get("/api/maquinas/:id/historial", auth, (req, res) => {
  const maquina = db.prepare("SELECT * FROM maquinas WHERE id=?").get(req.params.id);
  if (!maquina) return res.status(404).json({ error: "Máquina no encontrada" });

  const ordenes = db.prepare(`
    SELECT o.*, u.nombre AS tecnico, cr.causa_identificada, cr.categoria, cr.accion_correctiva
    FROM ordenes o
    LEFT JOIN usuarios u ON u.id = o.tecnico_id
    LEFT JOIN causa_raiz cr ON cr.orden_id = o.id
    WHERE o.maquina_id = ? ORDER BY o.abierta_en DESC
  `).all(req.params.id);

  const cerradas = ordenes.filter((o) => o.downtime_min != null);
  const downtimeTotal = cerradas.reduce((s, o) => s + o.downtime_min, 0);

  res.json({
    maquina,
    ordenes,
    indicadores: {
      total_ordenes: ordenes.length,
      downtime_total_min: downtimeTotal,
      downtime_promedio_min: cerradas.length
        ? Math.round(downtimeTotal / cerradas.length)
        : 0,
    },
  });
});

/* ---------- Órdenes de mantenimiento ---------- */

app.get("/api/ordenes", auth, (req, res) => {
  const { estado, tipo, maquina_id } = req.query;
  let sql = `
    SELECT o.*, m.codigo AS maquina_codigo, m.nombre AS maquina_nombre,
           t.nombre AS tecnico, r.nombre AS reportante,
           (SELECT COUNT(*) FROM causa_raiz c WHERE c.orden_id = o.id) AS tiene_causa_raiz
    FROM ordenes o
    JOIN maquinas m ON m.id = o.maquina_id
    JOIN usuarios r ON r.id = o.reportado_por
    LEFT JOIN usuarios t ON t.id = o.tecnico_id
    WHERE 1=1`;
  const params = [];
  if (estado) { sql += " AND o.estado = ?"; params.push(estado); }
  if (tipo) { sql += " AND o.tipo = ?"; params.push(tipo); }
  if (maquina_id) { sql += " AND o.maquina_id = ?"; params.push(maquina_id); }
  sql += " ORDER BY o.abierta_en DESC";
  res.json(db.prepare(sql).all(...params));
});

app.get("/api/ordenes/:id", auth, (req, res) => {
  const orden = db.prepare(`
    SELECT o.*, m.codigo AS maquina_codigo, m.nombre AS maquina_nombre,
           t.nombre AS tecnico, r.nombre AS reportante
    FROM ordenes o
    JOIN maquinas m ON m.id = o.maquina_id
    JOIN usuarios r ON r.id = o.reportado_por
    LEFT JOIN usuarios t ON t.id = o.tecnico_id
    WHERE o.id = ?`).get(req.params.id);
  if (!orden) return res.status(404).json({ error: "Orden no encontrada" });

  const causa = db.prepare("SELECT * FROM causa_raiz WHERE orden_id=?").get(orden.id);
  res.json({ ...orden, causa_raiz: causa || null });
});

app.post("/api/ordenes", auth, (req, res) => {
  const { maquina_id, tipo, prioridad, descripcion } = req.body;
  if (!maquina_id || !tipo || !descripcion)
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  if (valorInvalido(tipo, TIPOS_ORDEN))
    return res.status(400).json({ error: `Tipo inválido. Use: ${TIPOS_ORDEN.join(", ")}` });
  if (valorInvalido(prioridad, PRIORIDADES))
    return res.status(400).json({ error: `Prioridad inválida. Use: ${PRIORIDADES.join(", ")}` });

  const maquina = db.prepare("SELECT * FROM maquinas WHERE id=?").get(maquina_id);
  if (!maquina) return res.status(400).json({ error: "La máquina no existe" });

  const folio = siguienteFolio();
  const r = db.prepare(`INSERT INTO ordenes
    (folio,maquina_id,tipo,prioridad,descripcion,reportado_por)
    VALUES (?,?,?,?,?,?)`)
    .run(folio, maquina_id, tipo, prioridad || "media", descripcion, req.user.id);

  // Notificar a los supervisores cuando la prioridad es alta o crítica
  if (["alta", "critica"].includes(prioridad)) {
    db.prepare("SELECT id FROM usuarios WHERE rol='supervisor'").all()
      .forEach((s) => notificar(s.id,
        `Nueva orden ${folio} de prioridad ${prioridad} en ${maquina.codigo}.`));
  }
  res.status(201).json(db.prepare("SELECT * FROM ordenes WHERE id=?").get(r.lastInsertRowid));
});

// Asignar técnico
app.patch("/api/ordenes/:id/asignar", auth, permitir("supervisor", "gerencia"), (req, res) => {
  const { tecnico_id } = req.body;
  if (!tecnico_id) return res.status(400).json({ error: "Debe indicar el técnico a asignar" });
  const orden = db.prepare("SELECT * FROM ordenes WHERE id=?").get(req.params.id);
  if (!orden) return res.status(404).json({ error: "Orden no encontrada" });
  if (orden.estado === "cerrada")
    return res.status(400).json({ error: "No se puede modificar una orden cerrada" });

  const tecnico = db.prepare("SELECT * FROM usuarios WHERE id=? AND rol='tecnico'").get(tecnico_id);
  if (!tecnico) return res.status(400).json({ error: "El técnico indicado no existe" });

  db.prepare("UPDATE ordenes SET tecnico_id=?, estado='asignada' WHERE id=?")
    .run(tecnico_id, orden.id);
  db.prepare("UPDATE maquinas SET estado='en_mantenimiento' WHERE id=?").run(orden.maquina_id);
  notificar(tecnico_id, `Se te asignó la orden ${orden.folio}.`);

  res.json(db.prepare("SELECT * FROM ordenes WHERE id=?").get(orden.id));
});

// Cambiar estado (en_proceso / cerrada)
app.patch("/api/ordenes/:id/estado", auth, permitir("tecnico", "supervisor", "gerencia"), (req, res) => {
  const { estado } = req.body;
  const orden = db.prepare("SELECT * FROM ordenes WHERE id=?").get(req.params.id);
  if (!orden) return res.status(404).json({ error: "Orden no encontrada" });
  if (!["en_proceso", "cerrada"].includes(estado))
    return res.status(400).json({ error: "Estado no permitido" });

  // Regla de negocio: no se cierra sin análisis de causa raíz si es correctivo
  if (estado === "cerrada" && orden.tipo === "correctivo") {
    const cr = db.prepare("SELECT id FROM causa_raiz WHERE orden_id=?").get(orden.id);
    if (!cr) return res.status(400).json({
      error: "Debe registrar el análisis de causa raíz antes de cerrar una orden correctiva",
    });
  }

  if (estado === "cerrada") {
    const abierta = new Date(orden.abierta_en.replace(" ", "T"));
    const downtime = Math.max(1, Math.round((Date.now() - abierta.getTime()) / 60000));
    db.prepare(`UPDATE ordenes SET estado='cerrada',
                cerrada_en=datetime('now'), downtime_min=? WHERE id=?`)
      .run(downtime, orden.id);

    const pendientes = db.prepare(
      "SELECT COUNT(*) c FROM ordenes WHERE maquina_id=? AND estado<>'cerrada'"
    ).get(orden.maquina_id).c;
    if (pendientes === 0)
      db.prepare("UPDATE maquinas SET estado='operativa' WHERE id=?").run(orden.maquina_id);
  } else {
    db.prepare("UPDATE ordenes SET estado=? WHERE id=?").run(estado, orden.id);
  }

  res.json(db.prepare("SELECT * FROM ordenes WHERE id=?").get(orden.id));
});

/* ---------- Análisis de causa raíz ---------- */

app.post("/api/ordenes/:id/causa-raiz", auth, permitir("tecnico", "supervisor", "gerencia"),
  (req, res) => {
    const orden = db.prepare("SELECT * FROM ordenes WHERE id=?").get(req.params.id);
    if (!orden) return res.status(404).json({ error: "Orden no encontrada" });

    const { causa_identificada, categoria, accion_correctiva } = req.body;
    // node:sqlite (a diferencia de better-sqlite3) no acepta `undefined` como
    // parámetro y lanza una excepción; los porqués 3 a 5 son opcionales y
    // pueden llegar ausentes del body, así que se normalizan a null.
    const porque_1 = req.body.porque_1 ?? null;
    const porque_2 = req.body.porque_2 ?? null;
    const porque_3 = req.body.porque_3 ?? null;
    const porque_4 = req.body.porque_4 ?? null;
    const porque_5 = req.body.porque_5 ?? null;
    if (!causa_identificada || !categoria || !accion_correctiva)
      return res.status(400).json({
        error: "Causa identificada, categoría y acción correctiva son obligatorias",
      });
    if (valorInvalido(categoria, CATEGORIAS_CR))
      return res.status(400).json({ error: `Categoría inválida. Use: ${CATEGORIAS_CR.join(", ")}` });

    const existe = db.prepare("SELECT id FROM causa_raiz WHERE orden_id=?").get(orden.id);
    if (existe) {
      db.prepare(`UPDATE causa_raiz SET porque_1=?,porque_2=?,porque_3=?,porque_4=?,porque_5=?,
                  causa_identificada=?,categoria=?,accion_correctiva=? WHERE orden_id=?`)
        .run(porque_1, porque_2, porque_3, porque_4, porque_5,
             causa_identificada, categoria, accion_correctiva, orden.id);
    } else {
      db.prepare(`INSERT INTO causa_raiz
        (orden_id,porque_1,porque_2,porque_3,porque_4,porque_5,
         causa_identificada,categoria,accion_correctiva,registrado_por)
        VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .run(orden.id, porque_1, porque_2, porque_3, porque_4, porque_5,
             causa_identificada, categoria, accion_correctiva, req.user.id);
    }
    res.status(201).json(db.prepare("SELECT * FROM causa_raiz WHERE orden_id=?").get(orden.id));
  });

/* ---------- Reportes e indicadores ---------- */

app.get("/api/reportes/resumen", auth, (req, res) => {
  const totales = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN estado <> 'cerrada' THEN 1 ELSE 0 END) AS abiertas,
      SUM(CASE WHEN tipo = 'correctivo' THEN 1 ELSE 0 END) AS correctivas,
      SUM(CASE WHEN tipo = 'preventivo' THEN 1 ELSE 0 END) AS preventivas
    FROM ordenes`).get();

  const downtime = db.prepare(`
    SELECT IFNULL(SUM(downtime_min),0) AS total, IFNULL(AVG(downtime_min),0) AS promedio
    FROM ordenes WHERE downtime_min IS NOT NULL`).get();

  const porMaquina = db.prepare(`
    SELECT m.codigo, m.nombre,
      COUNT(o.id) AS fallas,
      IFNULL(SUM(o.downtime_min),0) AS downtime_min
    FROM maquinas m
    LEFT JOIN ordenes o ON o.maquina_id = m.id AND o.tipo = 'correctivo'
    GROUP BY m.id ORDER BY fallas DESC, downtime_min DESC`).all();

  const porCategoria = db.prepare(`
    SELECT categoria, COUNT(*) AS cantidad
    FROM causa_raiz GROUP BY categoria ORDER BY cantidad DESC`).all();

  const maquinasEstado = db.prepare(`
    SELECT estado, COUNT(*) AS cantidad FROM maquinas GROUP BY estado`).all();

  res.json({
    totales,
    downtime: {
      total_min: downtime.total,
      promedio_min: Math.round(downtime.promedio),
    },
    frecuencia_fallas_por_maquina: porMaquina,
    causas_por_categoria: porCategoria,
    maquinas_por_estado: maquinasEstado,
  });
});

/* ---------- Notificaciones ---------- */

app.get("/api/notificaciones", auth, (req, res) => {
  res.json(db.prepare(
    "SELECT * FROM notificaciones WHERE usuario_id=? ORDER BY creada_en DESC LIMIT 20"
  ).all(req.user.id));
});

app.patch("/api/notificaciones/:id/leida", auth, (req, res) => {
  db.prepare("UPDATE notificaciones SET leida=1 WHERE id=? AND usuario_id=?")
    .run(req.params.id, req.user.id);
  res.json({ ok: true });
});

/* ---------- Usuarios (para asignación) ---------- */

app.get("/api/usuarios/tecnicos", auth, (req, res) => {
  res.json(db.prepare("SELECT id,nombre,email FROM usuarios WHERE rol='tecnico'").all());
});

/* ---------- Frontend estático (build de producción) ---------- */
app.use(express.static(path.join(__dirname, "public")));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"), (err) => {
    if (err) res.status(404).json({ error: "Recurso no encontrado" });
  });
});

/* ---------- Manejador de errores global ----------
   Red de seguridad: si algún endpoint lanza una excepción no controlada
   (por ejemplo, una restricción de la base de datos no validada antes),
   se responde con un JSON genérico en vez de la página de error por
   defecto de Express, que exponía la traza interna y rutas del servidor. */
app.use((err, req, res, next) => {
  console.error("Error no controlado:", err);
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 500;
  const mensaje = status < 500 ? err.message : "Error interno del servidor";
  res.status(status).json({ error: mensaje });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`SIGMAP API escuchando en puerto ${PORT}`));
}

module.exports = app;
