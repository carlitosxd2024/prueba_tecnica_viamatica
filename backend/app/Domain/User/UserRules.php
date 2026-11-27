<?php

namespace App\Domain\User;

final class UserRules
{
    /** @return string[] */
    public static function username(string $value): array
    {
        $e = [];
        if (!preg_match('/^[A-Za-z0-9]*$/', $value)) {
            $e[] = 'El nombre de usuario no debe contener signos ni espacios.';
        }
        if (!preg_match('/\d/', $value)) {
            $e[] = 'El nombre de usuario debe tener al menos un numero.';
        }
        if (!preg_match('/[A-Z]/', $value)) {
            $e[] = 'El nombre de usuario debe tener al menos una letra mayuscula.';
        }
        $len = strlen($value);
        if ($len < 8 || $len > 20) {
            $e[] = 'El nombre de usuario debe tener entre 8 y 20 caracteres.';
        }
        return $e;
    }

    /** @return string[] */
    public static function password(string $value): array
    {
        $e = [];
        if (strlen($value) < 8) {
            $e[] = 'La contrasena debe tener al menos 8 caracteres.';
        }
        if (!preg_match('/[A-Z]/', $value)) {
            $e[] = 'La contrasena debe tener al menos una letra mayuscula.';
        }
        if (preg_match('/\s/', $value)) {
            $e[] = 'La contrasena no debe contener espacios.';
        }
        if (!preg_match('/[^A-Za-z0-9\s]/', $value)) {
            $e[] = 'La contrasena debe tener al menos un signo.';
        }
        return $e;
    }

    /** @return string[] */
    public static function identificacion(string $value): array
    {
        $e = [];
        if (!preg_match('/^\d+$/', $value)) {
            $e[] = 'La identificacion debe contener solo numeros.';
        }
        if (strlen($value) !== 10) {
            $e[] = 'La identificacion debe tener 10 digitos.';
        }
        if (preg_match('/(\d)\1{3}/', $value)) {
            $e[] = 'La identificacion no puede tener el mismo numero 4 veces seguidas.';
        }
        return $e;
    }

    /** @return string[] */
    public static function persona(string $nombres, string $apellidos, string $fechaNacimiento): array
    {
        $e = [];
        $nombres = trim($nombres);
        $apellidos = trim($apellidos);
        if ($nombres === '' || mb_strlen($nombres) > 60) {
            $e[] = 'Los nombres son obligatorios (maximo 60 caracteres).';
        }
        if ($apellidos === '' || mb_strlen($apellidos) > 60) {
            $e[] = 'Los apellidos son obligatorios (maximo 60 caracteres).';
        }
        $d = \DateTime::createFromFormat('Y-m-d', $fechaNacimiento);
        if (!$d || $d->format('Y-m-d') !== $fechaNacimiento) {
            $e[] = 'La fecha de nacimiento debe tener formato YYYY-MM-DD.';
        } elseif ($d >= new \DateTime('today')) {
            $e[] = 'La fecha de nacimiento debe ser anterior a hoy.';
        }
        return $e;
    }
}
