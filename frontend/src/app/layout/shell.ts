import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout">
      <aside class="sidebar">
        <div class="brand">Prueba Login</div>
        <nav>
          @for (item of auth.menu(); track item.idOpcion) {
            <a [routerLink]="item.Ruta" routerLinkActive="active">{{ item.NombreOpcion }}</a>
          }
        </nav>
        <div class="sidebar-footer">
          <div class="who">{{ auth.user()?.Nombres }} {{ auth.user()?.Apellidos }}<small>{{ auth.user()?.Roles }}</small></div>
          <button class="btn btn-outline" (click)="auth.logout()">Cerrar sesion</button>
        </div>
      </aside>
      <main class="content"><router-outlet /></main>
    </div>
  `,
})
export class ShellComponent implements OnInit {
  auth = inject(AuthService);
  ngOnInit() {
    this.auth.loadMenu().subscribe();
  }
}
