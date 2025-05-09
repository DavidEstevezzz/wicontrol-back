<?php

namespace App\Http\Controllers;

use App\Models\EntradaDato;
use Illuminate\Http\Request;

class EntradaDatoController extends Controller
{
    /** Listado de todas las entradas */
    public function index()
    {
        $entradas = EntradaDato::all();
        return response()->json($entradas);
    }

    /** Mostrar una entrada por su ID */
    public function show($id)
    {
        $entrada = EntradaDato::findOrFail($id);
        return response()->json($entrada);
    }

    /** Crear una nueva entrada */
    public function store(Request $request)
    {
        $data = $request->validate([
            'id_sensor'       => 'required|integer',
            'valor'           => 'nullable|string|max:10',
            'fecha'           => 'required|date',
            'id_dispositivo'  => 'required|integer|exists:tb_dispositivo,id_dispositivo',
            'alta'            => 'required|integer',
        ]);

        $entrada = EntradaDato::create($data);
        return response()->json($entrada, 201);
    }

    /** Actualizar una entrada existente */
    public function update(Request $request, $id)
    {
        $entrada = EntradaDato::findOrFail($id);
        $data = $request->validate([
            'id_sensor'       => 'sometimes|required|integer',
            'valor'           => 'nullable|string|max:10',
            'fecha'           => 'sometimes|required|date',
            'id_dispositivo'  => 'sometimes|required|integer|exists:tb_dispositivo,id_dispositivo',
            'alta'            => 'sometimes|required|integer',
        ]);

        $entrada->update($data);
        return response()->json($entrada);
    }

    /** Eliminar una entrada */
    public function destroy($id)
    {
        $entrada = EntradaDato::findOrFail($id);
        $entrada->delete();
        return response()->json(null, 204);
    }
}
