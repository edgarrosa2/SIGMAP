// Reconstruye una base de datos vacia usando solo schema.sql y datos_prueba.sql
// y compara los conteos con la base original. Uso: node scripts/verificar-scripts.js
const { DatabaseSync } = require("node:sqlite");
const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "..", "..", "database");
const tmp = path.join(require("os").tmpdir(), "sigmap-verificacion.db");
if (fs.existsSync(tmp)) fs.unlinkSync(tmp);

const nueva = new DatabaseSync(tmp);
nueva.exec(fs.readFileSync(path.join(dir, "schema.sql"), "utf8"));
nueva.exec(fs.readFileSync(path.join(dir, "datos_prueba.sql"), "utf8"));

const orig = new DatabaseSync(path.join(__dirname, "..", "sigmap.db"), { readOnly: true });
const tablas = ["usuarios", "maquinas", "ordenes", "causa_raiz", "notificaciones"];
let ok = true;
console.log("Tabla            Original  Reconstruida  Resultado");
for (const t of tablas) {
  const a = orig.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
  const b = nueva.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
  const pasa = a === b;
  ok = ok && pasa;
  console.log(`${t.padEnd(16)} ${String(a).padStart(8)}  ${String(b).padStart(12)}  ${pasa ? "OK" : "DIFIERE"}`);
}
const fk = nueva.prepare("PRAGMA foreign_key_check").all().length;
console.log("Violaciones de clave foranea tras la carga:", fk);
console.log(ok && fk === 0 ? "\nLOS SCRIPTS REPRODUCEN LA BASE DE DATOS" : "\nHAY DIFERENCIAS");
fs.unlinkSync(tmp);
process.exit(ok && fk === 0 ? 0 : 1);
