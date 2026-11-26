import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { mensajeError } from '../../core/auth.interceptor';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <form class="card auth-card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <h1>Recuperar contrasena</h1>
        <p class="muted">Ingrese su correo y le enviaremos un enlace para restablecerla.</p>

        @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
        @if (mensaje()) { <div class="alert alert-ok">{{ mensaje() }}</div> }
        @if (devLink()) {
          <div class="alert alert-info">
            Modo desarrollo (sin SMTP): <a [href]="devLink()">abrir enlace de recuperacion</a>
          </div>
        }

        <label>Correo
          <input type="email" formControlName="mail" autocomplete="email" />
        </label>
        @if (form.controls.mail.invalid && (form.controls.mail.touched || form.controls.mail.dirty)) {
          <small class="err">Ingrese un correo valido.</small>
        }

        <button class="btn" type="submit" [disabled]="loading()">Enviar enlace</button>
        <a routerLink="/login" class="link">Volver al login</a>
      </form>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  loading = signal(false);
  error = signal('');
  mensaje = signal('');
  devLink = signal('');
  form = this.fb.nonNullable.group({ mail: ['', [Validators.required, Validators.email]] });

  submit() {
    this.error.set(''); this.mensaje.set(''); this.devLink.set('');
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.auth.forgotPassword(this.form.getRawValue().mail.trim()).subscribe({
      next: (r) => { this.mensaje.set(r.message); this.devLink.set(r.devResetLink ?? ''); this.loading.set(false); },
      error: (e) => { this.error.set(mensajeError(e)); this.loading.set(false); },
    });
  }
}
