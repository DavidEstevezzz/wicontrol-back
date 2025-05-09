<?php

namespace App\Http\Controllers;

use App\Models\Instalacion;
use Illuminate\Http\Request;

class InstalacionController extends Controller
{
    public function index()
    {
        return response()->json(Instalacion::all());
    }

    public function show($id)
    {
        $instalacion = Instalacion::findOrFail($id);
        return response()->json($instalacion);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'id_usuario'       => 'required|integer',
            'numero_rega'      => 'required|string|max:50',
            'fecha_hora_alta'  => 'required|date',
            'alta'             => 'required|integer',
            'id_nave'          => 'required|string|max:20',
        ]);

        $instalacion = Instalacion::create($validated);
        return response()->json($instalacion, 201);
    }

    public function update(Request $request, $id)
    {
        $instalacion = Instalacion::findOrFail($id);

        $validated = $request->validate([
            'id_usuario'       => 'integer',
            'numero_rega'      => 'string|max:50',
            'fecha_hora_alta'  => 'date',
            'alta'             => 'integer',
            'id_nave'          => 'string|max:20',
        ]);

        $instalacion->update($validated);
        return response()->json($instalacion);
    }

    public function destroy($id)
    {
        $instalacion = Instalacion::findOrFail($id);
        $instalacion->delete();
        return response()->json(null, 204);
    }
}
