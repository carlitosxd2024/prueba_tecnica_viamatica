import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token;
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // Token vencido o sesion cerrada: volver al login (excepto en el propio login)
      if (err.status === 401 && token && !req.url.includes('/auth/login')) {
        auth.clear();
      }
      return throwError(() => err);
    }),
  );
};

/** Extrae el mensaje legible de una respuesta de error de la API. */
export function mensajeError(err: unknown): string {
  const e = err as HttpErrorResponse;
  if (e?.status === 0) return 'No se pudo conectar con el servidor.';
  return e?.error?.message ?? 'Ocurrio un error inesperado.';
}
