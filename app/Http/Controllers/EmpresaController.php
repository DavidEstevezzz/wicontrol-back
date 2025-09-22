<?php

namespace App\Http\Controllers;

use App\Models\Empresa;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Symfony\Component\HttpFoundation\Response;
use Exception;


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
        // Verificar que la empresa existe
        $empresa = Empresa::findOrFail($empresaId);
        
        // Obtener usuarios relacionados con esta empresa a través de la tabla pivot
        $usuarios = $empresa->usuarios()
            ->select(['id', 'nombre', 'apellidos', 'alias_usuario', 'email', 'dni', 'usuario_tipo', 'alta'])
            ->where('alta', 1) // Solo usuarios activos
            ->orderBy('nombre')
            ->orderBy('apellidos')
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
