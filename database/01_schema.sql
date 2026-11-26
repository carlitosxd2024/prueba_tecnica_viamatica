/* =====================================================================
   PRUEBA PHP LARAVEL & ANGULAR - Esquema SQL Server
   Ejecutar en orden: 01_schema.sql -> 02_stored_procedures.sql -> 03_seed.sql
   ===================================================================== */
IF DB_ID(N'PruebaLogin') IS NULL
    CREATE DATABASE PruebaLogin;
GO
USE PruebaLogin;
GO

/* ------------------------------ Persona ------------------------------ */
CREATE TABLE dbo.Persona (
    idPersona       INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Persona PRIMARY KEY,
    Nombres         VARCHAR(60)  NOT NULL,
    Apellidos       VARCHAR(60)  NOT NULL,
    Identificacion  VARCHAR(10)  NOT NULL,
    FechaNacimiento DATE         NOT NULL,
    Eliminado       BIT          NOT NULL CONSTRAINT DF_Persona_Eliminado DEFAULT 0,
    FechaCreacion   DATETIME2(0) NOT NULL CONSTRAINT DF_Persona_FechaCreacion DEFAULT SYSDATETIME()
);
GO
-- Identificacion unica entre registros no eliminados
CREATE UNIQUE INDEX UX_Persona_Identificacion ON dbo.Persona(Identificacion) WHERE Eliminado = 0;
GO

/* ------------------------------ Usuarios ----------------------------- */
CREATE TABLE dbo.Usuarios (
    idUsuario        INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Usuarios PRIMARY KEY,
    UserName         VARCHAR(50)  NOT NULL,
    Password         VARCHAR(255) NOT NULL,           -- hash bcrypt
    Mail             VARCHAR(120) NOT NULL,
    SessionActive    CHAR(1)      NOT NULL CONSTRAINT DF_Usuarios_SessionActive DEFAULT 'N', -- 'S' / 'N'
    Persona_idPersona INT         NOT NULL,
    Status           CHAR(20)     NOT NULL CONSTRAINT DF_Usuarios_Status DEFAULT 'ACTIVO',   -- ACTIVO / INACTIVO / BLOQUEADO
    IntentosFallidos INT          NOT NULL CONSTRAINT DF_Usuarios_Intentos DEFAULT 0,
    Eliminado        BIT          NOT NULL CONSTRAINT DF_Usuarios_Eliminado DEFAULT 0,
    FechaCreacion    DATETIME2(0) NOT NULL CONSTRAINT DF_Usuarios_FechaCreacion DEFAULT SYSDATETIME(),
    CONSTRAINT FK_Usuarios_Persona FOREIGN KEY (Persona_idPersona) REFERENCES dbo.Persona(idPersona),
    CONSTRAINT CK_Usuarios_SessionActive CHECK (SessionActive IN ('S','N')),
    CONSTRAINT CK_Usuarios_Status CHECK (RTRIM(Status) IN ('ACTIVO','INACTIVO','BLOQUEADO'))
);
GO
-- Un usuario/persona = maximo 1 cuenta; UserName y Mail unicos (sobre no eliminados)
CREATE UNIQUE INDEX UX_Usuarios_UserName ON dbo.Usuarios(UserName) WHERE Eliminado = 0;
CREATE UNIQUE INDEX UX_Usuarios_Mail     ON dbo.Usuarios(Mail)     WHERE Eliminado = 0;
CREATE UNIQUE INDEX UX_Usuarios_Persona  ON dbo.Usuarios(Persona_idPersona) WHERE Eliminado = 0;
GO

/* --------------------------------- Rol ------------------------------- */
CREATE TABLE dbo.Rol (
    idRol     INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Rol PRIMARY KEY,
    RolName   VARCHAR(50) NOT NULL,
    Eliminado BIT NOT NULL CONSTRAINT DF_Rol_Eliminado DEFAULT 0
);
CREATE UNIQUE INDEX UX_Rol_RolName ON dbo.Rol(RolName) WHERE Eliminado = 0;
GO

