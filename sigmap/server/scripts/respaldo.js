// Respaldo y restauracion de la base de datos SQLite.
//   node scripts/respaldo.js               -> crea un respaldo con fecha y hora
//   node scripts/respaldo.js restaurar <archivo>  -> restaura desde un respaldo
// Usa VACUUM INTO, que genera una copia consistente aunque el servidor este en uso.
const { DatabaseSync } = require("node:sqlite");
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "..", "sigmap.db");
const dirResp = path.join(__dirname, "..", "..", "database", "respaldos");
fs.mkdirSync(dirResp, { recursive: true });

const [accion, archivo] = process.argv.slice(2);

if (accion === "restaurar") {
  if (!archivo || !fs.existsSync(archivo)) {
    console.error("Indique un archivo de respaldo existente.");
    process.exit(1);
  }
  // Verifica que el respaldo sea una base valida antes de reemplazar la actual.
  const prueba = new DatabaseSync(archivo, { readOnly: true });
  const n = prueba.prepare("SELECT COUNT(*) c FROM ordenes").get().c;
  prueba.close();
  fs.copyFileSync(archivo, dbPath);
  console.log(`Base restaurada desde ${path.basename(archivo)} (${n} ordenes).`);
  console.log("Reinicie el servidor para que use la base restaurada.");
} else {
  const sello = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const destino = path.join(dirResp, `sigmap-${sello}.db`);
  const db = new DatabaseSync(dbPath, { readOnly: true });
  db.exec(`VACUUM INTO '${destino.replace(/'/g, "''")}'`);
  db.close();
  const kb = (fs.statSync(destino).size / 1024).toFixed(1);
  console.log(`Respaldo creado: ${path.relative(process.cwd(), destino)} (${kb} KB)`);
}
