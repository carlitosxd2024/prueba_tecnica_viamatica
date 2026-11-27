import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { mensajeError } from '../../core/auth.interceptor';
import { CargaMasivaResultado, Usuario } from '../../core/models';
import { erroresDe, identificacionValidator, passwordValidator, usernameValidator } from '../../core/validators';

@Component({
  selector: 'app-usuarios',
  imports: [ReactiveFormsModule],
  template: `
    <h1>Mantenimiento de usuario</h1>
    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
    @if (info()) { <div class="alert alert-ok">{{ info() }}</div> }

    @if (auth.isAdmin()) {
      <section class="card">
        <h2>Buscar personas</h2>
        <form class="filters" [formGroup]="filtros" (ngSubmit)="buscar()">
          <label>Texto
            <input formControlName="texto" placeholder="Nombre, identificacion, usuario o correo" />
          </label>
          <label>Estado
            <select formControlName="status">
              <option value="">Todos</option>
              <option>ACTIVO</option><option>INACTIVO</option><option>BLOQUEADO</option>
            </select>
          </label>
          <button class="btn" type="submit">Buscar</button>
          <button class="btn btn-outline" type="button" (click)="limpiar()">Limpiar</button>
          <button class="btn btn-green" type="button" (click)="nuevo()">+ Nuevo usuario</button>
        </form>
      </section>

      <section class="card">
        <table>
          <thead>
            <tr><th>Nombre</th><th>Identificacion</th><th>Usuario</th><th>Correo</th><th>Rol</th><th>Sesion</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            @for (u of usuarios(); track u.idUsuario) {
              <tr>
                <td>{{ u.Nombres }} {{ u.Apellidos }}</td>
                <td>{{ u.Identificacion }}</td>
                <td>{{ u.UserName }}</td>
                <td>{{ u.Mail }}</td>
                <td>{{ u.Roles }}</td>
                <td>{{ u.SessionActive === 'S' ? 'Activa' : 'Inactiva' }}</td>
                <td>
                  <select [value]="u.Status" [disabled]="esAdminAjeno(u)" (change)="cambiarEstado(u, $any($event.target).value)">
                    <option>ACTIVO</option><option>INACTIVO</option><option>BLOQUEADO</option>
                  </select>
                </td>
                <td class="actions">
                  <button class="btn btn-sm" [disabled]="esAdminAjeno(u)" (click)="editar(u)">Editar</button>
                  <button class="btn btn-sm btn-danger" [disabled]="!!u.EsAdmin" (click)="eliminar(u)">Eliminar</button>
                </td>
              </tr>
            } @empty { <tr><td colspan="8" class="muted">Sin resultados.</td></tr> }
          </tbody>
        </table>
        <div class="pager">
          <button class="btn btn-sm btn-outline" [disabled]="pagina() <= 1" (click)="irA(pagina() - 1)">Anterior</button>
          <span>Pagina {{ pagina() }} de {{ totalPaginas() }} ({{ total() }} usuarios)</span>
          <button class="btn btn-sm btn-outline" [disabled]="pagina() >= totalPaginas()" (click)="irA(pagina() + 1)">Siguiente</button>
        </div>
      </section>

      <section class="card">
        <h2>Carga masiva (.xlsx o .csv)</h2>
        <p class="muted">Columnas requeridas: nombres, apellidos, identificacion, fechaNacimiento (AAAA-MM-DD), usuario, password.</p>
        <input type="file" accept=".xlsx,.csv" (change)="archivoElegido($event)" />
        <button class="btn" [disabled]="!archivo() || subiendo()" (click)="subir()">{{ subiendo() ? 'Procesando...' : 'Cargar usuarios' }}</button>
        @if (resultado(); as r) {
          <p><b>{{ r.creados }}</b> creados, <b>{{ r.errores }}</b> con error (de {{ r.total }} filas).</p>
          <table>
            <thead><tr><th>Fila</th><th>Resultado</th><th>Detalle</th></tr></thead>
            <tbody>
              @for (d of r.detalle; track d.fila) {
                <tr [class.row-error]="!d.ok"><td>{{ d.fila }}</td><td>{{ d.ok ? 'OK' : 'Error' }}</td><td>{{ d.ok ? d.mail : d.mensaje }}</td></tr>
              }
            </tbody>
          </table>
        }
      </section>
    }

    @if (modo()) {
      <section class="card">
        <h2>{{ modo() === 'nuevo' ? 'Nuevo usuario' : 'Editar usuario' }}</h2>
        <form [formGroup]="form" (ngSubmit)="guardar()" novalidate class="form-grid">
          <label>Nombres <input formControlName="nombres" /></label>
          @for (m of err('nombres'); track m) { <small class="err">{{ m }}</small> }

          <label>Apellidos <input formControlName="apellidos" /></label>
          @for (m of err('apellidos'); track m) { <small class="err">{{ m }}</small> }

          <label>Identificacion <input formControlName="identificacion" maxlength="10" inputmode="numeric" /></label>
          @for (m of err('identificacion'); track m) { <small class="err">{{ m }}</small> }

          <label>Fecha de nacimiento <input type="date" formControlName="fechaNacimiento" /></label>
          @for (m of err('fechaNacimiento'); track m) { <small class="err">{{ m }}</small> }

          <label>Usuario <input formControlName="username" autocomplete="off" /></label>
          @for (m of err('username'); track m) { <small class="err">{{ m }}</small> }

          <label>Contrasena {{ modo() === 'editar' ? '(dejar vacio para no cambiar)' : '' }}
            <input type="password" formControlName="password" autocomplete="new-password" />
          </label>
          @for (m of err('password'); track m) { <small class="err">{{ m }}</small> }

          @if (modo() === 'nuevo') { <p class="muted">El correo se genera automaticamente a partir de los datos ingresados.</p> }

          <div class="actions">
            <button class="btn" type="submit" [disabled]="guardando()">Guardar</button>
            @if (auth.isAdmin()) { <button class="btn btn-outline" type="button" (click)="cancelar()">Cancelar</button> }
          </div>
        </form>
      </section>
    }
  `,
})
export class UsuariosComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  auth = inject(AuthService);

  usuarios = signal<Usuario[]>([]);
  total = signal(0);
  pagina = signal(1);
  porPagina = 10;
  totalPaginas = computed(() => Math.max(1, Math.ceil(this.total() / this.porPagina)));

  modo = signal<null | 'nuevo' | 'editar'>(null);
  editandoId = signal<number | null>(null);
  guardando = signal(false);
  error = signal('');
  info = signal('');

  archivo = signal<File | null>(null);
  subiendo = signal(false);
  resultado = signal<CargaMasivaResultado | null>(null);

  filtros = this.fb.nonNullable.group({ texto: [''], status: [''] });
  form = this.fb.nonNullable.group({
    nombres: ['', [Validators.required, Validators.maxLength(60)]],
    apellidos: ['', [Validators.required, Validators.maxLength(60)]],
    identificacion: ['', [Validators.required, identificacionValidator]],
    fechaNacimiento: ['', [Validators.required]],
    username: ['', [Validators.required, usernameValidator]],
    password: ['', [passwordValidator]],
  });

  err(campo: string) { return erroresDe(this.form.get(campo)); }

  ngOnInit() {
    if (this.auth.isAdmin()) {
      this.buscar();
    } else {
      const id = this.auth.user()!.idUsuario;
      this.api.obtenerUsuario(id).subscribe({
        next: (u) => this.editar(u),
        error: (e) => this.error.set(mensajeError(e)),
      });
    }
  }

  esAdminAjeno(u: Usuario) {
    return !!u.EsAdmin && u.idUsuario !== this.auth.user()?.idUsuario;
  }

  buscar(pagina = 1) {
    this.pagina.set(pagina);
    const f = this.filtros.getRawValue();
    this.api.listarUsuarios({ texto: f.texto.trim(), status: f.status, pagina, porPagina: this.porPagina }).subscribe({
      next: (r) => { this.usuarios.set(r.data); this.total.set(r.total); },
      error: (e) => this.error.set(mensajeError(e)),
    });
  }
  irA(p: number) { this.buscar(p); }
  limpiar() { this.filtros.reset({ texto: '', status: '' }); this.buscar(); }

  nuevo() {
    this.limpiarMensajes();
    this.form.reset();
    this.form.controls.password.setValidators([Validators.required, passwordValidator]);
    this.form.controls.password.updateValueAndValidity();
    this.editandoId.set(null);
    this.modo.set('nuevo');
  }

  editar(u: Usuario) {
    this.limpiarMensajes();
    this.form.reset({
      nombres: u.Nombres, apellidos: u.Apellidos, identificacion: u.Identificacion,
      fechaNacimiento: (u.FechaNacimiento ?? '').substring(0, 10), username: u.UserName, password: '',
    });
    this.form.controls.password.setValidators([passwordValidator]);
    this.form.controls.password.updateValueAndValidity();
    this.editandoId.set(u.idUsuario);
    this.modo.set('editar');
  }

  cancelar() { this.modo.set(null); this.editandoId.set(null); }

  guardar() {
    this.limpiarMensajes();
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando.set(true);
    const v = this.form.getRawValue();
    const body = { ...v, password: v.password || null };
    const id = this.editandoId();
    const req = id === null ? this.api.crearUsuario(body) : this.api.actualizarUsuario(id, body);
    req.subscribe({
      next: (u) => {
        this.guardando.set(false);
        this.info.set(id === null ? `Usuario creado. Correo generado: ${u.Mail}` : 'Datos actualizados correctamente.');
        if (this.auth.isAdmin()) { this.cancelar(); this.buscar(this.pagina()); }
      },
      error: (e) => { this.guardando.set(false); this.error.set(mensajeError(e)); },
    });
  }

  cambiarEstado(u: Usuario, status: string) {
    this.limpiarMensajes();
    this.api.cambiarEstado(u.idUsuario, status).subscribe({
      next: () => { this.info.set(`Estado de ${u.UserName} actualizado a ${status}.`); this.buscar(this.pagina()); },
      error: (e) => { this.error.set(mensajeError(e)); this.buscar(this.pagina()); },
    });
  }

  eliminar(u: Usuario) {
    if (!confirm(`¿Eliminar al usuario ${u.UserName}?`)) return;
    this.limpiarMensajes();
    this.api.eliminarUsuario(u.idUsuario).subscribe({
      next: () => { this.info.set('Usuario eliminado.'); this.buscar(this.pagina()); },
      error: (e) => this.error.set(mensajeError(e)),
    });
  }

  archivoElegido(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0] ?? null;
    this.archivo.set(f);
    this.resultado.set(null);
  }

  subir() {
    const f = this.archivo();
    if (!f) return;
    this.limpiarMensajes();
    this.subiendo.set(true);
    this.api.cargaMasiva(f).subscribe({
      next: (r) => { this.resultado.set(r); this.subiendo.set(false); this.buscar(); },
      error: (e) => { this.error.set(mensajeError(e)); this.subiendo.set(false); },
    });
  }

  private limpiarMensajes() { this.error.set(''); this.info.set(''); }
}
