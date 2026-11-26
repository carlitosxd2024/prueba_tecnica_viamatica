<?php

namespace App\Application;

use App\Domain\Shared\DomainException;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JwtService
{
    public function issue(int $idUsuario, int $idSession): string
    {
        $now = time();
        return JWT::encode([
            'iss' => config('app.name'),
            'sub' => $idUsuario,
            'sid' => $idSession,
            'iat' => $now,
            'exp' => $now + config('jwt.ttl_minutes') * 60,
        ], config('jwt.secret'), config('jwt.algo'));
    }

    /** @return array{sub:int,sid:int} */
    public function decode(string $token): array
    {
        try {
            $p = (array) JWT::decode($token, new Key(config('jwt.secret'), config('jwt.algo')));
            return ['sub' => (int) $p['sub'], 'sid' => (int) $p['sid']];
        } catch (\Throwable $e) {
            throw new DomainException('Token invalido o expirado.', 401, 'ERR_TOKEN');
        }
    }
}
