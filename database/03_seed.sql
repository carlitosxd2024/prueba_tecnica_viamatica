USE PruebaLogin;
GO

INSERT INTO dbo.Rol (RolName) VALUES ('ADMINISTRADOR'), ('USUARIO');

INSERT INTO dbo.RolOpciones (NombreOpcion, Ruta, Icono, Orden) VALUES
 ('Bienvenida',            '/bienvenida',  'home',      1),
 ('Dashboard',             '/dashboard',   'chart',     2),
 ('Mantenimiento Usuario', '/usuarios',    'users',     3),
 ('Historial de sesiones', '/historial',   'history',   4);

INSERT INTO dbo.Rol_RolOpciones (Rol_idRol, RolOpciones_idOpcion)
SELECT r.idRol, o.idOpcion FROM dbo.Rol r CROSS JOIN dbo.RolOpciones o WHERE r.RolName = 'ADMINISTRADOR';

INSERT INTO dbo.Rol_RolOpciones (Rol_idRol, RolOpciones_idOpcion)
SELECT r.idRol, o.idOpcion FROM dbo.Rol r JOIN dbo.RolOpciones o
  ON o.NombreOpcion IN ('Bienvenida','Mantenimiento Usuario') WHERE r.RolName = 'USUARIO';
GO

DECLARE @idPersona INT, @idUsuario INT;

INSERT INTO dbo.Persona (Nombres, Apellidos, Identificacion, FechaNacimiento)
VALUES ('Administrador', 'Sistema', '1710034065', '1990-01-15');
SET @idPersona = SCOPE_IDENTITY();
INSERT INTO dbo.Usuarios (UserName, Password, Mail, Persona_idPersona)
VALUES ('Admin2024', '$2y$10$NeipKQa9yRiP7iQQWu1ZcOa7sL0I7iNqutLa7luS4K8qgl.Qi8ttW', 'admin@mail.com', @idPersona);
SET @idUsuario = SCOPE_IDENTITY();
INSERT INTO dbo.Rol_Usuarios SELECT idRol, @idUsuario FROM dbo.Rol WHERE RolName = 'ADMINISTRADOR';

INSERT INTO dbo.Persona (Nombres, Apellidos, Identificacion, FechaNacimiento)
VALUES ('Usuario', 'Prueba', '1203574901', '1995-06-20');
SET @idPersona = SCOPE_IDENTITY();
INSERT INTO dbo.Usuarios (UserName, Password, Mail, Persona_idPersona)
VALUES ('Usuario2024', '$2y$10$5KmAak5T08//vuHLHBBWjejkGIGEZvbcGpcyW4YsTB2rxd2tkqDjG', 'usuario@mail.com', @idPersona);
SET @idUsuario = SCOPE_IDENTITY();
INSERT INTO dbo.Rol_Usuarios SELECT idRol, @idUsuario FROM dbo.Rol WHERE RolName = 'USUARIO';
GO
