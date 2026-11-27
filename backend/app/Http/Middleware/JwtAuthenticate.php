<?php

namespace App\Http\Middleware;

use App\Application\JwtService;
use App\Domain\Shared\DomainException;
use App\Infrastructure\Persistence\SqlServerGateway;
use Closure;
use Illuminate\Http\Request;

class JwtAuthenticate
{
    public function __construct(private JwtService $jwt, private SqlServerGateway $db) {}

    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken();
        if (!$token) {
            throw new DomainException('No autenticado.', 401, 'ERR_UNAUTHENTICATED');
        }

        $claims = $this->jwt->decode($token);

        $activa = $this->db->first('sp_Sesion_EstaActiva', ['idSession' => $claims['sid']]);
        if (!$activa || (int) $activa['Activa'] !== 1) {
            throw new DomainException('La sesion ya no esta activa. Inicie sesion nuevamente.', 401, 'ERR_SESSION_CLOSED');
        }

        $user = $this->db->first('sp_Usuario_Obtener', ['idUsuario' => $claims['sub']]);
        if (!$user || $user['Status'] !== 'ACTIVO') {
            throw new DomainException('Usuario no habilitado.', 401, 'ERR_USER_DISABLED');
        }

        $request->attributes->set('auth_user', $user);
        $request->attributes->set('auth_sid', $claims['sid']);

        return $next($request);
    }
}
