<?php

namespace App\Application;

use App\Domain\Shared\DomainException;
use App\Domain\User\MailGenerator;
use App\Domain\User\UserRules;
use App\Infrastructure\Persistence\SqlServerGateway;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as XlsDate;

class UserService
{
    private const MAX_FILAS_CARGA = 500;

    public function __construct(private SqlServerGateway $db) {}

    public function listar(array $f): array
    {
        $rows = $this->db->rows('sp_Usuario_Listar', [
            'Texto'     => $f['texto'] ?? null,
            'Status'    => $f['status'] ?? null,
            'RolName'   => $f['rol'] ?? null,
            'Pagina'    => (int) ($f['pagina'] ?? 1),
            'PorPagina' => (int) ($f['porPagina'] ?? 10),
        ]);
        return ['data' => $rows, 'total' => (int) ($rows[0]['Total'] ?? 0)];
    }

    public function obtener(int $id): array
    {
        $u = $this->db->first('sp_Usuario_Obtener', ['idUsuario' => $id]);
        if (!$u) {
            throw new DomainException('Usuario no encontrado.', 404, 'ERR_USER_NOT_FOUND');
        }
        return $u;
    }

    public function crear(array $d): array
    {
        $errors = array_filter([
            'identificacion'  => UserRules::identificacion($d['identificacion']),
            'username'        => UserRules::username($d['username']),
            'password'        => UserRules::password($d['password']),
            'persona'         => UserRules::persona($d['nombres'], $d['apellidos'], $d['fechaNacimiento']),
        ]);
        if ($errors) {
            throw DomainException::validation($errors);
        }

        $r = $this->db->first('sp_Usuario_Crear', [
            'Nombres'         => trim($d['nombres']),
            'Apellidos'       => trim($d['apellidos']),
            'Identificacion'  => $d['identificacion'],
            'FechaNacimiento' => $d['fechaNacimiento'],
            'UserName'        => $d['username'],
            'PasswordHash'    => password_hash($d['password'], PASSWORD_BCRYPT),
            'MailBase'        => MailGenerator::base($d['nombres'], $d['apellidos']),
            'RolName'         => 'USUARIO',
        ]);
        return $this->obtener((int) $r['idUsuario']);
    }

    public function actualizar(int $solicitante, int $id, array $d): array
    {
        $errors = array_filter([
            'identificacion' => UserRules::identificacion($d['identificacion']),
            'username'       => UserRules::username($d['username']),
            'password'       => !empty($d['password']) ? UserRules::password($d['password']) : [],
            'persona'        => UserRules::persona($d['nombres'], $d['apellidos'], $d['fechaNacimiento']),
        ]);
        if ($errors) {
            throw DomainException::validation($errors);
        }

        $this->db->call('sp_Usuario_Actualizar', [
            'idSolicitante'   => $solicitante,
            'idUsuario'       => $id,
            'Nombres'         => trim($d['nombres']),
            'Apellidos'       => trim($d['apellidos']),
            'Identificacion'  => $d['identificacion'],
            'FechaNacimiento' => $d['fechaNacimiento'],
            'UserName'        => $d['username'],
            'PasswordHash'    => !empty($d['password']) ? password_hash($d['password'], PASSWORD_BCRYPT) : null,
        ]);
        return $this->obtener($id);
    }

    public function cambiarEstado(int $solicitante, int $id, string $status): void
    {
        $this->db->call('sp_Usuario_CambiarEstado', ['idSolicitante' => $solicitante, 'idUsuario' => $id, 'Status' => $status]);
    }

    public function eliminar(int $solicitante, int $id): void
    {
        $this->db->call('sp_Usuario_Eliminar', ['idSolicitante' => $solicitante, 'idUsuario' => $id]);
    }

    public function historial(int $idUsuario): array
    {
        [$sesiones, $fallidos] = $this->db->call('sp_Sesion_Historial', ['idUsuario' => $idUsuario, 'Top' => 50]);
        return ['sesiones' => $sesiones, 'fallidos' => $fallidos ?? []];
    }

