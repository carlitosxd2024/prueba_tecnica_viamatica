/* =====================================================================
   Stored Procedures - PruebaLogin (SQL Server 2017+)
   Los errores de negocio se lanzan con THROW y mensaje "ERR_CODIGO: texto";
   el backend Laravel los traduce a respuestas HTTP 4xx.
   ===================================================================== */
USE PruebaLogin;
GO

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */
CREATE OR ALTER FUNCTION dbo.fn_EsAdmin (@idUsuario INT)
RETURNS BIT
AS
BEGIN
    RETURN (SELECT CASE WHEN EXISTS (
                SELECT 1
                FROM dbo.Rol_Usuarios ru
                JOIN dbo.Rol r ON r.idRol = ru.Rol_idRol
                WHERE ru.usuarios_idUsuario = @idUsuario
                  AND r.RolName = 'ADMINISTRADOR' AND r.Eliminado = 0)
            THEN 1 ELSE 0 END);
END
GO

-- Genera el correo unico: base@mail.com, base1@mail.com, base2@mail.com ...
CREATE OR ALTER PROCEDURE dbo.sp_Mail_Generar
    @Base VARCHAR(100),
    @Mail VARCHAR(120) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @n INT = 0;
    SET @Mail = @Base + '@mail.com';
    WHILE EXISTS (SELECT 1 FROM dbo.Usuarios WHERE Mail = @Mail AND Eliminado = 0)
    BEGIN
        SET @n += 1;
        SET @Mail = @Base + CAST(@n AS VARCHAR(10)) + '@mail.com';
    END
END
GO

