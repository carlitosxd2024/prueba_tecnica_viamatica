<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CatalogoController;
use App\Http\Controllers\UsuarioController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('forgot-password', [AuthController::class, 'forgot']);
    Route::post('reset-password', [AuthController::class, 'reset']);
});

Route::middleware('jwt')->group(function () {
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('bienvenida', [AuthController::class, 'bienvenida']);
    Route::get('menu', [CatalogoController::class, 'menu']);

    Route::get('usuarios/{id}', [UsuarioController::class, 'show'])->whereNumber('id');
    Route::put('usuarios/{id}', [UsuarioController::class, 'update'])->whereNumber('id');

    Route::middleware('role:ADMINISTRADOR')->group(function () {
        Route::get('dashboard', [CatalogoController::class, 'dashboard']);

        Route::get('usuarios', [UsuarioController::class, 'index']);
        Route::post('usuarios', [UsuarioController::class, 'store']);
        Route::post('usuarios/carga-masiva', [UsuarioController::class, 'cargaMasiva']);
        Route::patch('usuarios/{id}/estado', [UsuarioController::class, 'estado'])->whereNumber('id');
        Route::delete('usuarios/{id}', [UsuarioController::class, 'destroy'])->whereNumber('id');
        Route::get('usuarios/{id}/sesiones', [UsuarioController::class, 'sesiones'])->whereNumber('id');

        Route::get('roles', [CatalogoController::class, 'roles']);
        Route::post('roles', [CatalogoController::class, 'crearRol']);
        Route::put('roles/{id}', [CatalogoController::class, 'actualizarRol'])->whereNumber('id');
        Route::delete('roles/{id}', [CatalogoController::class, 'eliminarRol'])->whereNumber('id');
    });
});
