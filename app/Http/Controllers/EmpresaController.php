<?php

namespace App\Http\Controllers;

use App\Models\Empresa;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

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

    
}