/* ------------------------------------------------------------------ */
/* Roles (CRUD con eliminacion logica)                                 */
/* ------------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.sp_Rol_Listar
AS
BEGIN
    SET NOCOUNT ON;
    SELECT idRol, RolName FROM dbo.Rol WHERE Eliminado = 0 ORDER BY RolName;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Rol_Crear
    @RolName VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM dbo.Rol WHERE RolName = @RolName AND Eliminado = 0)
        THROW 50020, 'ERR_ROL_DUP: El rol ya existe', 1;
    INSERT INTO dbo.Rol (RolName) VALUES (UPPER(@RolName));
    SELECT SCOPE_IDENTITY() AS idRol;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Rol_Actualizar
    @idRol INT,
    @RolName VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM dbo.Rol WHERE RolName = @RolName AND idRol <> @idRol AND Eliminado = 0)
        THROW 50020, 'ERR_ROL_DUP: El rol ya existe', 1;
    UPDATE dbo.Rol SET RolName = UPPER(@RolName) WHERE idRol = @idRol AND Eliminado = 0;
    IF @@ROWCOUNT = 0 THROW 50021, 'ERR_ROL_NOT_FOUND: Rol no encontrado', 1;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Rol_Eliminar
    @idRol INT
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM dbo.Rol_Usuarios ru
               JOIN dbo.Usuarios u ON u.idUsuario = ru.usuarios_idUsuario AND u.Eliminado = 0
               WHERE ru.Rol_idRol = @idRol)
        THROW 50022, 'ERR_ROL_IN_USE: El rol tiene usuarios asignados', 1;
    UPDATE dbo.Rol SET Eliminado = 1 WHERE idRol = @idRol;
    IF @@ROWCOUNT = 0 THROW 50021, 'ERR_ROL_NOT_FOUND: Rol no encontrado', 1;
END
GO

/* ------------------------------------------------------------------ */
/* Usuarios / Persona                                                  */
/* ------------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.sp_Usuario_Crear
    @Nombres         VARCHAR(60),
    @Apellidos       VARCHAR(60),
    @Identificacion  VARCHAR(10),
    @FechaNacimiento DATE,
    @UserName        VARCHAR(50),
    @PasswordHash    VARCHAR(255),
    @MailBase        VARCHAR(100),      -- ej: jpiguavel (el SP agrega @mail.com y el numero si esta duplicado)
    @RolName         VARCHAR(50) = 'USUARIO'
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF EXISTS (SELECT 1 FROM dbo.Persona WHERE Identificacion = @Identificacion AND Eliminado = 0)
        THROW 50001, 'ERR_IDENTIFICACION_DUP: La identificacion ya tiene una cuenta registrada', 1;
    IF EXISTS (SELECT 1 FROM dbo.Usuarios WHERE UserName = @UserName AND Eliminado = 0)
        THROW 50002, 'ERR_USERNAME_DUP: El nombre de usuario ya existe', 1;

    DECLARE @idRol INT = (SELECT idRol FROM dbo.Rol WHERE RolName = @RolName AND Eliminado = 0);
    IF @idRol IS NULL THROW 50021, 'ERR_ROL_NOT_FOUND: Rol no encontrado', 1;

    BEGIN TRAN;
        DECLARE @Mail VARCHAR(120);
        EXEC dbo.sp_Mail_Generar @Base = @MailBase, @Mail = @Mail OUTPUT;

        INSERT INTO dbo.Persona (Nombres, Apellidos, Identificacion, FechaNacimiento)
        VALUES (@Nombres, @Apellidos, @Identificacion, @FechaNacimiento);
        DECLARE @idPersona INT = SCOPE_IDENTITY();

        INSERT INTO dbo.Usuarios (UserName, Password, Mail, Persona_idPersona)
        VALUES (@UserName, @PasswordHash, @Mail, @idPersona);
        DECLARE @idUsuario INT = SCOPE_IDENTITY();

        INSERT INTO dbo.Rol_Usuarios (Rol_idRol, usuarios_idUsuario) VALUES (@idRol, @idUsuario);
    COMMIT;

    SELECT @idUsuario AS idUsuario, @Mail AS Mail;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Usuario_Obtener
    @idUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT u.idUsuario, u.UserName, u.Mail, RTRIM(u.Status) AS Status, u.SessionActive,
           p.idPersona, p.Nombres, p.Apellidos, p.Identificacion, p.FechaNacimiento,
           (SELECT STRING_AGG(r.RolName, ',') FROM dbo.Rol_Usuarios ru
              JOIN dbo.Rol r ON r.idRol = ru.Rol_idRol WHERE ru.usuarios_idUsuario = u.idUsuario) AS Roles,
           dbo.fn_EsAdmin(u.idUsuario) AS EsAdmin
    FROM dbo.Usuarios u
    JOIN dbo.Persona p ON p.idPersona = u.Persona_idPersona
    WHERE u.idUsuario = @idUsuario AND u.Eliminado = 0;
END
GO

-- Listado con filtros (solo administrador) y paginacion
CREATE OR ALTER PROCEDURE dbo.sp_Usuario_Listar
    @Texto         VARCHAR(100) = NULL,   -- busca en nombres, apellidos, identificacion, usuario o correo
    @Status        VARCHAR(20)  = NULL,
    @RolName       VARCHAR(50)  = NULL,
    @Pagina        INT = 1,
    @PorPagina     INT = 10
AS
BEGIN
    SET NOCOUNT ON;
    IF @Pagina < 1 SET @Pagina = 1;
    IF @PorPagina < 1 SET @PorPagina = 10;

    ;WITH base AS (
        SELECT u.idUsuario, u.UserName, u.Mail, RTRIM(u.Status) AS Status, u.SessionActive,
               p.Nombres, p.Apellidos, p.Identificacion, p.FechaNacimiento,
               (SELECT STRING_AGG(r.RolName, ',') FROM dbo.Rol_Usuarios ru
                  JOIN dbo.Rol r ON r.idRol = ru.Rol_idRol WHERE ru.usuarios_idUsuario = u.idUsuario) AS Roles,
               dbo.fn_EsAdmin(u.idUsuario) AS EsAdmin
        FROM dbo.Usuarios u
        JOIN dbo.Persona p ON p.idPersona = u.Persona_idPersona
        WHERE u.Eliminado = 0
          AND (@Status IS NULL OR RTRIM(u.Status) = @Status)
          AND (@Texto IS NULL OR p.Nombres LIKE '%' + @Texto + '%' OR p.Apellidos LIKE '%' + @Texto + '%'
               OR p.Identificacion LIKE '%' + @Texto + '%' OR u.UserName LIKE '%' + @Texto + '%'
               OR u.Mail LIKE '%' + @Texto + '%')
          AND (@RolName IS NULL OR EXISTS (SELECT 1 FROM dbo.Rol_Usuarios ru JOIN dbo.Rol r ON r.idRol = ru.Rol_idRol
                                           WHERE ru.usuarios_idUsuario = u.idUsuario AND r.RolName = @RolName))
    )
    SELECT *, COUNT(*) OVER() AS Total
    FROM base
    ORDER BY idUsuario
    OFFSET (@Pagina - 1) * @PorPagina ROWS FETCH NEXT @PorPagina ROWS ONLY;
END
GO

-- Reglas: admin actualiza a todos menos a otros administradores; un usuario normal solo a si mismo.
CREATE OR ALTER PROCEDURE dbo.sp_Usuario_Actualizar
    @idSolicitante   INT,
    @idUsuario       INT,
    @Nombres         VARCHAR(60),
    @Apellidos       VARCHAR(60),
    @Identificacion  VARCHAR(10),
    @FechaNacimiento DATE,
    @UserName        VARCHAR(50),
    @PasswordHash    VARCHAR(255) = NULL   -- NULL = no cambia la contrasena
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Usuarios WHERE idUsuario = @idUsuario AND Eliminado = 0)
        THROW 50010, 'ERR_USER_NOT_FOUND: Usuario no encontrado', 1;

    IF @idSolicitante <> @idUsuario
    BEGIN
        IF dbo.fn_EsAdmin(@idSolicitante) = 0
            THROW 50011, 'ERR_FORBIDDEN: Solo puede actualizar sus propios datos', 1;
        IF dbo.fn_EsAdmin(@idUsuario) = 1
            THROW 50012, 'ERR_FORBIDDEN: Un administrador no puede actualizar a otro administrador', 1;
    END

    DECLARE @idPersona INT = (SELECT Persona_idPersona FROM dbo.Usuarios WHERE idUsuario = @idUsuario);

    IF EXISTS (SELECT 1 FROM dbo.Persona WHERE Identificacion = @Identificacion AND idPersona <> @idPersona AND Eliminado = 0)
        THROW 50001, 'ERR_IDENTIFICACION_DUP: La identificacion ya tiene una cuenta registrada', 1;
    IF EXISTS (SELECT 1 FROM dbo.Usuarios WHERE UserName = @UserName AND idUsuario <> @idUsuario AND Eliminado = 0)
        THROW 50002, 'ERR_USERNAME_DUP: El nombre de usuario ya existe', 1;

    BEGIN TRAN;
        UPDATE dbo.Persona
           SET Nombres = @Nombres, Apellidos = @Apellidos,
               Identificacion = @Identificacion, FechaNacimiento = @FechaNacimiento
         WHERE idPersona = @idPersona;

        UPDATE dbo.Usuarios
           SET UserName = @UserName,
               Password = COALESCE(@PasswordHash, Password)
         WHERE idUsuario = @idUsuario;
    COMMIT;
END
GO

-- Solo administrador (validado tambien aqui). Al reactivar se reinician los intentos fallidos.
CREATE OR ALTER PROCEDURE dbo.sp_Usuario_CambiarEstado
    @idSolicitante INT,
    @idUsuario     INT,
    @Status        VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    IF dbo.fn_EsAdmin(@idSolicitante) = 0
        THROW 50011, 'ERR_FORBIDDEN: Solo un administrador puede cambiar el estado', 1;
    IF @Status NOT IN ('ACTIVO','INACTIVO','BLOQUEADO')
        THROW 50013, 'ERR_STATUS_INVALID: Estado no valido', 1;
    IF dbo.fn_EsAdmin(@idUsuario) = 1 AND @idSolicitante <> @idUsuario
        THROW 50012, 'ERR_FORBIDDEN: Un administrador no puede modificar a otro administrador', 1;

    UPDATE dbo.Usuarios
       SET Status = @Status,
           IntentosFallidos = CASE WHEN @Status = 'ACTIVO' THEN 0 ELSE IntentosFallidos END
     WHERE idUsuario = @idUsuario AND Eliminado = 0;
    IF @@ROWCOUNT = 0 THROW 50010, 'ERR_USER_NOT_FOUND: Usuario no encontrado', 1;
END
GO

-- Eliminacion logica (persona + usuario)
CREATE OR ALTER PROCEDURE dbo.sp_Usuario_Eliminar
    @idSolicitante INT,
    @idUsuario     INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF dbo.fn_EsAdmin(@idSolicitante) = 0
        THROW 50011, 'ERR_FORBIDDEN: Solo un administrador puede eliminar usuarios', 1;
    IF dbo.fn_EsAdmin(@idUsuario) = 1
        THROW 50012, 'ERR_FORBIDDEN: No se puede eliminar a un administrador', 1;

    BEGIN TRAN;
        UPDATE p SET p.Eliminado = 1
          FROM dbo.Persona p JOIN dbo.Usuarios u ON u.Persona_idPersona = p.idPersona
         WHERE u.idUsuario = @idUsuario AND u.Eliminado = 0;
        UPDATE dbo.Usuarios SET Eliminado = 1, SessionActive = 'N' WHERE idUsuario = @idUsuario AND Eliminado = 0;
        IF @@ROWCOUNT = 0
        BEGIN
            ROLLBACK;
            THROW 50010, 'ERR_USER_NOT_FOUND: Usuario no encontrado', 1;
        END
    COMMIT;
END
GO

/* ------------------------------------------------------------------ */
/* Login / Sesiones                                                    */
/* ------------------------------------------------------------------ */
-- Busca por correo o nombre de usuario. Cierra sesiones vencidas (mas de @TtlMinutos sin cierre).
CREATE OR ALTER PROCEDURE dbo.sp_Usuario_ObtenerLogin
    @Identificador VARCHAR(120),
    @TtlMinutos    INT = 60
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @idUsuario INT = (SELECT TOP 1 idUsuario FROM dbo.Usuarios
                              WHERE Eliminado = 0 AND (UserName = @Identificador OR Mail = @Identificador));
    IF @idUsuario IS NULL RETURN;

    UPDATE dbo.Sessions
       SET FechaCierre = DATEADD(MINUTE, @TtlMinutos, FechaIngreso)
     WHERE usuarios_idUsuario = @idUsuario AND FechaCierre IS NULL
       AND DATEDIFF(MINUTE, FechaIngreso, SYSDATETIME()) > @TtlMinutos;

    UPDATE dbo.Usuarios SET SessionActive = 'N'
     WHERE idUsuario = @idUsuario
       AND NOT EXISTS (SELECT 1 FROM dbo.Sessions WHERE usuarios_idUsuario = @idUsuario AND FechaCierre IS NULL);

    SELECT idUsuario, UserName, Mail, Password, RTRIM(Status) AS Status, SessionActive, IntentosFallidos
      FROM dbo.Usuarios WHERE idUsuario = @idUsuario;
