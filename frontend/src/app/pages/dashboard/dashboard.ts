import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { mensajeError } from '../../core/auth.interceptor';
import { DashboardData } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe],
  template: `
    <h1>Dashboard</h1>
    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
    @if (d(); as d) {
      <div class="kpis">
        <div class="kpi"><span>Total usuarios</span><b>{{ d.totales.TotalUsuarios }}</b></div>
        <div class="kpi ok"><span>Con sesion activa</span><b>{{ d.totales.ConSesionActiva }}</b></div>
        <div class="kpi"><span>Con sesion inactiva</span><b>{{ d.totales.ConSesionInactiva }}</b></div>
        <div class="kpi ok"><span>Activos</span><b>{{ d.totales.Activos }}</b></div>
        <div class="kpi warn"><span>Inactivos</span><b>{{ d.totales.Inactivos }}</b></div>
        <div class="kpi bad"><span>Bloqueados</span><b>{{ d.totales.Bloqueados }}</b></div>
        <div class="kpi bad"><span>Inicios de sesion fallidos</span><b>{{ d.totalFallidos }}</b></div>
      </div>

      <div class="grid-2">
        <section class="card">
          <h2>Fallidos por dia (ultimos 7 dias)</h2>
          @if (d.fallidosPorDia.length === 0) { <p class="muted">Sin intentos fallidos recientes.</p> }
          @for (f of d.fallidosPorDia; track f.Dia) {
            <div class="bar-row">
              <span>{{ f.Dia | date: 'dd/MM' }}</span>
              <div class="bar"><i [style.width.%]="(f.Fallidos / maxFallidos()) * 100"></i></div>
              <b>{{ f.Fallidos }}</b>
            </div>
          }
        </section>

        <section class="card">
          <h2>Usuarios con mas intentos fallidos</h2>
          @if (d.topFallidos.length === 0) { <p class="muted">Sin datos.</p> } @else {
            <table>
              <thead><tr><th>Usuario</th><th>Correo</th><th>Fallidos</th><th>Estado</th></tr></thead>
              <tbody>
                @for (t of d.topFallidos; track t.UserName) {
                  <tr><td>{{ t.UserName }}</td><td>{{ t.Mail }}</td><td>{{ t.Fallidos }}</td>
                      <td><span class="badge" [class]="'badge s-' + t.Status">{{ t.Status }}</span></td></tr>
                }
              </tbody>
            </table>
          }
        </section>
      </div>
    }
  `,
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  d = signal<DashboardData | null>(null);
  error = signal('');
  maxFallidos = computed(() => Math.max(1, ...(this.d()?.fallidosPorDia.map((x) => x.Fallidos) ?? [1])));

  ngOnInit() {
    this.api.dashboard().subscribe({
      next: (r) => this.d.set(r),
      error: (e) => this.error.set(mensajeError(e)),
    });
  }
}
