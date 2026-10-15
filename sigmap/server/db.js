const { DatabaseSync } = require("node:sqlite");
const bcrypt = require("bcryptjs");
const path = require("path");

const db = new DatabaseSync(path.join(__dirname, "sigmap.db"));
db.exec("PRAGMA foreign_keys = ON");

function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      rol TEXT NOT NULL CHECK (rol IN ('tecnico','supervisor','gerencia','operador')),
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS maquinas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL UNIQUE,
      nombre TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK (tipo IN ('inyeccion','soplado','auxiliar')),
      area TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'operativa'
        CHECK (estado IN ('operativa','en_mantenimiento','detenida')),
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ordenes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folio TEXT NOT NULL UNIQUE,
      maquina_id INTEGER NOT NULL REFERENCES maquinas(id),
      tipo TEXT NOT NULL CHECK (tipo IN ('preventivo','correctivo')),
      prioridad TEXT NOT NULL DEFAULT 'media'
        CHECK (prioridad IN ('baja','media','alta','critica')),
      estado TEXT NOT NULL DEFAULT 'abierta'
        CHECK (estado IN ('abierta','asignada','en_proceso','cerrada')),
      descripcion TEXT NOT NULL,
      reportado_por INTEGER NOT NULL REFERENCES usuarios(id),
      tecnico_id INTEGER REFERENCES usuarios(id),
      abierta_en TEXT NOT NULL DEFAULT (datetime('now')),
      cerrada_en TEXT,
      downtime_min INTEGER
    );

    CREATE TABLE IF NOT EXISTS causa_raiz (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orden_id INTEGER NOT NULL UNIQUE REFERENCES ordenes(id) ON DELETE CASCADE,
      porque_1 TEXT, porque_2 TEXT, porque_3 TEXT, porque_4 TEXT, porque_5 TEXT,
      causa_identificada TEXT NOT NULL,
      categoria TEXT NOT NULL CHECK (categoria IN
        ('maquina','metodo','material','mano_obra','medicion','medio_ambiente')),
      accion_correctiva TEXT NOT NULL,
      registrado_por INTEGER NOT NULL REFERENCES usuarios(id),
      registrado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notificaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      mensaje TEXT NOT NULL,
      leida INTEGER NOT NULL DEFAULT 0,
      creada_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_ordenes_maquina ON ordenes(maquina_id);
    CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON ordenes(estado);
    CREATE INDEX IF NOT EXISTS idx_notif_usuario ON notificaciones(usuario_id, leida);
  `);
}

function seed() {
  const count = db.prepare("SELECT COUNT(*) c FROM usuarios").get().c;
  if (count > 0) return;

  const insUser = db.prepare(
    "INSERT INTO usuarios (nombre,email,password_hash,rol) VALUES (?,?,?,?)"
  );
  const hash = (p) => bcrypt.hashSync(p, 10);
  insUser.run("Edgar Arias", "gerencia@sigmap.do", hash("sigmap123"), "gerencia");
  insUser.run("Luis Peralta", "supervisor@sigmap.do", hash("sigmap123"), "supervisor");
  insUser.run("Ramón Cruz", "tecnico@sigmap.do", hash("sigmap123"), "tecnico");
  insUser.run("Ana Batista", "operador@sigmap.do", hash("sigmap123"), "operador");

  const insMaq = db.prepare(
    "INSERT INTO maquinas (codigo,nombre,tipo,area,estado) VALUES (?,?,?,?,?)"
  );
  insMaq.run("INY-01", "Inyectora Husky 160T", "inyeccion", "Nave A", "operativa");
  insMaq.run("INY-02", "Inyectora Engel 250T", "inyeccion", "Nave A", "en_mantenimiento");
  insMaq.run("SOP-01", "Sopladora Aoki AL-250", "soplado", "Nave B", "operativa");
  insMaq.run("SOP-02", "Sopladora Nissei ASB-70", "soplado", "Nave B", "detenida");
  insMaq.run("AUX-01", "Compresor Atlas Copco GA-30", "auxiliar", "Cuarto de máquinas", "operativa");
  insMaq.run("AUX-02", "Chiller Trane CGAM-40", "auxiliar", "Cuarto de máquinas", "operativa");

  const insOrd = db.prepare(`INSERT INTO ordenes
    (folio,maquina_id,tipo,prioridad,estado,descripcion,reportado_por,tecnico_id,abierta_en,cerrada_en,downtime_min)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`);

  insOrd.run("OT-1001", 2, "correctivo", "alta", "cerrada",
    "Fuga de aceite hidráulico en la unidad de cierre.", 4, 3,
    "2026-08-03 07:20", "2026-08-03 11:50", 270);
  insOrd.run("OT-1002", 1, "preventivo", "media", "cerrada",
    "Mantenimiento programado de 500 horas: lubricación y revisión de husillo.", 2, 3,
    "2026-08-06 08:00", "2026-08-06 10:30", 150);
  insOrd.run("OT-1003", 4, "correctivo", "critica", "en_proceso",
    "Sopladora se detiene por falla de sensor de posición de molde.", 4, 3,
    "2026-09-09 14:10", null, null);
  insOrd.run("OT-1004", 3, "correctivo", "media", "asignada",
    "Variación en el espesor de pared de la botella de 1L.", 4, 3,
    "2026-09-11 09:45", null, null);
  insOrd.run("OT-1005", 6, "preventivo", "baja", "abierta",
    "Limpieza de condensador y revisión de niveles de refrigerante.", 2, null,
    "2026-09-12 08:15", null, null);
  insOrd.run("OT-1006", 2, "correctivo", "alta", "cerrada",
    "Nueva fuga de aceite en la misma unidad de cierre.", 4, 3,
    "2026-08-28 06:40", "2026-08-28 12:10", 330);

  const insCR = db.prepare(`INSERT INTO causa_raiz
    (orden_id,porque_1,porque_2,porque_3,porque_4,porque_5,causa_identificada,categoria,accion_correctiva,registrado_por)
    VALUES (?,?,?,?,?,?,?,?,?,?)`);

  insCR.run(1,
    "La máquina presentó fuga de aceite.",
    "El sello de la unidad de cierre estaba dañado.",
    "El sello trabajó a una presión superior a la nominal.",
    "La válvula reguladora de presión estaba descalibrada.",
    "No existe rutina de calibración periódica de la válvula.",
    "Ausencia de una rutina preventiva de calibración de la válvula reguladora de presión.",
    "metodo",
    "Incluir la calibración de la válvula reguladora en el plan preventivo trimestral y reemplazar el sello.",
    3);

  insCR.run(6,
    "Se repitió la fuga de aceite en la unidad de cierre.",
    "El sello sustituido volvió a fallar antes de lo esperado.",
    "El sello instalado no corresponde a la especificación del fabricante.",
    "Se utilizó un repuesto genérico disponible en almacén.",
    "El almacén no tenía el repuesto original en existencia.",
    "Uso de repuesto genérico fuera de especificación por falta de stock del original.",
    "material",
    "Establecer stock mínimo del sello original y prohibir sustitución por genéricos en unidades hidráulicas.",
    3);

  insCR.run(2,
    "Se realizó el mantenimiento de 500 horas.",
    "Se detectó desgaste leve en el husillo.",
    null, null, null,
    "Desgaste normal por horas de operación, dentro de tolerancia.",
    "maquina",
    "Mantener la frecuencia preventiva actual y monitorear el desgaste en el próximo ciclo.",
    3);

  const insNot = db.prepare(
    "INSERT INTO notificaciones (usuario_id,mensaje,leida) VALUES (?,?,?)"
  );
  insNot.run(3, "Se te asignó la orden OT-1003 (prioridad crítica) en SOP-02.", 0);
  insNot.run(2, "La máquina SOP-02 lleva más de 24 horas detenida.", 0);
  insNot.run(3, "Se te asignó la orden OT-1004 en SOP-01.", 0);
}

init();
seed();

module.exports = db;
