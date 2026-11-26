import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Mismas reglas que el backend (UserRules.php), para validar antes de consumir el servicio. */
export const usernameValidator: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const v: string = c.value ?? '';
  if (!v) return null;
  const e: ValidationErrors = {};
  if (!/^[A-Za-z0-9]*$/.test(v)) e['signos'] = true;
  if (!/\d/.test(v)) e['numero'] = true;
  if (!/[A-Z]/.test(v)) e['mayuscula'] = true;
  if (v.length < 8 || v.length > 20) e['longitud'] = true;
  return Object.keys(e).length ? e : null;
};

export const passwordValidator: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const v: string = c.value ?? '';
  if (!v) return null;
  const e: ValidationErrors = {};
  if (v.length < 8) e['longitud'] = true;
  if (!/[A-Z]/.test(v)) e['mayuscula'] = true;
  if (/\s/.test(v)) e['espacios'] = true;
  if (!/[^A-Za-z0-9\s]/.test(v)) e['signo'] = true;
  return Object.keys(e).length ? e : null;
};

export const identificacionValidator: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const v: string = c.value ?? '';
  if (!v) return null;
  const e: ValidationErrors = {};
  if (!/^\d*$/.test(v)) e['soloNumeros'] = true;
  if (v.length !== 10) e['longitud'] = true;
  if (/(\d)\1{3}/.test(v)) e['repetidos'] = true;
  return Object.keys(e).length ? e : null;
};

export const MENSAJES: Record<string, string> = {
  required: 'Campo obligatorio.',
  email: 'Correo no valido.',
  signos: 'No debe contener signos ni espacios.',
  numero: 'Debe tener al menos un numero.',
  mayuscula: 'Debe tener al menos una letra mayuscula.',
  longitud: 'Longitud no valida.',
  espacios: 'No debe contener espacios.',
  signo: 'Debe tener al menos un signo.',
  soloNumeros: 'Solo se permiten numeros.',
  repetidos: 'No puede repetir el mismo numero 4 veces seguidas.',
};

export function erroresDe(c: AbstractControl | null): string[] {
  if (!c || !c.errors || !(c.touched || c.dirty)) return [];
  return Object.keys(c.errors).map((k) => MENSAJES[k] ?? 'Valor no valido.');
}
