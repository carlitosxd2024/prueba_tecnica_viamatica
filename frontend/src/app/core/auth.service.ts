import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { API_URL } from './config';
import { MenuItem, Usuario } from './models';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly user = signal<Usuario | null>(this.readUser());
  readonly menu = signal<MenuItem[]>([]);
  readonly isAdmin = computed(() => !!this.user()?.EsAdmin);

  get token(): string | null {
    try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
  }

  isLoggedIn(): boolean {
    return !!this.token;
  }

  login(identificador: string, password: string) {
    return this.http
      .post<{ token: string; user: Usuario }>(`${API_URL}/auth/login`, { identificador, password })
      .pipe(tap((r) => {
        try {
          sessionStorage.setItem(TOKEN_KEY, r.token);
          sessionStorage.setItem(USER_KEY, JSON.stringify(r.user));
        } catch { /* sessionStorage no disponible */ }
        this.user.set(r.user);
      }));
  }

  /** Cierra la sesion en el servidor (registra el cierre) y limpia el estado local. */
  logout() {
    this.http.post(`${API_URL}/auth/logout`, {}).subscribe({
      next: () => this.clear(),
      error: () => this.clear(),
    });
  }

  /** Limpia el estado local y vuelve al login (tambien lo usa el interceptor ante un 401). */
  clear() {
    try { sessionStorage.clear(); } catch { /* noop */ }
    this.user.set(null);
    this.menu.set([]);
    this.router.navigate(['/login']);
  }

  loadMenu() {
    return this.http.get<MenuItem[]>(`${API_URL}/menu`).pipe(tap((m) => this.menu.set(m)));
  }

  forgotPassword(mail: string) {
    return this.http.post<{ message: string; devResetLink?: string }>(`${API_URL}/auth/forgot-password`, { mail });
  }

  resetPassword(token: string, password: string) {
    return this.http.post<{ message: string }>(`${API_URL}/auth/reset-password`, { token, password });
  }

  private readUser(): Usuario | null {
    try { return JSON.parse(sessionStorage.getItem(USER_KEY) ?? 'null'); } catch { return null; }
  }
}
