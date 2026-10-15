-- SIGMAP - Script de creacion de la base de datos (SQLite)
-- Generado desde la base real con scripts/exportar-sql.js

PRAGMA foreign_keys = ON;

CREATE TABLE usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      rol TEXT NOT NULL CHECK (rol IN ('tecnico','supervisor','gerencia','operador')),
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

CREATE TABLE maquinas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL UNIQUE,
      nombre TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK (tipo IN ('inyeccion','soplado','auxiliar')),
      area TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'operativa'
        CHECK (estado IN ('operativa','en_mantenimiento','detenida')),
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

CREATE TABLE ordenes (
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

CREATE TABLE causa_raiz (
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

CREATE TABLE notificaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      mensaje TEXT NOT NULL,
      leida INTEGER NOT NULL DEFAULT 0,
      creada_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

CREATE INDEX idx_ordenes_maquina ON ordenes(maquina_id);

CREATE INDEX idx_ordenes_estado ON ordenes(estado);

CREATE INDEX idx_notif_usuario ON notificaciones(usuario_id, leida);

