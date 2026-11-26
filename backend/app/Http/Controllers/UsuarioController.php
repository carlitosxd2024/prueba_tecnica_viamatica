<?php

namespace App\Http\Controllers;

use App\Application\UserService;
use App\Domain\Shared\DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UsuarioController
{
    private const CAMPOS = [
        'nombres'         => 'required|string|max:60',
        'apellidos'       => 'required|string|max:60',
        'identificacion'  => 'required|string|max:20',
        'fechaNacimiento' => 'required|string|max:10',
        'username'        => 'required|string|max:50',
    ];

    public function __construct(private UserService $users) {}

    private function me(Request $r): array
    {
        return $r->attributes->get('auth_user');
    }

    /** Un usuario no administrador solo puede ver/consultar lo suyo. */
    private function soloPropioOAdmin(Request $r, int $id): void
    {
        $me = $this->me($r);
        if ((int) $me['idUsuario'] !== $id && !(int) $me['EsAdmin']) {
            throw new DomainException('Solo puede consultar sus propios datos.', 403, 'ERR_FORBIDDEN');
        }
    }

    public function index(Request $r): JsonResponse
    {
        return response()->json($this->users->listar($r->only(['texto', 'status', 'rol', 'pagina', 'porPagina'])));
    }

    public function show(Request $r, int $id): JsonResponse
    {
        $this->soloPropioOAdmin($r, $id);
        return response()->json($this->users->obtener($id));
    }

    public function store(Request $r): JsonResponse
    {
        $d = $r->validate(self::CAMPOS + ['password' => 'required|string|max:100']);
        return response()->json($this->users->crear($d), 201);
    }

    public function update(Request $r, int $id): JsonResponse
    {
        $d = $r->validate(self::CAMPOS + ['password' => 'nullable|string|max:100']);
        return response()->json($this->users->actualizar((int) $this->me($r)['idUsuario'], $id, $d));
    }

    public function estado(Request $r, int $id): JsonResponse
    {
        $d = $r->validate(['status' => 'required|in:ACTIVO,INACTIVO,BLOQUEADO']);
        $this->users->cambiarEstado((int) $this->me($r)['idUsuario'], $id, $d['status']);
        return response()->json(['message' => 'Estado actualizado.']);
    }

    public function destroy(Request $r, int $id): JsonResponse
    {
        $this->users->eliminar((int) $this->me($r)['idUsuario'], $id);
        return response()->json(['message' => 'Usuario eliminado.']);
    }

    public function sesiones(Request $r, int $id): JsonResponse
    {
        return response()->json($this->users->historial($id));
    }

    public function cargaMasiva(Request $r): JsonResponse
    {
        $r->validate(['archivo' => 'required|file|mimes:xlsx,csv,txt|max:5120']);
        return response()->json($this->users->cargaMasiva($r->file('archivo')->getRealPath()));
    }
}
