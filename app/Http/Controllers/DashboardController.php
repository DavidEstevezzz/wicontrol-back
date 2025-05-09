<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Dispositivo;
use App\Models\Granja;
use App\Models\Camada;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class DashboardController extends Controller
{
    /**
     * Devuelve las métricas para el dashboard.
     */
    public function stats(Request $request)
    {
        // Dispositivos “alta = 1” (disponibles)
        $devicesAvailable = Dispositivo::where('alta', 1)->count();

        // Opcional: dispositivos online (últimos 30 minutos)
        $threshold = Carbon::now()->subMinutes(30);
        $devicesOnline = Dispositivo::where('alta', 1)
            ->where('fecha_hora_last_msg', '>=', $threshold)
            ->count();

        // Granjas “alta = 1”
        $granjas = Granja::where('alta', 1)->count();

        // Camadas “alta = 1”
        $camadas = Camada::where('alta', 1)->count();

        return response()->json([
            'devicesAvailable' => $devicesAvailable,
            'devicesOnline'    => $devicesOnline,
            'granjas'          => $granjas,
            'camadas'          => $camadas,
        ]);
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
