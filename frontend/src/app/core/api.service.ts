import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URL } from './config';
import { Bienvenida, CargaMasivaResultado, DashboardData, Sesion, Usuario } from './models';

export interface UsuarioForm {
  nombres: string; apellidos: string; identificacion: string;
  fechaNacimiento: string; username: string; password?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  bienvenida() { return this.http.get<Bienvenida>(`${API_URL}/bienvenida`); }
  dashboard() { return this.http.get<DashboardData>(`${API_URL}/dashboard`); }

  listarUsuarios(f: { texto?: string; status?: string; pagina?: number; porPagina?: number }) {
    let params = new HttpParams();
    Object.entries(f).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v)); });
    return this.http.get<{ data: Usuario[]; total: number }>(`${API_URL}/usuarios`, { params });
  }
  obtenerUsuario(id: number) { return this.http.get<Usuario>(`${API_URL}/usuarios/${id}`); }
  crearUsuario(d: UsuarioForm) { return this.http.post<Usuario>(`${API_URL}/usuarios`, d); }
  actualizarUsuario(id: number, d: UsuarioForm) { return this.http.put<Usuario>(`${API_URL}/usuarios/${id}`, d); }
  cambiarEstado(id: number, status: string) { return this.http.patch(`${API_URL}/usuarios/${id}/estado`, { status }); }
  eliminarUsuario(id: number) { return this.http.delete(`${API_URL}/usuarios/${id}`); }
  historial(id: number) { return this.http.get<{ sesiones: Sesion[]; fallidos: { Fecha: string; Ip: string | null }[] }>(`${API_URL}/usuarios/${id}/sesiones`); }

  cargaMasiva(archivo: File) {
    const fd = new FormData();
    fd.append('archivo', archivo);
    return this.http.post<CargaMasivaResultado>(`${API_URL}/usuarios/carga-masiva`, fd);
  }
}
