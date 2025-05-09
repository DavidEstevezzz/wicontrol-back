<?php

namespace App\Http\Controllers;

use App\Models\Granja;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class GranjaController extends Controller
{
    public function index(Request $request)
{
    $query = Granja::query();

    if ($request->has('empresa_id')) {
        $query->where('empresa_id', $request->empresa_id);
    }

    return response()->json($query->paginate(15));
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


    /**
     * Retorna la media de valores del sensor 2 para cada dispositivo
     * de una granja dada y rango de fechas.
     */
    public function getPesoPorGranja(Request $request)
    {
        // 1) Validamos la entrada
        $v = Validator::make($request->all(), [
            'numeroREGA' => 'required|string',
            'startDate'  => 'required|date',
            'endDate'    => 'required|date|after_or_equal:startDate',
        ]);

        if ($v->fails()) {
            return response()->json([
                'errors' => $v->errors()
            ], 422);
        }

        $numeroREGA = $request->input('numeroREGA');
        $startDate  = $request->input('startDate');
        $endDate    = $request->input('endDate');

        // 2) Construimos la consulta con el Query Builder
        $result = DB::table('tb_dispositivo as d')
            ->join('tb_instalacion as i', 'i.id_instalacion', '=', 'd.id_instalacion')
            ->leftJoin('tb_entrada_dato as ed', function($join) use ($startDate, $endDate) {
                $join->on('ed.id_dispositivo', '=', 'd.numero_serie')
                     ->where('ed.id_sensor', 2)
                     ->where('ed.fecha', '>=', $startDate)
                     ->where('ed.fecha', '<',  $endDate)
                     ->where('ed.valor', '>', 45);
            })
            ->select([
                'd.numero_serie as id_dispositivo',
                DB::raw("COALESCE(ROUND(AVG(ed.valor), 2), 0) as media")
            ])
            ->where('i.numero_rega', $numeroREGA)
            ->groupBy('d.numero_serie')
            ->orderBy('d.numero_serie')
            ->get();

        // 3) Devolvemos JSON
        return response()->json($result);
    }
}