END
GO

-- Registra intento fallido. Al tercer intento fallido bloquea al usuario.
CREATE OR ALTER PROCEDURE dbo.sp_Login_RegistrarFallido
    @idUsuario INT,
    @Ip        VARCHAR(45) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRAN;
        INSERT INTO dbo.LoginFallidos (usuarios_idUsuario, Ip) VALUES (@idUsuario, @Ip);
        UPDATE dbo.Usuarios
           SET IntentosFallidos = IntentosFallidos + 1,
               Status = CASE WHEN IntentosFallidos + 1 >= 3 THEN 'BLOQUEADO' ELSE Status END
         WHERE idUsuario = @idUsuario;
    COMMIT;
    SELECT IntentosFallidos, RTRIM(Status) AS Status FROM dbo.Usuarios WHERE idUsuario = @idUsuario;
END
GO

-- Inicio de sesion exitoso: marca sesion activa, guarda los intentos fallidos previos y los reinicia.
CREATE OR ALTER PROCEDURE dbo.sp_Sesion_Iniciar
    @idUsuario INT,
    @Ip        VARCHAR(45) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @previos INT = (SELECT IntentosFallidos FROM dbo.Usuarios WHERE idUsuario = @idUsuario);
    BEGIN TRAN;
        INSERT INTO dbo.Sessions (usuarios_idUsuario, IntentosFallidosPrevios, Ip)
        VALUES (@idUsuario, @previos, @Ip);
        DECLARE @idSession INT = SCOPE_IDENTITY();
        UPDATE dbo.Usuarios SET SessionActive = 'S', IntentosFallidos = 0 WHERE idUsuario = @idUsuario;
    COMMIT;
    SELECT @idSession AS idSession;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Sesion_Cerrar
    @idUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRAN;
        UPDATE dbo.Sessions SET FechaCierre = SYSDATETIME()
         WHERE usuarios_idUsuario = @idUsuario AND FechaCierre IS NULL;
        UPDATE dbo.Usuarios SET SessionActive = 'N' WHERE idUsuario = @idUsuario;
    COMMIT;
