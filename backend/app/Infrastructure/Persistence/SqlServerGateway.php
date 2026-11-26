<?php

namespace App\Infrastructure\Persistence;

use App\Domain\Shared\DomainException;
use Illuminate\Support\Facades\DB;
use PDO;
use PDOException;

/**
 * Unica puerta de entrada a los Stored Procedures de SQL Server.
 * - call():  devuelve TODOS los result sets del SP (lista de listas de filas).
 * - rows():  atajo que devuelve solo el primer result set.
 * - Traduce los errores "ERR_CODIGO: mensaje" lanzados por THROW a DomainException.
 */
class SqlServerGateway
{
    private const STATUS = [
        'ERR_IDENTIFICACION_DUP' => 409,
        'ERR_USERNAME_DUP'       => 409,
        'ERR_ROL_DUP'            => 409,
        'ERR_ROL_IN_USE'         => 409,
        'ERR_USER_NOT_FOUND'     => 404,
        'ERR_ROL_NOT_FOUND'      => 404,
        'ERR_FORBIDDEN'          => 403,
        'ERR_STATUS_INVALID'     => 422,
        'ERR_TOKEN_INVALID'      => 422,
    ];

    /** @return array<int, array<int, array<string, mixed>>> */
    public function call(string $procedure, array $params = []): array
    {
        $assign = [];
        foreach (array_keys($params) as $name) {
            $assign[] = "@{$name} = ?";
        }
        $sql = "EXEC dbo.{$procedure} " . implode(', ', $assign);

        try {
            $stmt = DB::connection()->getPdo()->prepare($sql);
            $stmt->execute(array_values($params));

            $sets = [];
            do {
                if ($stmt->columnCount() > 0) {
                    $sets[] = array_map([$this, 'normalize'], $stmt->fetchAll(PDO::FETCH_ASSOC));
                }
            } while ($stmt->nextRowset());

            return $sets;
        } catch (PDOException $e) {
            throw $this->translate($e);
        }
    }

    /** @return array<int, array<string, mixed>> */
    public function rows(string $procedure, array $params = []): array
    {
        return $this->call($procedure, $params)[0] ?? [];
    }

    public function first(string $procedure, array $params = []): ?array
    {
        return $this->rows($procedure, $params)[0] ?? null;
    }

    private function normalize(array $row): array
    {
        foreach ($row as $k => $v) {
            // datetime2 -> ISO 8601 (Angular lo interpreta directamente)
            if (is_string($v) && preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/', $v)) {
                $row[$k] = str_replace(' ', 'T', substr($v, 0, 19));
            }
            if (is_string($v) && in_array($k, ['Status'], true)) {
                $row[$k] = trim($v);
            }
        }
        return $row;
    }

    private function translate(PDOException $e): \Throwable
    {
        if (preg_match('/(ERR_[A-Z_]+):\s*([^\n\[]+)/', $e->getMessage(), $m)) {
            return new DomainException(trim($m[2]), self::STATUS[$m[1]] ?? 422, $m[1]);
        }
        return $e; // error tecnico real: lo maneja el handler de Laravel
    }
}