CREATE TABLE dbo.Rol_Usuarios (
    Rol_idRol          INT NOT NULL,
    usuarios_idUsuario INT NOT NULL,
    CONSTRAINT PK_Rol_Usuarios PRIMARY KEY (Rol_idRol, usuarios_idUsuario),
    CONSTRAINT FK_RolUsuarios_Rol     FOREIGN KEY (Rol_idRol)          REFERENCES dbo.Rol(idRol),
    CONSTRAINT FK_RolUsuarios_Usuario FOREIGN KEY (usuarios_idUsuario) REFERENCES dbo.Usuarios(idUsuario)
);
GO

/* ------------------------------ RolOpciones -------------------------- */
CREATE TABLE dbo.RolOpciones (
    idOpcion     INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_RolOpciones PRIMARY KEY,
    NombreOpcion VARCHAR(50)  NOT NULL,
    Ruta         VARCHAR(100) NOT NULL,   -- ruta Angular
    Icono        VARCHAR(50)  NULL,
    Orden        INT          NOT NULL CONSTRAINT DF_RolOpciones_Orden DEFAULT 0
);
GO

CREATE TABLE dbo.Rol_RolOpciones (
    Rol_idRol              INT NOT NULL,
    RolOpciones_idOpcion   INT NOT NULL,
    CONSTRAINT PK_Rol_RolOpciones PRIMARY KEY (Rol_idRol, RolOpciones_idOpcion),
    CONSTRAINT FK_RRO_Rol    FOREIGN KEY (Rol_idRol)            REFERENCES dbo.Rol(idRol),
    CONSTRAINT FK_RRO_Opcion FOREIGN KEY (RolOpciones_idOpcion) REFERENCES dbo.RolOpciones(idOpcion)
);
GO

/* ------------------------------- Sessions ---------------------------- */
CREATE TABLE dbo.Sessions (
    idSession        INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Sessions PRIMARY KEY,
    FechaIngreso     DATETIME2(0) NOT NULL CONSTRAINT DF_Sessions_Ingreso DEFAULT SYSDATETIME(),
    FechaCierre      DATETIME2(0) NULL,
    usuarios_idUsuario INT NOT NULL,
    IntentosFallidosPrevios INT NOT NULL CONSTRAINT DF_Sessions_Intentos DEFAULT 0,
    Ip               VARCHAR(45) NULL,
    CONSTRAINT FK_Sessions_Usuarios FOREIGN KEY (usuarios_idUsuario) REFERENCES dbo.Usuarios(idUsuario)
);
CREATE INDEX IX_Sessions_Usuario ON dbo.Sessions(usuarios_idUsuario, FechaIngreso DESC);
GO

/* ---------------------- Intentos de login fallidos ------------------- */
CREATE TABLE dbo.LoginFallidos (
    idFallido        INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_LoginFallidos PRIMARY KEY,
    usuarios_idUsuario INT NOT NULL,
    Fecha            DATETIME2(0) NOT NULL CONSTRAINT DF_LoginFallidos_Fecha DEFAULT SYSDATETIME(),
    Ip               VARCHAR(45) NULL,
    CONSTRAINT FK_LoginFallidos_Usuarios FOREIGN KEY (usuarios_idUsuario) REFERENCES dbo.Usuarios(idUsuario)
);
CREATE INDEX IX_LoginFallidos_Usuario ON dbo.LoginFallidos(usuarios_idUsuario, Fecha DESC);
GO

/* ----------------------- Recuperacion de contrasena ------------------ */
CREATE TABLE dbo.PasswordResets (
    idReset          INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PasswordResets PRIMARY KEY,
    usuarios_idUsuario INT NOT NULL,
    TokenHash        VARCHAR(64) NOT NULL,   -- sha256 del token enviado
    Expira           DATETIME2(0) NOT NULL,
    Usado            BIT NOT NULL CONSTRAINT DF_PasswordResets_Usado DEFAULT 0,
    CONSTRAINT FK_PasswordResets_Usuarios FOREIGN KEY (usuarios_idUsuario) REFERENCES dbo.Usuarios(idUsuario)
);
CREATE INDEX IX_PasswordResets_Token ON dbo.PasswordResets(TokenHash);
GO