END
GO

-- Existe sesion abierta (usado para invalidar tokens de sesiones ya cerradas)
CREATE OR ALTER PROCEDURE dbo.sp_Sesion_EstaActiva
    @idSession INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CASE WHEN EXISTS (SELECT 1 FROM dbo.Sessions WHERE idSession = @idSession AND FechaCierre IS NULL)
                THEN 1 ELSE 0 END AS Activa;
END
GO

-- Historial de inicios/cierres de sesion de un usuario (rol con permiso)
CREATE OR ALTER PROCEDURE dbo.sp_Sesion_Historial
    @idUsuario INT,
    @Top       INT = 50
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP (@Top) idSession, FechaIngreso, FechaCierre, IntentosFallidosPrevios, Ip
      FROM dbo.Sessions WHERE usuarios_idUsuario = @idUsuario
     ORDER BY FechaIngreso DESC;

    SELECT TOP (@Top) Fecha, Ip FROM dbo.LoginFallidos
     WHERE usuarios_idUsuario = @idUsuario ORDER BY Fecha DESC;
END
GO

-- Pantalla de bienvenida: sesion actual y la anterior + fallidos acumulados
CREATE OR ALTER PROCEDURE dbo.sp_Sesion_Resumen
    @idUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    -- Dos ultimas sesiones: la actual (fila 1) y la anterior (fila 2)
    SELECT TOP 2 idSession, FechaIngreso, FechaCierre, IntentosFallidosPrevios, Ip
      FROM dbo.Sessions WHERE usuarios_idUsuario = @idUsuario
     ORDER BY FechaIngreso DESC, idSession DESC;

    SELECT COUNT(*) AS FallidosActuales FROM dbo.LoginFallidos lf
     WHERE lf.usuarios_idUsuario = @idUsuario
       AND lf.Fecha > COALESCE((SELECT MAX(FechaIngreso) FROM dbo.Sessions WHERE usuarios_idUsuario = @idUsuario), '1900-01-01');
