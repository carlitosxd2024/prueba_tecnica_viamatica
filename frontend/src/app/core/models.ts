export interface Usuario {
  idUsuario: number;
  UserName: string;
  Mail: string;
  Status: 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';
  SessionActive: 'S' | 'N';
  idPersona?: number;
  Nombres: string;
  Apellidos: string;
  Identificacion: string;
  FechaNacimiento: string;
  Roles: string;
  EsAdmin: number | boolean;
  Total?: number;
}

export interface MenuItem {
  idOpcion: number;
  NombreOpcion: string;
  Ruta: string;
  Icono: string;
  Orden: number;
}

export interface Sesion {
  idSession: number;
  FechaIngreso: string;
  FechaCierre: string | null;
  IntentosFallidosPrevios: number;
  Ip: string | null;
}

export interface Bienvenida {
  user: Usuario;
  sesionActual: Sesion | null;
  sesionAnterior: Sesion | null;
  fallidosPrevios: number;
  fallidosDesdeUltimoIngreso: number;
}

export interface DashboardData {
  totales: {
    TotalUsuarios: number; ConSesionActiva: number; ConSesionInactiva: number;
    Activos: number; Inactivos: number; Bloqueados: number;
  };
  fallidosPorDia: { Dia: string; Fallidos: number }[];
  topFallidos: { UserName: string; Mail: string; Fallidos: number; Status: string }[];
  totalFallidos: number;
}

export interface CargaMasivaResultado {
  total: number; creados: number; errores: number;
  detalle: { fila: number; ok: boolean; mensaje: string; mail?: string }[];
}
