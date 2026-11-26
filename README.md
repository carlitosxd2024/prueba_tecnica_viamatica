# Prueba PHP Laravel & Angular — Login y mantenimiento de usuarios

Backend **Laravel 11** (DDD ligero + JWT) · Base de datos **SQL Server** con Stored Procedures · Frontend **Angular**.

```
database/   01_schema.sql · 02_stored_procedures.sql · 03_seed.sql
backend/    API Laravel  (app/Domain · app/Application · app/Infrastructure · app/Http)
frontend/   SPA Angular  (login, recuperar clave, bienvenida, dashboard, mantenimiento, historial)
```

## 1. Base de datos
Ejecute en SQL Server (SSMS / sqlcmd), **en este orden**:
1. `database/01_schema.sql` (crea la BD `PruebaLogin` y tablas)
2. `database/02_stored_procedures.sql`
3. `database/03_seed.sql` (roles, opciones de menu y usuarios de prueba)

| Usuario | Correo | Clave | Rol |
|---|---|---|---|
| `Admin2024` | admin@mail.com | `Admin#2024` | ADMINISTRADOR |
| `Usuario2024` | usuario@mail.com | `User#2024` | USUARIO |

## 2. Backend
Requisitos: PHP 8.2+, Composer, extensiones **sqlsrv** y **pdo_sqlsrv** (+ ODBC Driver 17/18).
```bash
cd backend
composer install
cp .env.example .env      # ajuste DB_* y JWT_SECRET
php artisan key:generate
php artisan serve         # http://localhost:8000
```
Pruebas de reglas de dominio: `vendor/bin/phpunit tests`

> Si PHP no carga `pdo_sqlsrv` en Windows: verifique con `php -m` y que el `.dll` coincida con su version de PHP (TS/NTS y x64) y este habilitado en `php.ini` (`extension=php_sqlsrv_82_nts_x64.dll`, `extension=php_pdo_sqlsrv_82_nts_x64.dll`).

## 3. Frontend
```bash
cd frontend
npm install
npm start                 # http://localhost:4200
```
La URL de la API esta en `frontend/src/app/core/config.ts`.

## Cumplimiento de la prueba
| Requisito | Donde |
|---|---|
| Correo generado `jpiguavel@mail.com` + numero si hay duplicado | `MailGenerator.php` + `sp_Mail_Generar` |
| Reglas de usuario / contrasena / identificacion | `UserRules.php` (backend) y `core/validators.ts` (frontend) |
| 1 sesion activa, mensaje si ya existe | `AuthService::login` + `Usuarios.SessionActive` |
| Registro de inicios y cierres de sesion | tabla `Sessions`, `sp_Sesion_Iniciar` / `sp_Sesion_Cerrar` |
| Login con correo o usuario | `sp_Usuario_ObtenerLogin` |
| 3 intentos, bloqueo con `Status` y mensaje | `sp_Login_RegistrarFallido` (tabla `LoginFallidos`) |
| Rol para revisar el historial de un usuario | `GET /api/usuarios/{id}/sesiones` (solo ADMINISTRADOR) + pantalla *Historial* |
| 1 cuenta por persona | indices unicos `UX_Usuarios_Persona`, `UX_Persona_Identificacion` |
| DDD, JWT, eliminacion logica, SP | capas `Domain/Application/Infrastructure`; columna `Eliminado` |
| Menu desde BD segun rol | `sp_Menu_PorUsuario` -> sidebar (`layout/shell.ts`) |
| Carga masiva .xlsx/.csv (admin) | `POST /api/usuarios/carga-masiva` |
| Admin edita a todos menos a otros admin; usuario solo lo suyo | `sp_Usuario_Actualizar` (+ UI) |
| Estado y filtros (admin) | `sp_Usuario_CambiarEstado`, `sp_Usuario_Listar` |
| Bienvenida con ultima sesion / Dashboard admin | `sp_Sesion_Resumen`, `sp_Dashboard_Indicadores` |
| Recuperar contrasena | `/forgot-password`, `/reset-password` (sin SMTP: la API devuelve el enlace en modo desarrollo) |

## API principal
`POST /api/auth/login` · `POST /api/auth/logout` · `POST /api/auth/forgot-password` · `POST /api/auth/reset-password`
`GET /api/menu` · `GET /api/bienvenida` · `GET /api/dashboard` (admin)
`GET|POST /api/usuarios` · `GET|PUT /api/usuarios/{id}` · `PATCH /api/usuarios/{id}/estado` · `DELETE /api/usuarios/{id}` · `POST /api/usuarios/carga-masiva`
`GET|POST|PUT|DELETE /api/roles` (admin)

## Notas
- La sesion de un token se invalida al cerrar sesion (se valida `Sessions.FechaCierre` en cada peticion). Si el usuario cierra el navegador sin salir, la sesion se libera sola al vencer el TTL del JWT (`JWT_TTL_MINUTES`).
- Las contrasenas se guardan con bcrypt.
- Para la entrega: tome las capturas de pantalla del sistema funcionando (login, bloqueo, bienvenida, dashboard, mantenimiento, carga masiva) y adjunte `database/*.sql`.
