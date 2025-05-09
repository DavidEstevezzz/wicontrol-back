<?php

namespace App\Http\Controllers;

use App\Models\Granja;
use Illuminate\Http\Request;

class GranjaController extends Controller
{
    public function index()
    {
        return response()->json(Granja::all());
    }

    public function show($id)
    {
        $granja = Granja::findOrFail($id);
        return response()->json($granja);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'codigo'            => 'required|string|max:50|unique:tb_granja,codigo',
            'nombre'            => 'required|string|max:50',
            'direccion'         => 'required|string|max:50',
            'email'             => 'nullable|email|max:50',
            'telefono'          => 'nullable|string|max:50',
            'pais'              => 'required|string|max:50',
            'provincia'         => 'required|string|max:50',
            'localidad'         => 'required|string|max:50',
            'codigo_postal'     => 'required|integer',
            'empresa_id'        => 'required|integer|exists:tb_empresa,id',
            'fecha_hora_alta'   => 'required|date',
            'alta'              => 'required|boolean',
            'fecha_hora_baja'   => 'nullable|date',
            'lat'               => 'nullable|string|max:10',
            'lon'               => 'nullable|string|max:10',
            'usuario_contacto'  => 'required|integer|exists:users,id',
            'ganadero'          => 'required|integer|exists:users,id',
            'clonado_de'        => 'nullable|integer|exists:tb_granja,id',
            'numero_rega'       => 'required|string|max:20',
            'numero_naves'      => 'required|integer',
            'disp_naves'        => 'nullable|string|max:20',
            'foto'              => 'nullable|string|max:50',
        ]);

        $granja = Granja::create($data);
        return response()->json($granja, 201);
    }

    public function update(Request $request, $id)
    {
        $granja = Granja::findOrFail($id);

        $data = $request->validate([
            'codigo'            => 'required|string|max:50|unique:tb_granja,codigo,' . $id,
            'nombre'            => 'required|string|max:50',
            'direccion'         => 'required|string|max:50',
            'email'             => 'nullable|email|max:50',
            'telefono'          => 'nullable|string|max:50',
            'pais'              => 'required|string|max:50',
            'provincia'         => 'required|string|max:50',
            'localidad'         => 'required|string|max:50',
            'codigo_postal'     => 'required|integer',
            'empresa_id'        => 'required|integer|exists:tb_empresa,id',
            'fecha_hora_alta'   => 'required|date',
            'alta'              => 'required|boolean',
            'fecha_hora_baja'   => 'nullable|date',
            'lat'               => 'nullable|string|max:10',
            'lon'               => 'nullable|string|max:10',
            'usuario_contacto'  => 'required|integer|exists:users,id',
            'ganadero'          => 'required|integer|exists:users,id',
            'clonado_de'        => 'nullable|integer|exists:tb_granja,id',
            'numero_rega'       => 'required|string|max:20',
            'numero_naves'      => 'required|integer',
            'disp_naves'        => 'nullable|string|max:20',
            'foto'              => 'nullable|string|max:50',
        ]);

        $granja->update($data);
        return response()->json($granja);
    }

    public function destroy($id)
    {
        Granja::destroy($id);
        return response()->json(null, 204);
    }
}
