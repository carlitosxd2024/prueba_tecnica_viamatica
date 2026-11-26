import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { mensajeError } from '../../core/auth.interceptor';
import { Bienvenida } from '../../core/models';

@Component({
  selector: 'app-bienvenida',
  imports: [DatePipe],
  template: `
    <h1>Bienvenido{{ data() ? ', ' + data()!.user.Nombres : '' }}</h1>
    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
    @if (data(); as d) {
      <div class="grid-2">
        <section class="card">
          <h2>Mis datos</h2>
          <dl>
            <dt>Nombres</dt><dd>{{ d.user.Nombres }} {{ d.user.Apellidos }}</dd>
            <dt>Identificacion</dt><dd>{{ d.user.Identificacion }}</dd>
            <dt>Fecha de nacimiento</dt><dd>{{ d.user.FechaNacimiento }}</dd>
            <dt>Usuario</dt><dd>{{ d.user.UserName }}</dd>
            <dt>Correo</dt><dd>{{ d.user.Mail }}</dd>
            <dt>Rol</dt><dd>{{ d.user.Roles }}</dd>
            <dt>Estado</dt><dd><span class="badge" [class]="'badge s-' + d.user.Status">{{ d.user.Status }}</span></dd>
          </dl>
        </section>

        <section class="card">
          <h2>Sesion actual</h2>
          <dl>
            <dt>Hora de inicio</dt><dd>{{ d.sesionActual?.FechaIngreso | date: 'dd/MM/yyyy HH:mm:ss' }}</dd>
            <dt>Hora de fin</dt><dd>{{ d.sesionActual?.FechaCierre ? (d.sesionActual?.FechaCierre | date: 'dd/MM/yyyy HH:mm:ss') : 'Sesion en curso' }}</dd>
            <dt>Intentos fallidos antes de ingresar</dt><dd>{{ d.fallidosPrevios }}</dd>
            <dt>IP</dt><dd>{{ d.sesionActual?.Ip ?? '-' }}</dd>
          </dl>
          <h2>Sesion anterior</h2>
          @if (d.sesionAnterior; as a) {
            <dl>
              <dt>Inicio</dt><dd>{{ a.FechaIngreso | date: 'dd/MM/yyyy HH:mm:ss' }}</dd>
              <dt>Fin</dt><dd>{{ a.FechaCierre ? (a.FechaCierre | date: 'dd/MM/yyyy HH:mm:ss') : 'No registrado' }}</dd>
              <dt>Intentos fallidos previos</dt><dd>{{ a.IntentosFallidosPrevios }}</dd>
            </dl>
          } @else {
            <p class="muted">Esta es su primera sesion.</p>
          }
        </section>
      </div>
    }
  `,
})
export class BienvenidaComponent implements OnInit {
  private api = inject(ApiService);
  data = signal<Bienvenida | null>(null);
  error = signal('');

  ngOnInit() {
    this.api.bienvenida().subscribe({
      next: (d) => this.data.set(d),
      error: (e) => this.error.set(mensajeError(e)),
    });
  }
}
