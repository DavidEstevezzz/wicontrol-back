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

    /**
     * Devuelve el dashboard de una granja, con datos de peso, temperatura y humedad.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  string  $numeroRega
     * @return \Illuminate\Http\JsonResponse
     */
    public function dashboard(Request $request, $numeroRega)
    {
        // 0) Validar entrada
        $data = $request->validate([
            'startDate' => 'required|date',
            'endDate'   => 'required|date',
            'cv'        => 'nullable|numeric',
        ]);

        $start = $data['startDate'];
        $end   = $data['endDate'];
        $cv    = $data['cv'] ?? null;

        // 1) Cargar la granja con sus dispositivos y sus lecturas en el rango
        $granja = Granja::with(['dispositivos.entradasDatos' => function($q) use ($start, $end) {
            $q->whereBetween('fecha', [$start, $end]);
        }])->findOrFail($numeroRega);

        $deviceIds = $granja->dispositivos->pluck('id_dispositivo')->all();

        // 2) Camada activa en naves 'A%'
        $camada = $granja->camadas()
            ->where('alta', 1)
            ->where('id_naves', 'like', 'A%')
            ->latest('fecha_hora_inicio')
            ->first();

        // 3) Pesadas y promedio de hoy (sensor = 2)
        $pesadasHoy = DB::table('tb_entrada_dato')
            ->whereIn('id_dispositivo', $deviceIds)
            ->where('id_sensor', 2)
            ->whereBetween('fecha', [ now()->subDay(), now() ])
            ->count();

        $mediaHoy = DB::table('tb_entrada_dato')
            ->whereIn('id_dispositivo', $deviceIds)
            ->where('id_sensor', 2)
            ->whereBetween('fecha', [ now()->subDay(), now() ])
            ->avg('valor');

        // 4) Serie de media diaria últimos 7 días
        $serie7dias = DB::table('tb_entrada_dato')
            ->selectRaw('UNIX_TIMESTAMP(fecha)*1000 as t, AVG(valor) as avg')
            ->whereIn('id_dispositivo', $deviceIds)
            ->where('id_sensor', 2)
            ->whereBetween('fecha', [ now()->subDays(7), now() ])
            ->groupBy(DB::raw('DATE(fecha)'))
            ->orderBy('t')
            ->get()
            ->map(fn($r) => [ (int)$r->t, round($r->avg, 2) ]);

        // 5) Coeficiente de variación día (sensor = 2)
        $coefVariacion = DB::table('tb_entrada_dato')
            ->selectRaw('(STDDEV_SAMP(valor)/AVG(valor))*100 as cv')
            ->whereIn('id_dispositivo', $deviceIds)
            ->where('id_sensor', 2)
            ->whereBetween('fecha', [ now()->subDay(), now() ])
            ->value('cv');

        // 6) Histograma 6h (sensor = 2)
        $histograma6h = DB::table('tb_entrada_dato')
            ->selectRaw('FLOOR(UNIX_TIMESTAMP(fecha)/21600)*21600*1000 as t, COUNT(*) as count')
            ->whereIn('id_dispositivo', $deviceIds)
            ->where('id_sensor', 2)
            ->whereBetween('fecha', [$start, $end])
            ->groupBy('t')
            ->orderBy('t')
            ->get()
            ->map(fn($r) => [ (int)$r->t, (int)$r->count ]);

        // Helpers para series y rangos
        $makeSeriesAndRanges = function(int $sensorId) use ($deviceIds, $start, $end) {
            $rows = DB::table('tb_entrada_dato')
                ->selectRaw('UNIX_TIMESTAMP(fecha)*1000 as t, AVG(valor) as avg, MIN(valor) as min, MAX(valor) as max')
                ->whereIn('id_dispositivo', $deviceIds)
                ->where('id_sensor', $sensorId)
                ->whereBetween('fecha', [$start, $end])
                ->groupBy(DB::raw('DATE(fecha)'))
                ->orderBy('t')
                ->get();

            return [
                'series' => $rows->map(fn($r) => [ (int)$r->t, round($r->avg, 2) ]),
                'ranges' => $rows->map(fn($r) => [ (int)$r->t, round($r->min, 2), round($r->max, 2) ]),
            ];
        };

        // 7) Temperatura ambiente (sensor = 6)
        $tempAmbData = $makeSeriesAndRanges(6);

        // 8) Humedad ambiente (sensor = 5)
        $humAmbData = $makeSeriesAndRanges(5);

        // 9) Temperatura suelo/camada (sensor = 12)
        $tempSueloData = $makeSeriesAndRanges(12);

        // 10) Humedad suelo/camada (sensor = 13)
        $humSueloData = $makeSeriesAndRanges(13);

        // Responder en JSON
        return response()->json([
            'camada'            => $camada,
            'pesadasHoy'        => $pesadasHoy,
            'mediaHoy'          => round($mediaHoy, 2),
            'serie7dias'        => $serie7dias,
            'coefVariacion'     => round($coefVariacion, 2),
            'histograma6h'      => $histograma6h,
            'tempAmbSeries'     => $tempAmbData['series'],
            'tempAmbRanges'     => $tempAmbData['ranges'],
            'humAmbSeries'      => $humAmbData['series'],
            'humAmbRanges'      => $humAmbData['ranges'],
            'tempSueloSeries'   => $tempSueloData['series'],
            'tempSueloRanges'   => $tempSueloData['ranges'],
            'humSueloSeries'    => $humSueloData['series'],
            'humSueloRanges'    => $humSueloData['ranges'],
        ]);
    }
}
