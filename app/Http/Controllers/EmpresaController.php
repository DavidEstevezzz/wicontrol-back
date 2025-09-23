<?php

namespace App\Http\Controllers;

use App\Models\Empresa;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Symfony\Component\HttpFoundation\Response;
use Exception;
use Illuminate\Support\Facades\Log;


class EmpresaController extends Controller
{
    /**
     * Listado de todas las empresas.
     */
    public function index(): JsonResponse
    {
        $empresas = Empresa::all();
        return response()->json($empresas);
    }

    /**
     * Crear una nueva empresa.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cif'              => 'required|string|max:50|unique:tb_empresa,cif',
            'nombre_empresa'   => 'required|string|max:50',
            'direccion'        => 'required|string|max:50',
            'email'            => 'nullable|email|max:50',
            'telefono'         => 'nullable|string|max:50',
            'pagina_web'       => 'nullable|url|max:50',
            'pais'             => 'required|string|max:50',
            'provincia'        => 'required|string|max:50',
            'localidad'        => 'required|string|max:50',
            'codigo_postal'    => 'required|integer',
            'fecha_hora_alta'  => 'required|date',
            'alta'             => 'boolean',
            'fecha_hora_baja'  => 'nullable|date',
            'lat'              => 'nullable|string|max:10',
            'lon'              => 'nullable|string|max:10',
            'usuario_contacto' => 'nullable|integer|exists:tb_usuario,id',
            'foto'             => 'nullable|string|max:50',
        ]);

        $empresa = Empresa::create($validated);

        return response()->json($empresa, 201);
    }

    /**
     * Mostrar una empresa concreta.
     */
    public function show(int $id): JsonResponse
    {
        $empresa = Empresa::findOrFail($id);
        return response()->json($empresa);
    }

    /**
     * Actualizar datos de una empresa.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $empresa = Empresa::findOrFail($id);

        $validated = $request->validate([
            'cif'              => "required|string|max:50|unique:tb_empresa,cif,{$id},id",
            'nombre_empresa'   => 'required|string|max:50',
            'direccion'        => 'required|string|max:50',
            'email'            => 'nullable|email|max:50',
            'telefono'         => 'nullable|string|max:50',
            'pagina_web'       => 'nullable|url|max:50',
            'pais'             => 'required|string|max:50',
            'provincia'        => 'required|string|max:50',
            'localidad'        => 'required|string|max:50',
            'codigo_postal'    => 'required|integer',
            'fecha_hora_alta'  => 'required|date',
            'alta'             => 'boolean',
            'fecha_hora_baja'  => 'nullable|date',
            'lat'              => 'nullable|string|max:10',
            'lon'              => 'nullable|string|max:10',
            'usuario_contacto' => 'nullable|integer|exists:tb_usuario,id',
            'foto'             => 'nullable|string|max:50',
        ]);

        $empresa->update($validated);

        return response()->json($empresa);
    }

    /**
     * Eliminar una empresa.
     */
    public function destroy(int $id): JsonResponse
    {
        Empresa::findOrFail($id)->delete();
        return response()->json(null, 204);
    }

   public function getUsuarios(int $empresaId): JsonResponse
{
    try {
        $empresa = Empresa::findOrFail($empresaId);
        
        // ✅ CORREGIR: Especificar la tabla para la columna 'id'
        $usuarios = $empresa->usuarios()
            ->select([
                'tb_usuario.id',           // ← CAMBIO: Especificar tabla
                'tb_usuario.nombre', 
                'tb_usuario.apellidos', 
                'tb_usuario.alias_usuario', 
                'tb_usuario.email', 
                'tb_usuario.dni', 
                'tb_usuario.usuario_tipo', 
                'tb_usuario.alta'
            ])
            ->where('tb_usuario.alta', 1)  // ← CAMBIO: Especificar tabla también aquí
            ->orderBy('tb_usuario.nombre')
            ->orderBy('tb_usuario.apellidos')
            ->get();

        return response()->json([
            'empresa_id' => $empresaId,
            'empresa_nombre' => $empresa->nombre_empresa,
            'total_usuarios' => $usuarios->count(),
            'usuarios' => $usuarios
        ], Response::HTTP_OK);
        
    } catch (ModelNotFoundException $e) {
        return response()->json([
            'error' => 'Empresa no encontrada'
        ], Response::HTTP_NOT_FOUND);
    } catch (Exception $e) {
        return response()->json([
            'error' => 'Error al obtener usuarios de la empresa',
            'message' => $e->getMessage()
        ], Response::HTTP_INTERNAL_SERVER_ERROR);
    }
}

    
}
