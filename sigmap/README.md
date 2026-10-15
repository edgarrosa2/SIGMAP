# SIGMAP - Sistema de Gestión de Mantenimiento Industrial

Sistema web para gestionar el mantenimiento preventivo y correctivo de maquinaria
industrial, con registro obligatorio del análisis de causa raíz (5 porqués + 6M)
y reportes de indicadores (tiempo de parada, frecuencia de fallas).

**Asignatura:** Seminario de Proyecto II (ISW-411) — UAPA, trimestre agosto–octubre 2026
**Facilitador:** Ing. Henry Candelario
**Autor:** Edgar Eduardo Arias Rosado (2021-03137)

## Requisitos

- Node.js **22.5 o superior** (el backend usa el módulo nativo `node:sqlite`; no hay
  dependencias que requieran compilación nativa ni un servidor de base de datos aparte)
- Navegador web moderno (Chrome, Edge o Firefox)

## Instalación y ejecución

```bash
# 1. Backend
cd server
npm install

# 2. Frontend (genera el build en server/public)
cd ../client
npm install
npm run build

# 3. Iniciar
cd ../server
node index.js
```

Disponible en `http://localhost:4000`. La base de datos (`server/sigmap.db`) se crea y se
carga con datos de prueba automáticamente la primera vez.

Variables de entorno opcionales: `PORT` (por defecto 4000) y `JWT_SECRET`
(**definir un valor propio en cualquier entorno que no sea de pruebas**).

### Modo desarrollo

```bash
cd server && node index.js          # terminal 1
cd client && npm run dev            # terminal 2 -> http://localhost:5173 (proxy a :4000)
```

## Usuarios de prueba

Contraseña de todos: `sigmap123`

| Correo | Rol |
|---|---|
| gerencia@sigmap.do | Gerencia |
| supervisor@sigmap.do | Supervisor |
| tecnico@sigmap.do | Técnico |
| operador@sigmap.do | Operador |

Para crear usuarios nuevos: `node scripts/crear-usuario.js "Nombre" correo contraseña rol`
(roles: operador, tecnico, supervisor, gerencia).

## Base de datos

Cinco tablas (`usuarios`, `maquinas`, `ordenes`, `causa_raiz`, `notificaciones`) con claves
foráneas activas y restricciones CHECK/UNIQUE. Scripts independientes en `database/`:

| Archivo | Contenido |
|---|---|
| `database/schema.sql` | Script de creación (tablas e índices) |
| `database/datos_prueba.sql` | Datos de prueba |

```bash
cd server
node scripts/exportar-sql.js      # regenera los .sql desde la base real
node scripts/verificar-scripts.js # reconstruye una BD vacía con los .sql y compara conteos
node scripts/respaldo.js          # crea un respaldo con fecha en database/respaldos/
node scripts/respaldo.js restaurar <archivo.db>
```

## Pruebas

Con el servidor corriendo (`node index.js`) y una base de datos nueva:

```bash
cd server
node test-api.js            # 28 pruebas funcionales de la API
node test-edge-cases.js     # 12 pruebas de casos límite / entrada inválida
node test-rendimiento.js    # latencia de los endpoints principales (RNF-02)
```

Verificación de la interfaz de extremo a extremo con navegador real (graba video con
rótulos): `python3 evidencia-video.py` (requiere Playwright).

## Estructura

```
server/
  index.js        API REST, autenticación JWT, roles y reglas de negocio
  db.js           Esquema, restricciones y datos iniciales
  scripts/        Exportar SQL, verificar scripts, respaldo/restauración, crear usuario
  test-*.js       Pruebas funcionales, de casos límite y de rendimiento
client/src/
  api.js          Cliente HTTP centralizado
  componentes/    Login, Dashboard, Ordenes, Maquinas, Reportes, Comunes
database/         schema.sql, datos_prueba.sql
diagramas/        Diagramas (Mermaid + PNG)
capturas/         Capturas de pantalla
evidencias/       Registros de ejecución, capturas y video de la demostración
```

## Reglas de negocio

- Folios correlativos automáticos (OT-1001, OT-1002, …)
- Una orden **correctiva** no puede cerrarse sin su análisis de causa raíz
- El tiempo de parada (minutos entre apertura y cierre) se calcula automáticamente al cerrar
- El estado de la máquina se sincroniza con sus órdenes activas
- Notificaciones automáticas por prioridad alta/crítica y por asignación
- Control de acceso por rol aplicado en el servidor
