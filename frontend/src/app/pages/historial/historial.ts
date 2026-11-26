import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { mensajeError } from '../../core/auth.interceptor';
import { Sesion, Usuario } from '../../core/models';

/** Rol ADMINISTRADOR: revisa los inicios/cierres de sesion de un usuario especifico. */
@Component({
  selector: 'app-historial',
  imports: [FormsModule, DatePipe],
  template: `
    <h1>Historial de sesiones</h1>
    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

    <div class="card">
      <label>Usuario
        <select [ngModel]="selected()" (ngModelChange)="cargar($event)">
          <option [ngValue]="null">-- Seleccione un usuario --</option>
          @for (u of usuarios(); track u.idUsuario) {
            <option [ngValue]="u.idUsuario">{{ u.UserName }} ({{ u.Mail }})</option>
          }
        </select>
      </label>
    </div>

    @if (selected() !== null) {
      <div class="grid-2">
        <section class="card">
          <h2>Inicios y cierres de sesion</h2>
          <table>
            <thead><tr><th>Inicio</th><th>Cierre</th><th>Fallidos previos</th><th>IP</th></tr></thead>
            <tbody>
              @for (s of sesiones(); track s.idSession) {
                <tr>
                  <td>{{ s.FechaIngreso | date: 'dd/MM/yyyy HH:mm:ss' }}</td>
                  <td>{{ s.FechaCierre ? (s.FechaCierre | date: 'dd/MM/yyyy HH:mm:ss') : 'En curso' }}</td>
                  <td>{{ s.IntentosFallidosPrevios }}</td><td>{{ s.Ip ?? '-' }}</td>
                </tr>
              } @empty { <tr><td colspan="4" class="muted">Sin sesiones registradas.</td></tr> }
            </tbody>
          </table>
        </section>
        <section class="card">
          <h2>Intentos fallidos</h2>
          <table>
            <thead><tr><th>Fecha</th><th>IP</th></tr></thead>
            <tbody>
              @for (f of fallidos(); track f.Fecha) {
                <tr><td>{{ f.Fecha | date: 'dd/MM/yyyy HH:mm:ss' }}</td><td>{{ f.Ip ?? '-' }}</td></tr>
              } @empty { <tr><td colspan="2" class="muted">Sin intentos fallidos.</td></tr> }
            </tbody>
          </table>
        </section>
      </div>
    }
  `,
})
export class HistorialComponent implements OnInit {
  private api = inject(ApiService);
  usuarios = signal<Usuario[]>([]);
  selected = signal<number | null>(null);
  sesiones = signal<Sesion[]>([]);
  fallidos = signal<{ Fecha: string; Ip: string | null }[]>([]);
  error = signal('');

  ngOnInit() {
    this.api.listarUsuarios({ porPagina: 100 }).subscribe({
      next: (r) => this.usuarios.set(r.data),
      error: (e) => this.error.set(mensajeError(e)),
    });
  }

  cargar(id: number | null) {
    this.selected.set(id);
    if (id === null) return;
    this.api.historial(id).subscribe({
      next: (r) => { this.sesiones.set(r.sesiones); this.fallidos.set(r.fallidos); },
      error: (e) => this.error.set(mensajeError(e)),
    });
  }
}