    public function cargaMasiva(string $path): array
    {
        $sheet = IOFactory::load($path)->getActiveSheet();
        $matrix = $sheet->toArray(null, true, false, false);
        if (count($matrix) < 2) {
            throw new DomainException('El archivo no contiene filas de datos.', 422, 'ERR_FILE_EMPTY');
        }
        if (count($matrix) - 1 > self::MAX_FILAS_CARGA) {
            throw new DomainException('El archivo supera el maximo de ' . self::MAX_FILAS_CARGA . ' filas.', 422, 'ERR_FILE_TOO_LARGE');
        }

        $idx = $this->mapearColumnas($matrix[0]);
        $resultado = ['total' => 0, 'creados' => 0, 'errores' => 0, 'detalle' => []];

        foreach (array_slice($matrix, 1) as $i => $row) {
            $fila = $i + 2;
            if (!array_filter($row, fn ($c) => $c !== null && trim((string) $c) !== '')) {
                continue;
            }
            $resultado['total']++;
            try {
                $u = $this->crear([
                    'nombres'         => (string) $row[$idx['nombres']],
                    'apellidos'       => (string) $row[$idx['apellidos']],
                    'identificacion'  => $this->normalizarIdentificacion($row[$idx['identificacion']]),
                    'fechaNacimiento' => $this->normalizarFecha($row[$idx['fechanacimiento']]),
                    'username'        => trim((string) $row[$idx['usuario']]),
                    'password'        => (string) $row[$idx['password']],
                ]);
                $resultado['creados']++;
                $resultado['detalle'][] = ['fila' => $fila, 'ok' => true, 'mensaje' => 'Creado', 'mail' => $u['Mail']];
            } catch (DomainException $e) {
                $resultado['errores']++;
                $resultado['detalle'][] = ['fila' => $fila, 'ok' => false, 'mensaje' => $e->getMessage()];
            }
        }
        return $resultado;
    }

    private function mapearColumnas(array $header): array
    {
        $alias = [
            'nombres' => ['nombres', 'nombre'],
            'apellidos' => ['apellidos', 'apellido'],
            'identificacion' => ['identificacion', 'cedula'],
            'fechanacimiento' => ['fechanacimiento', 'fechadenacimiento', 'nacimiento'],
            'usuario' => ['usuario', 'username', 'nombredeusuario'],
            'password' => ['password', 'contrasena', 'clave'],
        ];
        $norm = array_map(fn ($h) => preg_replace('/[^a-z]/', '', strtr(mb_strtolower(trim((string) $h)), ['á'=>'a','é'=>'e','í'=>'i','ó'=>'o','ú'=>'u','ñ'=>'n'])), $header);

        $idx = [];
        foreach ($alias as $campo => $nombres) {
            foreach ($norm as $pos => $h) {
                if (in_array($h, $nombres, true)) { $idx[$campo] = $pos; break; }
            }
            if (!isset($idx[$campo])) {
                throw new DomainException("Falta la columna obligatoria: {$campo}.", 422, 'ERR_FILE_COLUMNS');
            }
        }
        return $idx;
    }

    private function normalizarIdentificacion(mixed $v): string
    {
        $s = is_numeric($v) ? sprintf('%.0f', $v) : trim((string) $v);
        return (strlen($s) === 9 && ctype_digit($s)) ? '0' . $s : $s;
    }

    private function normalizarFecha(mixed $v): string
    {
        if (is_numeric($v)) {
            return XlsDate::excelToDateTimeObject((float) $v)->format('Y-m-d');
        }
        $s = trim((string) $v);
        foreach (['Y-m-d', 'd/m/Y', 'd-m-Y'] as $fmt) {
            $d = \DateTime::createFromFormat($fmt, $s);
            if ($d && $d->format($fmt) === $s) {
                return $d->format('Y-m-d');
            }
        }
        return $s;
    }
}
