import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { mensajeError } from '../../core/auth.interceptor';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <form class="card auth-card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <h1>Iniciar sesion</h1>
        <p class="muted">Ingrese con su correo o nombre de usuario.</p>

        @if (error()) { <div class="alert alert-error" role="alert">{{ error() }}</div> }

        <label>Correo o usuario
          <input formControlName="identificador" autocomplete="username" />
        </label>
        @if (invalid('identificador')) { <small class="err">Ingrese su correo o nombre de usuario.</small> }

        <label>Contrasena
          <input type="password" formControlName="password" autocomplete="current-password" />
        </label>
        @if (invalid('password')) { <small class="err">Ingrese su contrasena.</small> }

        <button class="btn" type="submit" [disabled]="loading()">{{ loading() ? 'Ingresando...' : 'Ingresar' }}</button>
        <a routerLink="/forgot-password" class="link">¿Olvido su contrasena?</a>
      </form>
    </div>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  error = signal('');
  form = this.fb.nonNullable.group({
    identificador: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  invalid(name: 'identificador' | 'password') {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  submit() {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    const { identificador, password } = this.form.getRawValue();
    this.auth.login(identificador.trim(), password).subscribe({
      next: () => this.router.navigate(['/bienvenida']),
      error: (e) => { this.error.set(mensajeError(e)); this.loading.set(false); },
    });
  }
}
