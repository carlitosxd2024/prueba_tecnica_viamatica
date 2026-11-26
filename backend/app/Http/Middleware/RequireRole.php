<?php

namespace App\Http\Middleware;

use App\Domain\Shared\DomainException;
use Closure;
use Illuminate\Http\Request;

/** Uso: ->middleware('role:ADMINISTRADOR') */
class RequireRole
{
    public function handle(Request $request, Closure $next, string $role)
    {
        $roles = explode(',', (string) ($request->attributes->get('auth_user')['Roles'] ?? ''));
        if (!in_array($role, $roles, true)) {
            throw new DomainException('No tiene permisos para realizar esta accion.', 403, 'ERR_FORBIDDEN');
        }
        return $next($request);
    }
}
