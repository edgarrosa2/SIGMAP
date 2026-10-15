// Crea un usuario con contrasena cifrada (bcrypt).
// Uso: node scripts/crear-usuario.js "Nombre Apellido" correo@dominio.do contrasena rol
// Roles validos: operador | tecnico | supervisor | gerencia
const { DatabaseSync } = require("node:sqlite");
const bcrypt = require("bcryptjs");
const path = require("path");

const [nombre, email, password, rol] = process.argv.slice(2);
const ROLES = ["operador", "tecnico", "supervisor", "gerencia"];

if (!nombre || !email || !password || !rol) {
  console.error('Uso: node scripts/crear-usuario.js "Nombre" correo contrasena rol');
  process.exit(1);
}
if (!ROLES.includes(rol)) {
  console.error(`Rol invalido. Use: ${ROLES.join(", ")}`);
  process.exit(1);
}
if (password.length < 8) {
  console.error("La contrasena debe tener al menos 8 caracteres.");
  process.exit(1);
}
const db = new DatabaseSync(path.join(__dirname, "..", "sigmap.db"));
try {
  db.prepare("INSERT INTO usuarios (nombre,email,password_hash,rol) VALUES (?,?,?,?)")
    .run(nombre, email, bcrypt.hashSync(password, 10), rol);
  console.log(`Usuario creado: ${email} (${rol})`);
} catch (e) {
  if (/UNIQUE/i.test(e.message)) { console.error("Ya existe un usuario con ese correo."); process.exit(1); }
  throw e;
}
