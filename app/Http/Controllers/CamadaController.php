<?php
// app/Http/Controllers/CamadaController.php

namespace App\Http\Controllers;

use App\Models\Camada;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class CamadaController extends Controller
{
    /**
     * Listado de todas las camadas.
     */
    public function index()
    {
        $camadas = Camada::all();
        return response()->json($camadas, Response::HTTP_OK);
    }

    /**
     * Crear una nueva camada.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre_camada'     => 'required|string|max:50',
            'sexaje'            => 'required|string|max:11',
            'tipo_ave'          => 'required|string|max:50',
            'tipo_estirpe'      => 'required|string|max:11',
            'fecha_hora_inicio' => 'nullable|date',
            'fecha_hora_final'  => 'nullable|date',
            'alta'              => 'required|integer',
            'alta_user'         => 'nullable|string|max:20',
            'cierre_user'       => 'nullable|string|max:20',
            'codigo_granja'     => 'nullable|string|max:20',
            'id_naves'          => 'required|string|max:20',
        ]);

        $camada = Camada::create($data);
        return response()->json($camada, Response::HTTP_CREATED);
    }

    /**
     * Mostrar una camada concreta.
     */
    public function show(Camada $camada)
    {
        return response()->json($camada, Response::HTTP_OK);
    }

    /**
     * Actualizar una camada.
     */
    public function update(Request $request, Camada $camada)
    {
        $data = $request->validate([
            'nombre_camada'     => 'sometimes|required|string|max:50',
            'sexaje'            => 'sometimes|required|string|max:11',
            'tipo_ave'          => 'sometimes|required|string|max:50',
            'tipo_estirpe'      => 'sometimes|required|string|max:11',
            'fecha_hora_inicio' => 'nullable|date',
            'fecha_hora_final'  => 'nullable|date',
            'alta'              => 'sometimes|required|integer',
            'alta_user'         => 'nullable|string|max:20',
            'cierre_user'       => 'nullable|string|max:20',
            'codigo_granja'     => 'nullable|string|max:20',
            'id_naves'          => 'sometimes|required|string|max:20',
        ]);

        $camada->update($data);
        return response()->json($camada, Response::HTTP_OK);
    }

    /**
     * Eliminar una camada.
     */
    public function destroy(Camada $camada)
    {
        $camada->delete();
        return response()->json(null, Response::HTTP_NO_CONTENT);
    }
}
