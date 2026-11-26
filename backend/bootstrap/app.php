<?php

use App\Domain\Shared\DomainException;
use App\Http\Middleware\JwtAuthenticate;
use App\Http\Middleware\RequireRole;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'jwt'  => JwtAuthenticate::class,
            'role' => RequireRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Errores de negocio (reglas de dominio / errores lanzados por los SP)
        $exceptions->render(function (DomainException $e, Request $request) {
            return response()->json([
                'message' => $e->getMessage(),
                'code'    => $e->errorCode,
                'errors'  => $e->errors,
            ], $e->status);
        });
    })->create();
