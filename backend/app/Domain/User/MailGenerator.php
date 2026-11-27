<?php

namespace App\Domain\User;

final class MailGenerator
{
    private const MAP = [
        'á'=>'a','à'=>'a','ä'=>'a','â'=>'a','é'=>'e','è'=>'e','ë'=>'e','ê'=>'e',
        'í'=>'i','ì'=>'i','ï'=>'i','î'=>'i','ó'=>'o','ò'=>'o','ö'=>'o','ô'=>'o',
        'ú'=>'u','ù'=>'u','ü'=>'u','û'=>'u','ñ'=>'n',
    ];

    public static function base(string $nombres, string $apellidos): string
    {
        $nombres = self::clean($nombres);
        $apellidos = self::clean($apellidos);

        $primerNombre = preg_split('/\s+/', $nombres, -1, PREG_SPLIT_NO_EMPTY)[0] ?? '';
        $partes = preg_split('/\s+/', $apellidos, -1, PREG_SPLIT_NO_EMPTY);
        $primerApellido = $partes[0] ?? '';
        $inicialSegundo = isset($partes[1]) ? substr($partes[1], 0, 1) : '';

        return substr($primerNombre, 0, 1) . $primerApellido . $inicialSegundo;
    }

    private static function clean(string $s): string
    {
        $s = strtr(mb_strtolower(trim($s), 'UTF-8'), self::MAP);
        return preg_replace('/[^a-z\s]/', '', $s) ?? '';
    }
}
