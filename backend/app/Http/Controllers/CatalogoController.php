<?php

namespace App\Http\Controllers;

use App\Domain\Shared\DomainException;
use App\Infrastructure\Persistence\SqlServerGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Menu por rol, CRUD de roles y dashboard. */
class CatalogoController
{
    public function __construct(private SqlServerGateway $db) {}

    public function menu(Request $r): JsonResponse
    {
        return response()->json($this->db->rows('sp_Menu_PorUsuario', [
            'idUsuario' => (int) $r->attributes->get('auth_user')['idUsuario'],
        ]));
    }

    public function dashboard(): JsonResponse
    {
        [$totales, $porDia, $top, $total] = $this->db->call('sp_Dashboard_Indicadores');
        return response()->json([
            'totales'       => $totales[0] ?? [],
            'fallidosPorDia' => $porDia ?? [],
            'topFallidos'   => $top ?? [],
            'totalFallidos' => (int) ($total[0]['TotalFallidos'] ?? 0),
        ]);
    }

    public function roles(): JsonResponse
    {
        return response()->json($this->db->rows('sp_Rol_Listar'));
    }

    public function crearRol(Request $r): JsonResponse
    {
        $d = $r->validate(['rolName' => 'required|string|max:50']);
        return response()->json($this->db->first('sp_Rol_Crear', ['RolName' => $d['rolName']]), 201);
    }

    public function actualizarRol(Request $r, int $id): JsonResponse
    {
        $d = $r->validate(['rolName' => 'required|string|max:50']);
        $this->db->call('sp_Rol_Actualizar', ['idRol' => $id, 'RolName' => $d['rolName']]);
        return response()->json(['message' => 'Rol actualizado.']);
    }

    public function eliminarRol(int $id): JsonResponse
    {
        $this->db->call('sp_Rol_Eliminar', ['idRol' => $id]);
        return response()->json(['message' => 'Rol eliminado.']);
    }
}
