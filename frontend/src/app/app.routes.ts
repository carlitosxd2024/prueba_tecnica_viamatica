import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/guards';

export const routes: Routes = [
  {
    path: 'login', canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./pages/login/forgot-password').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./pages/login/reset-password').then((m) => m.ResetPasswordComponent),
  },
  {
    path: '', canActivate: [authGuard],
    loadComponent: () => import('./layout/shell').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'bienvenida' },
      { path: 'bienvenida', loadComponent: () => import('./pages/bienvenida/bienvenida').then((m) => m.BienvenidaComponent) },
      { path: 'dashboard', canActivate: [adminGuard], loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent) },
      { path: 'usuarios', loadComponent: () => import('./pages/usuarios/usuarios').then((m) => m.UsuariosComponent) },
      { path: 'historial', canActivate: [adminGuard], loadComponent: () => import('./pages/historial/historial').then((m) => m.HistorialComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