END
GO

/* ------------------------------------------------------------------ */
/* Menu dinamico segun rol                                             */
/* ------------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.sp_Menu_PorUsuario
    @idUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT DISTINCT o.idOpcion, o.NombreOpcion, o.Ruta, o.Icono, o.Orden
      FROM dbo.Rol_Usuarios ru
      JOIN dbo.Rol r ON r.idRol = ru.Rol_idRol AND r.Eliminado = 0
      JOIN dbo.Rol_RolOpciones rro ON rro.Rol_idRol = r.idRol
      JOIN dbo.RolOpciones o ON o.idOpcion = rro.RolOpciones_idOpcion
     WHERE ru.usuarios_idUsuario = @idUsuario
     ORDER BY o.Orden;
END
GO

/* ------------------------------------------------------------------ */
/* Dashboard (solo administrador)                                      */
/* ------------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.sp_Dashboard_Indicadores
AS
BEGIN
    SET NOCOUNT ON;

    -- 1) Totales de usuarios
    SELECT COUNT(*)                                                   AS TotalUsuarios,
           SUM(CASE WHEN SessionActive = 'S' THEN 1 ELSE 0 END)       AS ConSesionActiva,
           SUM(CASE WHEN SessionActive = 'N' THEN 1 ELSE 0 END)       AS ConSesionInactiva,
           SUM(CASE WHEN RTRIM(Status) = 'ACTIVO'    THEN 1 ELSE 0 END) AS Activos,
           SUM(CASE WHEN RTRIM(Status) = 'INACTIVO'  THEN 1 ELSE 0 END) AS Inactivos,
           SUM(CASE WHEN RTRIM(Status) = 'BLOQUEADO' THEN 1 ELSE 0 END) AS Bloqueados
      FROM dbo.Usuarios WHERE Eliminado = 0;

    -- 2) Fallidos por dia (ultimos 7 dias)
    SELECT CAST(Fecha AS DATE) AS Dia, COUNT(*) AS Fallidos
      FROM dbo.LoginFallidos
     WHERE Fecha >= DATEADD(DAY, -6, CAST(SYSDATETIME() AS DATE))
     GROUP BY CAST(Fecha AS DATE)
     ORDER BY Dia;

    -- 3) Top usuarios con mas intentos fallidos
    SELECT TOP 5 u.UserName, u.Mail, COUNT(*) AS Fallidos, RTRIM(u.Status) AS Status
      FROM dbo.LoginFallidos lf
      JOIN dbo.Usuarios u ON u.idUsuario = lf.usuarios_idUsuario
     GROUP BY u.UserName, u.Mail, u.Status
     ORDER BY COUNT(*) DESC;

    -- 4) Total de fallidos
    SELECT COUNT(*) AS TotalFallidos FROM dbo.LoginFallidos;
END
GO

/* ------------------------------------------------------------------ */
/* Recuperacion de contrasena                                          */
/* ------------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.sp_Password_SolicitarReset
    @Mail      VARCHAR(120),
    @TokenHash VARCHAR(64),
    @Minutos   INT = 30
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @idUsuario INT = (SELECT idUsuario FROM dbo.Usuarios WHERE Mail = @Mail AND Eliminado = 0);
    IF @idUsuario IS NULL RETURN;   -- no revelamos si existe o no
    INSERT INTO dbo.PasswordResets (usuarios_idUsuario, TokenHash, Expira)
    VALUES (@idUsuario, @TokenHash, DATEADD(MINUTE, @Minutos, SYSDATETIME()));
    SELECT @idUsuario AS idUsuario;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Password_Restablecer
    @TokenHash    VARCHAR(64),
    @PasswordHash VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @idReset INT, @idUsuario INT;
    SELECT TOP 1 @idReset = idReset, @idUsuario = usuarios_idUsuario
      FROM dbo.PasswordResets
     WHERE TokenHash = @TokenHash AND Usado = 0 AND Expira > SYSDATETIME();
    IF @idReset IS NULL THROW 50030, 'ERR_TOKEN_INVALID: El enlace de recuperacion es invalido o expiro', 1;

    BEGIN TRAN;
        UPDATE dbo.PasswordResets SET Usado = 1 WHERE idReset = @idReset;
        UPDATE dbo.Usuarios
           SET Password = @PasswordHash, IntentosFallidos = 0,
               Status = CASE WHEN RTRIM(Status) = 'BLOQUEADO' THEN 'ACTIVO' ELSE Status END
         WHERE idUsuario = @idUsuario;
    COMMIT;
END
GO
