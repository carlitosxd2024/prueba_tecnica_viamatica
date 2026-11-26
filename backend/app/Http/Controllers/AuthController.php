<?php

namespace App\Http\Controllers;

use App\Application\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController
{
    public function __construct(private AuthService $auth) {}

    public function login(Request $r): JsonResponse
    {
        $d = $r->validate(['identificador' => 'required|string|max:120', 'password' => 'required|string|max:100']);
        return response()->json($this->auth->login($d['identificador'], $d['password'], $r->ip()));
    }

    public function logout(Request $r): JsonResponse
    {
        $this->auth->logout((int) $r->attributes->get('auth_user')['idUsuario']);
        return response()->json(['message' => 'Sesion cerrada correctamente.']);
    }

    public function forgot(Request $r): JsonResponse
    {
        $d = $r->validate(['mail' => 'required|email|max:120']);
        return response()->json($this->auth->forgotPassword($d['mail']));
    }

    public function reset(Request $r): JsonResponse
    {
        $d = $r->validate(['token' => 'required|string|size:64', 'password' => 'required|string|max:100']);
        $this->auth->resetPassword($d['token'], $d['password']);
        return response()->json(['message' => 'Contrasena actualizada. Ya puede iniciar sesion.']);
    }

    public function bienvenida(Request $r): JsonResponse
    {
        return response()->json($this->auth->bienvenida((int) $r->attributes->get('auth_user')['idUsuario']));
    }
}
