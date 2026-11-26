import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { mensajeError } from '../../core/auth.interceptor';
import { erroresDe, passwordValidator } from '../../core/validators';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <form class="card auth-card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <h1>Nueva contrasena</h1>
        @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
        @if (ok()) { <div class="alert alert-ok">{{ ok() }}</div> }

        <label>Nueva contrasena
          <input type="password" formControlName="password" autocomplete="new-password" />
        </label>
        @for (m of errores(form.controls.password); track m) { <small class="err">{{ m }}</small> }

        <label>Confirmar contrasena
          <input type="password" formControlName="confirm" autocomplete="new-password" />
        </label>
        @if (form.hasError('mismatch') && form.controls.confirm.touched) { <small class="err">Las contrasenas no coinciden.</small> }

        <button class="btn" type="submit" [disabled]="loading()">Restablecer</button>
        <a routerLink="/login" class="link">Volver al login</a>
      </form>
    </div>
  `,
})
export class ResetPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  errores = erroresDe;
  loading = signal(false);
  error = signal('');
  ok = signal('');
  token = this.route.snapshot.queryParamMap.get('token') ?? '';

  form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, passwordValidator]],
      confirm: ['', [Validators.required]],
    },
    { validators: (g) => (g.get('password')?.value === g.get('confirm')?.value ? null : { mismatch: true }) },
  );

  submit() {
    this.error.set('');
    if (!this.token) { this.error.set('El enlace no es valido.'); return; }
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.auth.resetPassword(this.token, this.form.getRawValue().password).subscribe({
      next: (r) => { this.ok.set(r.message); setTimeout(() => this.router.navigate(['/login']), 1500); },
      error: (e) => { this.error.set(mensajeError(e)); this.loading.set(false); },
    });
  }
}
