// Genera database/schema.sql y database/datos_prueba.sql a partir de la base
// de datos real (sigmap.db). Uso: node scripts/exportar-sql.js
const { DatabaseSync } = require("node:sqlite");
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "..", "sigmap.db");
const outDir = path.join(__dirname, "..", "..", "database");
const db = new DatabaseSync(dbPath, { readOnly: true });
fs.mkdirSync(outDir, { recursive: true });

const tablas = ["usuarios", "maquinas", "ordenes", "causa_raiz", "notificaciones"];

// ---- schema.sql ----
let schema = "-- SIGMAP - Script de creacion de la base de datos (SQLite)\n";
schema += "-- Generado desde la base real con scripts/exportar-sql.js\n\n";
schema += "PRAGMA foreign_keys = ON;\n\n";
const objetos = db.prepare(
  "SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END, rowid"
).all();
for (const o of objetos) schema += o.sql.trim() + ";\n\n";
fs.writeFileSync(path.join(outDir, "schema.sql"), schema);

// ---- datos_prueba.sql ----
const lit = (v) => {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  return "'" + String(v).replace(/'/g, "''") + "'";
};
let datos = "-- SIGMAP - Datos de prueba\n";
datos += "-- Usuarios de prueba: contrasena 'sigmap123' (almacenada como hash bcrypt)\n\n";
datos += "PRAGMA foreign_keys = ON;\nBEGIN TRANSACTION;\n\n";
for (const t of tablas) {
  const filas = db.prepare(`SELECT * FROM ${t} ORDER BY id`).all();
  datos += `-- ${t} (${filas.length} registros)\n`;
  for (const f of filas) {
    const cols = Object.keys(f);
    datos += `INSERT INTO ${t} (${cols.join(", ")}) VALUES (${cols.map((c) => lit(f[c])).join(", ")});\n`;
  }
  datos += "\n";
}
datos += "COMMIT;\n";
fs.writeFileSync(path.join(outDir, "datos_prueba.sql"), datos);

console.log("schema.sql      :", schema.split("\n").length, "lineas");
console.log("datos_prueba.sql:", datos.split("\n").length, "lineas");
