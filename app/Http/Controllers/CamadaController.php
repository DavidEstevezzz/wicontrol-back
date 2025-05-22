<?php
// app/Http/Controllers/CamadaController.php

namespace App\Http\Controllers;

use App\Models\Camada;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use App\Models\Dispositivo;
use Illuminate\Http\JsonResponse;
use App\Models\EntradaDato;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Carbon\CarbonPeriod;
use App\Models\TemperaturaBroilers;


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

    /**
     * Vincula un dispositivo a una camada (tabla pivote tb_relacion_camada_dispositivo).
     *
     * @param  int  $camadaId
     * @param  int  $dispId
     * @return JsonResponse
     */
    public function attachDispositivo(int $camadaId, int $dispId): JsonResponse
    {
        // Buscar la camada y el dispositivo, o fallar con 404
        $camada = Camada::findOrFail($camadaId);
        $dispositivo = Dispositivo::findOrFail($dispId);

        // Vincular si no existe ya
        if (! $camada->dispositivos()->where('id_dispositivo', $dispId)->exists()) {
            $camada->dispositivos()->attach($dispId);
            return response()->json([
                'message' => "Dispositivo {$dispId} vinculado a camada {$camadaId}."
            ], 201);
        }

        return response()->json([
            'message' => 'El dispositivo ya está vinculado a esta camada.'
        ], 200);
    }

    /**
     * Desvincula un dispositivo de una camada.
     *
     * @param  int  $camadaId
     * @param  int  $dispId
     * @return JsonResponse
     */
    public function detachDispositivo(int $camadaId, int $dispId): JsonResponse
    {
        $camada = Camada::findOrFail($camadaId);
        $dispositivo = Dispositivo::findOrFail($dispId);

        // Desvincular si existe
        if ($camada->dispositivos()->where('id_dispositivo', $dispId)->exists()) {
            $camada->dispositivos()->detach($dispId);
            return response()->json([
                'message' => "Dispositivo {$dispId} desvinculado de camada {$camadaId}."
            ], 200);
        }

        return response()->json([
            'message' => 'El dispositivo no está vinculado a esta camada.'
        ], 404);
    }

    /**
     * Devuelve un array de números de serie de los dispositivos vinculados.
     */
    private function getSerialesDispositivos(Camada $camada): array
    {
        return $camada
            ->dispositivos()
            ->pluck('numero_serie')
            ->toArray();
    }

    /**
     * Recupera todas las lecturas de peso (sensor=2) para esos seriales en la fecha dada.
     */
    private function fetchPesos(array $seriales, string $fecha): Collection
    {
        return EntradaDato::whereIn('id_dispositivo', $seriales)
            ->whereDate('fecha', $fecha)
            ->where('id_sensor', 2)
            ->get(['id_dispositivo', 'valor', 'fecha']);
    }

    /**
     * Obtiene el peso de referencia desde la tabla tb_peso_{estirpe},
     * leyendo la columna adecuada según el sexaje.
     */
    private function getPesoReferencia(Camada $camada, int $edadDias): float
    {
        $tabla = 'tb_peso_' . strtolower($camada->tipo_estirpe);
        $sexaje = strtolower($camada->sexaje);

        // Alternativa 1: if-else
        if ($sexaje === 'macho') {
            $col = 'Machos';
        } elseif ($sexaje === 'hembra') {
            $col = 'Hembras';
        } else {
            $col = 'Mixto';
        }

        return (float) DB::table($tabla)
            ->where('edad', $edadDias)
            ->value($col);
    }

    /**
     * Filtra la colección de lecturas descartando aquellas
     * que difieran más de un 20% del peso de referencia.
     */
    private function filterByDesviacion(Collection $lecturas, float $pesoRef, float $umbral = 0.20): Collection
    {
        return $lecturas->filter(function ($e) use ($pesoRef, $umbral) {
            return abs($e->valor - $pesoRef) / $pesoRef <= $umbral;
        });
    }

    /**
     * Aplica el coeficiente de homogeneidad opcional.
     * Devuelve un array con:
     *   - 'aceptadas' Collection de valores válidos
     *   - 'rechazadas' Collection de valores fuera de coeficiente
     *   - 'media'      float de la media acumulada de aceptadas
     */
    private function filterByHomogeneidad(Collection $lecturas, ?float $coef): array
    {
        $aceptadas   = collect();
        $rechazadas  = collect();
        $acumPeso    = 0.0;
        $cuenta      = 0;

        foreach ($lecturas as $item) {
            $v = $item->valor;

            if (is_null($coef)) {
                $aceptadas->push($v);
                $acumPeso += $v;
                $cuenta++;
                continue;
            }

            $media = $cuenta ? $acumPeso / $cuenta : $v;
            $diff  = abs($v - $media) / $media;

            if ($diff <= $coef) {
                $aceptadas->push($v);
                $acumPeso += $v;
                $cuenta++;
            } else {
                $rechazadas->push($v);
            }
        }

        return [
            'aceptadas'  => $aceptadas,
            'rechazadas' => $rechazadas,
            'media'      => $cuenta ? round($acumPeso / $cuenta, 2) : 0,
        ];
    }

    /**
     * Calcula el número de animales pesados en una fecha concreta,
     * aplicando filtros de desviación respecto al peso ideal y
     * (opcionalmente) un coeficiente de homogeneidad.
     *
     * @param  int         $camadaId            ID de la camada
     * @param  string      $fecha               Fecha a consultar (YYYY-MM-DD)
     * @param  float|null  $coefHomogeneidad    Porcentaje (p.ej. 0.10 para 10%), opcional
     * @return JsonResponse
     */
    /**
     * Calcula el resumen de pesadas y devuelve el listado con su estado
     * (aceptada, descartada o rechazada) para una camada en un día dado.
     *
     * @param  int         $camadaId
     * @param  string      $fecha              // YYYY-MM-DD
     * @param  float|null  $coefHomogeneidad   // 0.10 para 10%, opcional
     * @return JsonResponse
     */
    public function calcularPesadasPorDia(Request $request, $camada): JsonResponse
    {
        // 1. Parámetros
        $fecha             = $request->query('fecha');
        $coefHomogeneidad  = $request->has('coefHomogeneidad')
            ? (float) $request->query('coefHomogeneidad')
            : null;

        // 2. Cargar camada y refs
        $camada   = Camada::findOrFail($camada);
        $edadDias = (int)Carbon::parse($camada->fecha_hora_inicio)->diffInDays($fecha);

        $seriales = $this->getSerialesDispositivos($camada);

        // 2.a Obtener peso de referencia y loggear
        $pesoRef = $this->getPesoReferencia($camada, $edadDias);
        Log::info("Peso referencia Ross para camada {$camada->id_camada}: {$pesoRef} kg (edad {$edadDias} días, sexaje {$camada->sexaje})");

        // 3. Traer TODAS lecturas de peso del día
        $lecturas = $this->fetchPesos($seriales, $fecha)
            ->sortBy('fecha');

        // 4. Pre-filtrado ±20% del peso ideal y log de cada comparación
        $consideradas = $lecturas->filter(function ($e) use ($pesoRef) {
            $v    = (float) $e->valor;
            $diff = abs($v - $pesoRef) / $pesoRef;
            $ok   = $diff <= 0.20;
            Log::info("Lectura {$e->fecha} valor={$v} kg → diffPesoIdeal=" . round($diff, 3)
                . " → " . ($ok ? 'PASA ±20%' : 'DESCARTADA'));
            return $ok;
        });

        // 5. Calcular media GLOBAL de las consideradas y log
        $valores     = $consideradas->pluck('valor')->map(fn($v) => (float)$v);
        $mediaGlobal = $valores->count()
            ? round($valores->avg(), 2)
            : 0;
        Log::info("Media GLOBAL de no descartadas: {$mediaGlobal} kg");

        // 5.b Calcular tramo de aceptación
        $tramoMin = $tramoMax = null;
        if (! is_null($coefHomogeneidad) && $mediaGlobal > 0) {
            $tramoMin = round($mediaGlobal * (1 - $coefHomogeneidad), 2);
            $tramoMax = round($mediaGlobal * (1 + $coefHomogeneidad), 2);
            Log::info("Tramo homog. aceptado: {$tramoMin} kg – {$tramoMax} kg (coef={$coefHomogeneidad})");
        }

        // 6. Clasificar cada lectura y log del resultado
        $listado = $lecturas->map(function ($e) use ($pesoRef, $mediaGlobal, $coefHomogeneidad) {
            $v     = (float) $e->valor;
            $fecha = $e->fecha;

            // 6.1 Si sale de ±20%, es descartada
            if (abs($v - $pesoRef) / $pesoRef > 0.20) {
                $estado = 'descartado';
            } else {
                // 6.2 Si no hay coeficiente, todo lo que pasa el ±20% es aceptado
                if (is_null($coefHomogeneidad)) {
                    $estado = 'aceptada';
                } else {
                    $diffGlobal = $mediaGlobal > 0
                        ? abs($v - $mediaGlobal) / $mediaGlobal
                        : 0;
                    $estado = ($diffGlobal <= $coefHomogeneidad)
                        ? 'aceptada'
                        : 'rechazada';

                    Log::info("Lectura {$fecha} valor={$v} kg → diffGlobal=" . round($diffGlobal, 3)
                        . " → {$estado}");
                }
            }

            return [
                'id_dispositivo' => $e->id_dispositivo,
                'valor'          => $v,
                'fecha'          => $fecha,
                'estado'         => $estado,
            ];
        });

        // 7. Resumen final (sin logs adicionales)
        $totalConsideradas  = $consideradas->count();
        $aceptadasCount     = $listado->where('estado', 'aceptada')->count();
        $rechazadasCount    = $listado->where('estado', 'rechazada')->count();
        $pesoMedioAceptadas = $aceptadasCount
            ? round(
                $listado
                    ->where('estado', 'aceptada')
                    ->pluck('valor')
                    ->avg(),
                2
            )
            : 0;

        // 8. Devolver JSON
        return response()->json([
            'total_pesadas'            => $totalConsideradas,
            'aceptadas'                => $aceptadasCount,
            'rechazadas_homogeneidad'  => $rechazadasCount,
            'peso_medio_global'        => $mediaGlobal,
            'peso_medio_aceptadas'     => $pesoMedioAceptadas,
            'tramo_aceptado'           => ['min' => $tramoMin, 'max' => $tramoMax],
            'listado_pesos'            => $listado->values(),
        ], Response::HTTP_OK);
    }

    /**
     * Calcula el peso medio de un dispositivo en un rango de días
     *
     * @param  Request  $request
     * @param  int      $dispId     ID del dispositivo
     * @return JsonResponse
     */
    public function calcularPesoMedioPorRango(Request $request, int $dispId): JsonResponse
    {
        // 1. Validar fechas
        $request->validate([
            'fecha_inicio'      => 'required|date|before_or_equal:fecha_fin',
            'fecha_fin'         => 'required|date',
            'coefHomogeneidad'  => 'nullable|numeric|min:0|max:1',
        ]);

        $fechaInicio = $request->query('fecha_inicio');
        $fechaFin = $request->query('fecha_fin');
        $coef = $request->has('coefHomogeneidad')
            ? (float)$request->query('coefHomogeneidad')
            : null;

        Log::info("calcularPesoMedioPorRango start — dispositivo={$dispId}, fecha_inicio={$fechaInicio}, fecha_fin={$fechaFin}, coef={$coef}");

        // 2. Cargar el dispositivo para obtener su número de serie
        $dispositivo = Dispositivo::findOrFail($dispId);
        $serie = $dispositivo->numero_serie;
        Log::info("Número de serie del dispositivo: {$serie}");

        // 3. Preparar iteración diaria
        $inicio = Carbon::parse($fechaInicio);
        $fin = Carbon::parse($fechaFin);
        $period = CarbonPeriod::create($inicio, $fin);

        $pesosTotales = collect();
        $resumenPorDia = [];

        foreach ($period as $dia) {
            $fecha = $dia->format('Y-m-d');
            Log::info("Procesando día: {$fecha}");

            // 4. Obtener camada asociada activa para este dispositivo en la fecha dada
            // Aquí está el problema - vamos a usar JOINs explícitos para evitar ambigüedad
            $camada = Camada::join('tb_relacion_camada_dispositivo', 'tb_camada.id_camada', '=', 'tb_relacion_camada_dispositivo.id_camada')
                ->where('tb_relacion_camada_dispositivo.id_dispositivo', $dispId)
                ->where('tb_camada.alta', 1)
                ->where('tb_camada.fecha_hora_inicio', '<=', $fecha)
                ->where(function ($query) use ($fecha) {
                    $query->whereNull('tb_camada.fecha_hora_final')
                        ->orWhere('tb_camada.fecha_hora_final', '>=', $fecha);
                })
                ->select('tb_camada.*')
                ->first();

            if (!$camada) {
                Log::info("No hay camada activa para el dispositivo en la fecha {$fecha}");
                continue;
            }

            // 5. Edad de la camada ese día
            $edadDias = (int)Carbon::parse($camada->fecha_hora_inicio)->diffInDays($dia);

            // 6. Peso ideal de referencia
            $pesoRef = $this->getPesoReferencia($camada, $edadDias);

            // 7. Lecturas del dispositivo ese día (usar número de serie)
            // Importante: Asegurarse de que no hay ambigüedad en esta consulta
            $lecturas = EntradaDato::where('id_dispositivo', $serie)
                ->whereDate('fecha', $fecha)
                ->where('id_sensor', 2)
                ->get()
                ->map(fn($e) => (float)$e->valor);

            // 8. Filtrar por ±20% del peso ideal
            $consideradas = $lecturas
                ->filter(fn($v) => $pesoRef > 0 && abs($v - $pesoRef) / $pesoRef <= 0.20)
                ->values();

            // 9. Media global de no descartadas
            $mediaGlobal = $consideradas->count()
                ? round($consideradas->avg(), 2)
                : 0.0;

            // 10. Aceptadas tras coeficiente
            $aceptadas = $consideradas
                ->filter(fn($v) => is_null($coef) || ($mediaGlobal > 0
                    && abs($v - $mediaGlobal) / $mediaGlobal <= $coef))
                ->values();

            // 11. Peso medio aceptadas
            $pesoMedio = $aceptadas->count()
                ? round($aceptadas->avg(), 2)
                : 0.0;

            if ($aceptadas->count() > 0) {
                // Añadir al resumen diario
                $resumenPorDia[] = [
                    'fecha' => $fecha,
                    'peso_medio' => $pesoMedio,
                    'lecturas_aceptadas' => $aceptadas->count(),
                    'lecturas_totales' => $lecturas->count(),
                ];

                // Añadir a la colección para el cálculo global
                $pesosTotales = $pesosTotales->merge($aceptadas);
            }
        }

        // Cálculo del peso medio global para todo el periodo
        $pesoMedioGlobal = $pesosTotales->count()
            ? round($pesosTotales->avg(), 2)
            : 0.0;

        Log::info("calcularPesoMedioPorRango end — Peso medio global: {$pesoMedioGlobal}, días con datos: " . count($resumenPorDia));

        return response()->json([
            'dispositivo' => [
                'id' => $dispId,
                'numero_serie' => $serie
            ],
            'fecha_inicio' => $fechaInicio,
            'fecha_fin' => $fechaFin,
            'peso_medio_global' => $pesoMedioGlobal,
            'total_lecturas_procesadas' => $pesosTotales->count(),
            'dias_con_datos' => count($resumenPorDia),
            'resumen_diario' => $resumenPorDia,
        ], Response::HTTP_OK);
    }

    public function pesadasRango(Request $request, int $camadaId, int $dispId): JsonResponse
    {
        // 0. Asegúrate de importar al principio del fichero:
        // use Illuminate\Support\Facades\Log;

        // 1. Validar fechas
        $request->validate([
            'fecha_inicio'      => 'required|date|before_or_equal:fecha_fin',
            'fecha_fin'         => 'required|date',
            'coefHomogeneidad'  => 'nullable|numeric|min:0|max:1',
        ]);
        $fi   = $request->query('fecha_inicio');
        $ff   = $request->query('fecha_fin');
        $coef = $request->has('coefHomogeneidad')
            ? (float)$request->query('coefHomogeneidad')
            : null;

        Log::info("pesadasRango start — camada={$camadaId}, dispositivo={$dispId}, fi={$fi}, ff={$ff}, coef={$coef}");

        // 2. Cargar camada y validar dispositivo asociado
        $camada = Camada::findOrFail($camadaId);
        $belongs = $camada->dispositivos()
            ->wherePivot('id_dispositivo', $dispId)
            ->exists();
        Log::info("Dispositivo pertenece a la camada? " . ($belongs ? 'sí' : 'no'));
        if (! $belongs) {
            Log::warning("Error: dispositivo {$dispId} no está en camada {$camadaId}");
            return response()->json([
                'message' => "El dispositivo {$dispId} no pertenece a la camada {$camadaId}."
            ], Response::HTTP_BAD_REQUEST);
        }

        // ← CAMBIO: cargar el dispositivo para obtener su número de serie
        $dispositivo = Dispositivo::findOrFail($dispId);
        $serie = $dispositivo->numero_serie;
        Log::info("Número de serie del dispositivo: {$serie}");

        // 3. Preparar iteración diaria
        $inicio = Carbon::parse($fi);
        $fin    = Carbon::parse($ff);
        $period = CarbonPeriod::create($inicio, $fin);

        $result = [];
        foreach ($period as $dia) {
            $d = $dia->format('Y-m-d');
            Log::info("Procesando día: {$d}");

            // 4. Edad de la camada ese día
            $edadDias = (int)Carbon::parse($camada->fecha_hora_inicio)->diffInDays($dia);

            Log::info("  Edad de camada en {$d}: {$edadDias} días");

            // 5. Peso ideal de referencia
            $pesoRef = $this->getPesoReferencia($camada, $edadDias);
            Log::info("  Peso referencia: {$pesoRef}");

            // 6. Lecturas del dispositivo ese día (usar número de serie)
            $lecturas = EntradaDato::where('id_dispositivo', $serie)         // ← CAMBIO
                ->whereDate('fecha', $d)
                ->where('id_sensor', 2)
                ->get()
                ->map(fn($e) => (float)$e->valor);
            Log::info("  Lecturas totales encontradas: " . $lecturas->count());

            // 7. Filtrar por ±20% del peso ideal
            $consideradas = $lecturas
                ->filter(fn($v) => $pesoRef > 0 && abs($v - $pesoRef) / $pesoRef <= 0.20)
                ->values();
            Log::info("  Después de ±20% ideal, quedan: " . $consideradas->count());

            // 8. Media global de no descartadas
            $mediaGlobal = $consideradas->count()
                ? round($consideradas->avg(), 2)
                : 0.0;
            Log::info("  Media GLOBAL: {$mediaGlobal}");

            // 9. Aceptadas tras coeficiente
            $aceptadas = $consideradas
                ->filter(fn($v) => is_null($coef) || ($mediaGlobal > 0
                    && abs($v - $mediaGlobal) / $mediaGlobal <= $coef))
                ->values();
            Log::info("  Aceptadas tras coeficiente: " . $aceptadas->count());

            // 10. Peso medio aceptadas
            $pesoMedio = $aceptadas->count()
                ? round($aceptadas->avg(), 2)
                : 0.0;
            Log::info("  Peso medio aceptadas: {$pesoMedio}");

            // 11. Coeficiente de variación (CV = std/mean *100)
            if ($aceptadas->count() > 1 && $pesoMedio > 0) {
                $std = sqrt(
                    $aceptadas
                        ->map(fn($v) => pow($v - $pesoMedio, 2))
                        ->sum() / $aceptadas->count()
                );
                $cv = round(($std / $pesoMedio) * 100, 2);
            } else {
                $cv = 0.0;
            }
            Log::info("  Coef. variación diario (%): {$cv}");

            // 12. Reconstruir lecturas con fecha/hora originales (solo aceptadas)
            $pesadas = EntradaDato::where('id_dispositivo', $serie)          // ← CAMBIO
                ->whereDate('fecha', $d)
                ->where('id_sensor', 2)
                ->get(['valor', 'fecha'])
                ->filter(function ($e) use ($pesoRef, $mediaGlobal, $coef) {
                    $v = (float)$e->valor;
                    return $pesoRef > 0
                        && abs($v - $pesoRef) / $pesoRef <= 0.20
                        && (is_null($coef)
                            || ($mediaGlobal > 0
                                && abs($v - $mediaGlobal) / $mediaGlobal <= $coef));
                })
                ->map(function ($e) {
                    return [
                        'valor' => (float)$e->valor,
                        'fecha' => $e->fecha,
                        'hora'  => Carbon::parse($e->fecha)->format('H:i:s'),
                    ];
                })
                ->values();
            Log::info("  Pesadas finales (solo aceptadas): " . $pesadas->count());

            // 12.b) Contar aceptadas por hora (00–23)
            $conteoPorHora = collect(range(0, 23))
                ->mapWithKeys(fn($h) => [
                    str_pad($h, 2, '0', STR_PAD_LEFT) => 0
                ])
                ->merge(
                    $pesadas
                        ->groupBy(fn($e) => Carbon::parse($e['fecha'])->format('H'))
                        ->map(fn($col) => $col->count())
                )
                ->all();
            Log::info("  Conteo por hora: " . json_encode($conteoPorHora));

            // 13) Añadir al resultado
            $result[] = [
                'fecha'                 => $d,
                'peso_medio_aceptadas'  => $pesoMedio,
                'coef_variacion'        => $cv,
                'pesadas'               => $pesadas,
                'pesadas_horarias'      => $conteoPorHora,
            ];
        }

        Log::info("pesadasRango end — total días procesados: " . count($result));

        return response()->json($result, Response::HTTP_OK);
    }



    /**
     * Devuelve un listado de camadas de una granja concreta.
     *
     * @param  string  $numeroRega
     * @return JsonResponse
     */

    public function getByGranja(string $numeroRega): JsonResponse
    {
        $camadas = Camada::where('codigo_granja', $numeroRega)
            ->orderBy('fecha_hora_inicio', 'desc')
            ->get(['id_camada', 'nombre_camada']);

        return response()->json($camadas, Response::HTTP_OK);
    }

    public function getDispositivosByCamada(int $camadaId): JsonResponse
    {
        $camada = Camada::findOrFail($camadaId);

        // Seleccionamos sólo columnas de tb_dispositivo, prefijando la tabla
        $dispositivos = $camada
            ->dispositivos()
            ->select([
                'tb_dispositivo.id_dispositivo',
                'tb_dispositivo.numero_serie',
                'tb_dispositivo.ip_address'
            ])
            ->get();

        return response()->json($dispositivos, Response::HTTP_OK);
    }

    /**
     * Devuelve todos los dispositivos vinculados a camadas activas de una granja específica.
     *
     * @param  string  $codigoGranja
     * @return JsonResponse
     */
    public function getDispositivosByGranja(string $codigoGranja): JsonResponse
    {
        // Obtenemos las camadas activas de la granja
        $camadasActivas = Camada::where('codigo_granja', $codigoGranja)
            ->where('alta', 1)
            ->pluck('id_camada');

        if ($camadasActivas->isEmpty()) {
            return response()->json([
                'message' => 'No se encontraron camadas activas para esta granja.',
                'dispositivos' => []
            ], Response::HTTP_OK);
        }

        // Recuperamos los dispositivos vinculados a estas camadas
        // usando una subconsulta para evitar duplicados
        $dispositivos = Dispositivo::whereHas('camadas', function ($query) use ($camadasActivas) {
            $query->whereIn('tb_camada.id_camada', $camadasActivas);
        })
            ->select([
                'tb_dispositivo.id_dispositivo',
                'tb_dispositivo.numero_serie',
                'tb_dispositivo.ip_address'
                // Puedes agregar más campos si lo necesitas
            ])
            ->distinct() // Para evitar duplicados si un dispositivo está en varias camadas
            ->get();

        return response()->json([
            'total' => $dispositivos->count(),
            'dispositivos' => $dispositivos
        ], Response::HTTP_OK);
    }

    /**
     * Obtiene datos de temperatura para gráfica y tabla de alertas con márgenes variables
     * 
     * @param Request $request
     * @param int $dispId ID del dispositivo
     * @return JsonResponse
     */
    /**
     * Obtiene datos de temperatura para gráfica y tabla de alertas con márgenes variables
     * Incluye manejo de alertas activas
     * 
     * @param Request $request
     * @param int $dispId ID del dispositivo
     * @return JsonResponse
     */
    public function getTemperaturaGraficaAlertas(Request $request, int $dispId): JsonResponse
    {
        // 1. Validar parámetros
        $request->validate([
            'fecha_inicio' => 'required|date|before_or_equal:fecha_fin',
            'fecha_fin'    => 'required|date',
        ]);

        $fechaInicio = $request->query('fecha_inicio');
        $fechaFin = $request->query('fecha_fin');
        $usarMargenesPersonalizados = true;

        // 2. Cargar dispositivo y camada asociada
        $dispositivo = Dispositivo::findOrFail($dispId);
        $serie = $dispositivo->numero_serie;

        $camada = Camada::join('tb_relacion_camada_dispositivo', 'tb_camada.id_camada', '=', 'tb_relacion_camada_dispositivo.id_camada')
            ->where('tb_relacion_camada_dispositivo.id_dispositivo', $dispId)
            ->where(function ($query) use ($fechaInicio, $fechaFin) {
                $query->where(function ($q) use ($fechaInicio, $fechaFin) {
                    $q->where('tb_camada.fecha_hora_inicio', '<=', $fechaFin)
                        ->where(function ($q2) use ($fechaInicio) {
                            $q2->whereNull('tb_camada.fecha_hora_final')
                                ->orWhere('tb_camada.fecha_hora_final', '>=', $fechaInicio);
                        });
                });
            })
            ->select('tb_camada.*')
            ->first();

        if (!$camada) {
            return response()->json([
                'mensaje' => 'No se encontró una camada activa para este dispositivo en el rango de fechas especificado',
                'dispositivo' => [
                    'id' => $dispId,
                    'numero_serie' => $serie
                ]
            ], Response::HTTP_OK);
        }

        // 3. Función para determinar márgenes según edad
        $obtenerMargenes = function ($edadDias) use ($usarMargenesPersonalizados) {
            if (!$usarMargenesPersonalizados) {
                return [
                    'inferior' => 1.5,
                    'superior' => 1.5
                ];
            }

            if ($edadDias >= 0 && $edadDias <= 14) {
                return [
                    'inferior' => 5,  // -5%
                    'superior' => 10  // +10%
                ];
            } elseif ($edadDias <= 28) {
                return [
                    'inferior' => 10, // -10%
                    'superior' => 15  // +15%
                ];
            } else {
                return [
                    'inferior' => 15, // -15%
                    'superior' => 25  // +25%
                ];
            }
        };

        // 4. Cargar TODAS las referencias de temperatura de una sola vez
        $referenciasTemperatura = TemperaturaBroilers::orderBy('edad')->get();
        $cacheReferencias = [];

        // Función auxiliar para encontrar la referencia para una edad
        $obtenerReferenciaTemperatura = function ($edadDias) use ($referenciasTemperatura, &$cacheReferencias) {
            if (isset($cacheReferencias[$edadDias])) {
                return $cacheReferencias[$edadDias];
            }

            $referenciaExacta = $referenciasTemperatura->firstWhere('edad', $edadDias);
            if ($referenciaExacta) {
                $cacheReferencias[$edadDias] = $referenciaExacta->temperatura;
                return $referenciaExacta->temperatura;
            }

            $refCercana = null;
            $menorDiferencia = PHP_INT_MAX;

            foreach ($referenciasTemperatura as $ref) {
                $diferencia = abs($ref->edad - $edadDias);
                if ($diferencia < $menorDiferencia) {
                    $menorDiferencia = $diferencia;
                    $refCercana = $ref;
                }
            }

            $temperatura = $refCercana ? $refCercana->temperatura : null;
            $cacheReferencias[$edadDias] = $temperatura;
            return $temperatura;
        };

        // 5. Sensor de temperatura
        $SENSOR_TEMPERATURA = 6;

        // 6. Obtener todas las lecturas individuales ordenadas por fecha para procesar alertas activas
        $todasLasLecturas = EntradaDato::where('id_dispositivo', $serie)
            ->where('id_sensor', $SENSOR_TEMPERATURA)
            ->whereBetween('fecha', [$fechaInicio . ' 00:00:00', $fechaFin . ' 23:59:59'])  // ✅ Incluye todo el último día
            ->orderBy('fecha')
            ->get(['valor', 'fecha']);

        // 7. Obtener datos diarios para la gráfica
        $datosDiarios = EntradaDato::where('id_dispositivo', $serie)
            ->where('id_sensor', $SENSOR_TEMPERATURA)
            ->whereBetween('fecha', [$fechaInicio . ' 00:00:00', $fechaFin . ' 23:59:59'])  // ✅
            ->select(
                DB::raw('DATE(fecha) as dia'),
                DB::raw('ROUND(AVG(valor),2) as temperatura_media'),
                DB::raw('MIN(valor) as temperatura_min'),
                DB::raw('MAX(valor) as temperatura_max'),
                DB::raw('COUNT(*) as lecturas')
            )
            ->groupBy('dia')
            ->orderBy('dia')
            ->get();

        // 8. Preparar datos para la gráfica con referencias y rangos aceptables
        $datosGrafica = [];
        foreach ($datosDiarios as $dato) {
            $edadDias = Carbon::parse($camada->fecha_hora_inicio)
                ->diffInDays(Carbon::parse($dato->dia));

            $tempReferencia = $obtenerReferenciaTemperatura($edadDias);
            $margenes = $obtenerMargenes($edadDias);
            $margenInferior = $margenes['inferior'];
            $margenSuperior = $margenes['superior'];

            $limiteInferior = $tempReferencia ? round($tempReferencia * (1 - $margenInferior / 100), 2) : null;
            $limiteSuperior = $tempReferencia ? round($tempReferencia * (1 + $margenSuperior / 100), 2) : null;

            $datosGrafica[] = [
                'fecha' => $dato->dia,
                'temperatura_media' => $dato->temperatura_media,
                'temperatura_min' => $dato->temperatura_min,
                'temperatura_max' => $dato->temperatura_max,
                'temperatura_referencia' => $tempReferencia,
                'limite_inferior' => $limiteInferior,
                'limite_superior' => $limiteSuperior,
                'edad_dias' => $edadDias,
                'lecturas' => $dato->lecturas
            ];
        }

        // 9. Procesar alertas (todas y activas)
        // 9. Procesar alertas (todas y activas) - LÓGICA CORREGIDA
        $alertas = [];
        $alertasActivas = [];
        $alertaActualActiva = null; // Solo UNA alerta activa por dispositivo
        $totalFueraDeRango = 0;

        foreach ($todasLasLecturas as $lectura) {
            $fechaLectura = Carbon::parse($lectura->fecha);
            $edadDias = Carbon::parse($camada->fecha_hora_inicio)->diffInDays($fechaLectura);

            $tempReferencia = $obtenerReferenciaTemperatura($edadDias);

            if ($tempReferencia === null) {
                continue;
            }

            $margenes = $obtenerMargenes($edadDias);
            $limiteInferior = round($tempReferencia * (1 - $margenes['inferior'] / 100), 2);
            $limiteSuperior = round($tempReferencia * (1 + $margenes['superior'] / 100), 2);

            $valorLectura = (float) $lectura->valor;

            // Determinar si esta lectura genera una alerta
            $tipoAlertaActual = null;
            if ($valorLectura < $limiteInferior) {
                $tipoAlertaActual = 'baja';
            } elseif ($valorLectura > $limiteSuperior) {
                $tipoAlertaActual = 'alta';
            }

            // Si hay una alerta en esta lectura
            if ($tipoAlertaActual !== null) {
                $desviacion = round($valorLectura - $tempReferencia, 2);
                $desviacionPorcentaje = round(($desviacion / $tempReferencia) * 100, 2);

                $alerta = [
                    'fecha' => $fechaLectura->format('Y-m-d'),
                    'hora' => $fechaLectura->format('H:i:s'),
                    'temperatura_medida' => $valorLectura,
                    'temperatura_referencia' => $tempReferencia,
                    'limite_inferior' => $limiteInferior,
                    'limite_superior' => $limiteSuperior,
                    'desviacion' => $desviacion,
                    'desviacion_porcentaje' => $desviacionPorcentaje,
                    'tipo' => $tipoAlertaActual,
                    'edad_dias' => $edadDias,
                    'margen_edad' => [
                        'inferior' => "{$margenes['inferior']}%",
                        'superior' => "{$margenes['superior']}%"
                    ]
                ];

                // Agregar a todas las alertas
                $alertas[] = $alerta;
                $totalFueraDeRango++;

                // ✅ GESTIÓN DE ALERTAS ACTIVAS - SOLO UNA A LA VEZ
                if ($alertaActualActiva === null) {
                    // No hay alerta activa, crear una nueva
                    $alertaActualActiva = [
                        'inicio' => $alerta,
                        'fin' => null,
                        'tipo' => $tipoAlertaActual,
                        'duracion_minutos' => 0,
                        'lecturas_alerta' => 1,
                        'estado' => 'activa'
                    ];
                } elseif ($alertaActualActiva['tipo'] === $tipoAlertaActual) {
                    // ✅ MISMO TIPO: Solo actualizar duración y contador
                    $inicioAlerta = Carbon::parse($alertaActualActiva['inicio']['fecha'] . ' ' . $alertaActualActiva['inicio']['hora']);
                    $alertaActualActiva['duracion_minutos'] = $inicioAlerta->diffInMinutes($fechaLectura);
                    $alertaActualActiva['lecturas_alerta']++;
                } else {
                    // ✅ TIPO DIFERENTE: Cerrar la anterior y crear nueva (REEMPLAZAR)
                    $alertaActualActiva['fin'] = [
                        'fecha' => $fechaLectura->format('Y-m-d'),
                        'hora' => $fechaLectura->format('H:i:s'),
                        'motivo' => 'cambio_tipo',
                        'nuevo_tipo' => $tipoAlertaActual
                    ];
                    $alertaActualActiva['estado'] = 'resuelta';

                    // Agregar la alerta cerrada al historial
                    $alertasActivas[] = $alertaActualActiva;

                    // ✅ CREAR NUEVA ALERTA (REEMPLAZANDO LA ANTERIOR)
                    $alertaActualActiva = [
                        'inicio' => $alerta,
                        'fin' => null,
                        'tipo' => $tipoAlertaActual,
                        'duracion_minutos' => 0,
                        'lecturas_alerta' => 1,
                        'estado' => 'activa'
                    ];
                }
            } else {
                // ✅ NO HAY ALERTA: Si hay una alerta activa, cerrarla
                if ($alertaActualActiva !== null) {
                    $alertaActualActiva['fin'] = [
                        'fecha' => $fechaLectura->format('Y-m-d'),
                        'hora' => $fechaLectura->format('H:i:s'),
                        'motivo' => 'normalizada',
                        'temperatura_normalizacion' => $valorLectura
                    ];
                    $alertaActualActiva['estado'] = 'resuelta';

                    // Agregar al historial y limpiar
                    $alertasActivas[] = $alertaActualActiva;
                    $alertaActualActiva = null; // ✅ LIMPIAR - No hay alerta activa
                }
            }
        }

        // ✅ IMPORTANTE: Si al final hay una alerta activa, agregarla
        if ($alertaActualActiva !== null) {
            $alertaActualActiva['estado'] = 'activa';
            $alertasActivas[] = $alertaActualActiva;
        }

        // ✅ PREPARAR RESPUESTA FINAL - SOLO UNA ALERTA ACTIVA
        $alertasActivasActuales = collect($alertasActivas)->where('estado', 'activa');
        $alertasResueltasTotal = collect($alertasActivas)->where('estado', 'resuelta');

        // ✅ SOLO PUEDE HABER UNA ALERTA ACTIVA
        $alertaActivaActual = $alertasActivasActuales->first(); // Solo la primera (debería ser única)


        // 10. Calcular estadísticas
        $temperaturaMediaGlobal = $todasLasLecturas->avg('valor');
        $totalLecturas = $todasLasLecturas->count();
        $porcentajeFueraDeRango = $totalLecturas > 0 ?
            round(($totalFueraDeRango / $totalLecturas) * 100, 2) : 0;


        $duracionTotalAlertas = collect($alertasActivas)->sum('duracion_minutos');
        $promedioLecturasporAlerta = collect($alertasActivas)->avg('lecturas_alerta');

        // Separar alertas activas por tipo
        $alertaActivaBaja = $alertasActivasActuales->where('tipo', 'baja')->first();
        $alertaActivaAlta = $alertasActivasActuales->where('tipo', 'alta')->first();

        // 11. Preparar respuesta completa
        return response()->json([
            'dispositivo' => [
                'id' => $dispId,
                'numero_serie' => $serie
            ],
            'camada' => [
                'id' => $camada->id_camada,
                'nombre' => $camada->nombre_camada,
                'tipo_ave' => $camada->tipo_ave,
                'fecha_inicio' => $camada->fecha_hora_inicio
            ],
            'periodo' => [
                'fecha_inicio' => $fechaInicio,
                'fecha_fin' => $fechaFin
            ],
            'configuracion' => [
                'usar_margenes_personalizados' => $usarMargenesPersonalizados,
                'rangos_alerta' => [
                    [
                        'rango_edad' => '0-14 días',
                        'margen_inferior' => '5%',
                        'margen_superior' => '10%'
                    ],
                    [
                        'rango_edad' => '15-28 días',
                        'margen_inferior' => '10%',
                        'margen_superior' => '15%'
                    ],
                    [
                        'rango_edad' => '29+ días',
                        'margen_inferior' => '15%',
                        'margen_superior' => '25%'
                    ]
                ]
            ],
            'resumen' => [
                'temperatura_media_global' => round($temperaturaMediaGlobal, 2),
                'total_lecturas' => $totalLecturas,
                'lecturas_fuera_rango' => $totalFueraDeRango,
                'porcentaje_fuera_rango' => $porcentajeFueraDeRango
            ],
            'resumen_alertas_activas' => [
                'total_alertas_procesadas' => count($alertasActivas),
                'alertas_activas_actuales' => $alertasActivasActuales->count(), // Debería ser 0 o 1
                'alertas_resueltas' => $alertasResueltasTotal->count(),
                'duracion_total_alertas_minutos' => collect($alertasActivas)->sum('duracion_minutos'),
                'promedio_lecturas_por_alerta' => collect($alertasActivas)->avg('lecturas_alerta'),
                'hay_alerta_activa' => $alertaActivaActual !== null,
                'tipo_alerta_activa' => $alertaActivaActual ? $alertaActivaActual['tipo'] : null
            ],
            'alertas_activas_actuales' => [
                // ✅ SOLO UNA ESTRUCTURA - La que esté activa
                'temperatura_baja' => ($alertaActivaActual && $alertaActivaActual['tipo'] === 'baja') ? $alertaActivaActual : null,
                'temperatura_alta' => ($alertaActivaActual && $alertaActivaActual['tipo'] === 'alta') ? $alertaActivaActual : null,
            ],
            'datos_grafica' => $datosGrafica,
            'alertas' => $alertas,
            'historial_alertas_activas' => $alertasActivas
        ], Response::HTTP_OK);
    }
    /**
     * Obtiene datos de humedad para gráfica y tabla de alertas con márgenes variables
     * 
     * @param Request $request
     * @param int $dispId ID del dispositivo
     * @return JsonResponse
     */
    public function getHumedadGraficaAlertas(Request $request, int $dispId): JsonResponse
{
    // 1. Validar parámetros
    $request->validate([
        'fecha_inicio' => 'required|date|before_or_equal:fecha_fin',
        'fecha_fin'    => 'required|date',
    ]);

    $fechaInicio = $request->query('fecha_inicio');
    $fechaFin = $request->query('fecha_fin');

    // 2. Cargar dispositivo y camada asociada
    $dispositivo = Dispositivo::findOrFail($dispId);
    $serie = $dispositivo->numero_serie;

    $camada = Camada::join('tb_relacion_camada_dispositivo', 'tb_camada.id_camada', '=', 'tb_relacion_camada_dispositivo.id_camada')
        ->where('tb_relacion_camada_dispositivo.id_dispositivo', $dispId)
        ->where(function ($query) use ($fechaInicio, $fechaFin) {
            $query->where(function ($q) use ($fechaInicio, $fechaFin) {
                $q->where('tb_camada.fecha_hora_inicio', '<=', $fechaFin)
                    ->where(function ($q2) use ($fechaInicio) {
                        $q2->whereNull('tb_camada.fecha_hora_final')
                            ->orWhere('tb_camada.fecha_hora_final', '>=', $fechaInicio);
                    });
            });
        })
        ->select('tb_camada.*')
        ->first();

    if (!$camada) {
        return response()->json([
            'mensaje' => 'No se encontró una camada activa para este dispositivo en el rango de fechas especificado',
            'dispositivo' => [
                'id' => $dispId,
                'numero_serie' => $serie
            ]
        ], Response::HTTP_OK);
    }

    // 3. Función para determinar rangos de humedad aceptables según edad
    $obtenerRangosHumedad = function ($edadDias) {
        if ($edadDias >= 0 && $edadDias <= 3) {
            return [
                'min' => 55,
                'max' => 75
            ];
        } elseif ($edadDias <= 14) {
            return [
                'min' => 50,
                'max' => 70
            ];
        } else {
            return [
                'min' => 45,
                'max' => 65
            ];
        }
    };

    // 4. Sensor de humedad
    $SENSOR_HUMEDAD = 5;

    // 5. Obtener todas las lecturas individuales ordenadas por fecha para procesar alertas activas
    $todasLasLecturas = EntradaDato::where('id_dispositivo', $serie)
        ->where('id_sensor', $SENSOR_HUMEDAD)
        ->whereBetween('fecha', [$fechaInicio . ' 00:00:00', $fechaFin . ' 23:59:59'])
        ->orderBy('fecha')
        ->get(['valor', 'fecha']);

    // 6. Obtener datos diarios para la gráfica
    $datosDiarios = EntradaDato::where('id_dispositivo', $serie)
        ->where('id_sensor', $SENSOR_HUMEDAD)
        ->whereBetween('fecha', [$fechaInicio . ' 00:00:00', $fechaFin . ' 23:59:59'])
        ->select(
            DB::raw('DATE(fecha) as dia'),
            DB::raw('ROUND(AVG(valor),2) as humedad_media'),
            DB::raw('MIN(valor) as humedad_min'),
            DB::raw('MAX(valor) as humedad_max'),
            DB::raw('COUNT(*) as lecturas')
        )
        ->groupBy('dia')
        ->orderBy('dia')
        ->get();

    // 7. Preparar datos para la gráfica con referencias y rangos aceptables
    $datosGrafica = [];
    foreach ($datosDiarios as $dato) {
        $edadDias = Carbon::parse($camada->fecha_hora_inicio)
            ->diffInDays(Carbon::parse($dato->dia));

        $rangos = $obtenerRangosHumedad($edadDias);
        $humedadMin = $rangos['min'];
        $humedadMax = $rangos['max'];
        $humedadReferencia = ($humedadMin + $humedadMax) / 2;

        $datosGrafica[] = [
            'fecha' => $dato->dia,
            'humedad_media' => $dato->humedad_media,
            'humedad_min' => $dato->humedad_min,
            'humedad_max' => $dato->humedad_max,
            'humedad_referencia' => $humedadReferencia,
            'limite_inferior' => $humedadMin,
            'limite_superior' => $humedadMax,
            'edad_dias' => $edadDias,
            'lecturas' => $dato->lecturas
        ];
    }

    // 8. Procesar alertas (todas y activas) - LÓGICA IGUAL A TEMPERATURA
    $alertas = [];
    $alertasActivas = [];
    $alertaActualActiva = null; // Solo UNA alerta activa por dispositivo
    $totalFueraDeRango = 0;

    foreach ($todasLasLecturas as $lectura) {
        $fechaLectura = Carbon::parse($lectura->fecha);
        $edadDias = Carbon::parse($camada->fecha_hora_inicio)->diffInDays($fechaLectura);

        $rangos = $obtenerRangosHumedad($edadDias);
        $humedadMin = $rangos['min'];
        $humedadMax = $rangos['max'];
        $humedadReferencia = ($humedadMin + $humedadMax) / 2;

        $valorLectura = (float) $lectura->valor;

        // Determinar si esta lectura genera una alerta
        $tipoAlertaActual = null;
        if ($valorLectura < $humedadMin) {
            $tipoAlertaActual = 'baja';
        } elseif ($valorLectura > $humedadMax) {
            $tipoAlertaActual = 'alta';
        }

        // Si hay una alerta en esta lectura
        if ($tipoAlertaActual !== null) {
            $desviacion = round($valorLectura - $humedadReferencia, 2);
            $desviacionPorcentaje = round(($desviacion / $humedadReferencia) * 100, 2);

            $alerta = [
                'fecha' => $fechaLectura->format('Y-m-d'),
                'hora' => $fechaLectura->format('H:i:s'),
                'humedad_medida' => $valorLectura,
                'humedad_referencia' => $humedadReferencia,
                'limite_inferior' => $humedadMin,
                'limite_superior' => $humedadMax,
                'desviacion' => $desviacion,
                'desviacion_porcentaje' => $desviacionPorcentaje,
                'tipo' => $tipoAlertaActual,
                'edad_dias' => $edadDias,
                'rango_edad' => $edadDias <= 3 ? '0-3 días' : ($edadDias <= 14 ? '4-14 días' : '15+ días')
            ];

            // Agregar a todas las alertas
            $alertas[] = $alerta;
            $totalFueraDeRango++;

            // ✅ GESTIÓN DE ALERTAS ACTIVAS - SOLO UNA A LA VEZ
            if ($alertaActualActiva === null) {
                // No hay alerta activa, crear una nueva
                $alertaActualActiva = [
                    'inicio' => $alerta,
                    'fin' => null,
                    'tipo' => $tipoAlertaActual,
                    'duracion_minutos' => 0,
                    'lecturas_alerta' => 1,
                    'estado' => 'activa'
                ];
            } elseif ($alertaActualActiva['tipo'] === $tipoAlertaActual) {
                // ✅ MISMO TIPO: Solo actualizar duración y contador
                $inicioAlerta = Carbon::parse($alertaActualActiva['inicio']['fecha'] . ' ' . $alertaActualActiva['inicio']['hora']);
                $alertaActualActiva['duracion_minutos'] = $inicioAlerta->diffInMinutes($fechaLectura);
                $alertaActualActiva['lecturas_alerta']++;
            } else {
                // ✅ TIPO DIFERENTE: Cerrar la anterior y crear nueva (REEMPLAZAR)
                $alertaActualActiva['fin'] = [
                    'fecha' => $fechaLectura->format('Y-m-d'),
                    'hora' => $fechaLectura->format('H:i:s'),
                    'motivo' => 'cambio_tipo',
                    'nuevo_tipo' => $tipoAlertaActual
                ];
                $alertaActualActiva['estado'] = 'resuelta';

                // Agregar la alerta cerrada al historial
                $alertasActivas[] = $alertaActualActiva;

                // ✅ CREAR NUEVA ALERTA (REEMPLAZANDO LA ANTERIOR)
                $alertaActualActiva = [
                    'inicio' => $alerta,
                    'fin' => null,
                    'tipo' => $tipoAlertaActual,
                    'duracion_minutos' => 0,
                    'lecturas_alerta' => 1,
                    'estado' => 'activa'
                ];
            }
        } else {
            // ✅ NO HAY ALERTA: Si hay una alerta activa, cerrarla
            if ($alertaActualActiva !== null) {
                $alertaActualActiva['fin'] = [
                    'fecha' => $fechaLectura->format('Y-m-d'),
                    'hora' => $fechaLectura->format('H:i:s'),
                    'motivo' => 'normalizada',
                    'humedad_normalizacion' => $valorLectura
                ];
                $alertaActualActiva['estado'] = 'resuelta';

                // Agregar al historial y limpiar
                $alertasActivas[] = $alertaActualActiva;
                $alertaActualActiva = null; // ✅ LIMPIAR - No hay alerta activa
            }
        }
    }

    // ✅ IMPORTANTE: Si al final hay una alerta activa, agregarla
    if ($alertaActualActiva !== null) {
        $alertaActualActiva['estado'] = 'activa';
        $alertasActivas[] = $alertaActualActiva;
    }

    // ✅ PREPARAR RESPUESTA FINAL - SOLO UNA ALERTA ACTIVA
    $alertasActivasActuales = collect($alertasActivas)->where('estado', 'activa');
    $alertasResueltasTotal = collect($alertasActivas)->where('estado', 'resuelta');

    // ✅ SOLO PUEDE HABER UNA ALERTA ACTIVA
    $alertaActivaActual = $alertasActivasActuales->first(); // Solo la primera (debería ser única)

    // 9. Calcular estadísticas
    $humedadMediaGlobal = $todasLasLecturas->avg('valor');
    $totalLecturas = $todasLasLecturas->count();
    $porcentajeFueraDeRango = $totalLecturas > 0 ?
        round(($totalFueraDeRango / $totalLecturas) * 100, 2) : 0;

    $duracionTotalAlertas = collect($alertasActivas)->sum('duracion_minutos');
    $promedioLecturasporAlerta = collect($alertasActivas)->avg('lecturas_alerta');

    // 10. Preparar respuesta completa
    return response()->json([
        'dispositivo' => [
            'id' => $dispId,
            'numero_serie' => $serie
        ],
        'camada' => [
            'id' => $camada->id_camada,
            'nombre' => $camada->nombre_camada,
            'tipo_ave' => $camada->tipo_ave,
            'fecha_inicio' => $camada->fecha_hora_inicio
        ],
        'periodo' => [
            'fecha_inicio' => $fechaInicio,
            'fecha_fin' => $fechaFin
        ],
        'configuracion' => [
            'rangos_alerta' => [
                [
                    'rango_edad' => '0-3 días',
                    'humedad_min' => '55%',
                    'humedad_max' => '75%'
                ],
                [
                    'rango_edad' => '4-14 días',
                    'humedad_min' => '50%',
                    'humedad_max' => '70%'
                ],
                [
                    'rango_edad' => '15+ días',
                    'humedad_min' => '45%',
                    'humedad_max' => '65%'
                ]
            ]
        ],
        'resumen' => [
            'humedad_media_global' => round($humedadMediaGlobal, 2),
            'total_lecturas' => $totalLecturas,
            'lecturas_fuera_rango' => $totalFueraDeRango,
            'porcentaje_fuera_rango' => $porcentajeFueraDeRango
        ],
        'resumen_alertas_activas' => [
            'total_alertas_procesadas' => count($alertasActivas),
            'alertas_activas_actuales' => $alertasActivasActuales->count(), // Debería ser 0 o 1
            'alertas_resueltas' => $alertasResueltasTotal->count(),
            'duracion_total_alertas_minutos' => collect($alertasActivas)->sum('duracion_minutos'),
            'promedio_lecturas_por_alerta' => collect($alertasActivas)->avg('lecturas_alerta'),
            'hay_alerta_activa' => $alertaActivaActual !== null,
            'tipo_alerta_activa' => $alertaActivaActual ? $alertaActivaActual['tipo'] : null
        ],
        'alertas_activas_actuales' => [
            // ✅ SOLO UNA ESTRUCTURA - La que esté activa
            'humedad_baja' => ($alertaActivaActual && $alertaActivaActual['tipo'] === 'baja') ? $alertaActivaActual : null,
            'humedad_alta' => ($alertaActivaActual && $alertaActivaActual['tipo'] === 'alta') ? $alertaActivaActual : null,
        ],
        'datos_grafica' => $datosGrafica,
        'alertas' => $alertas,
        'historial_alertas_activas' => $alertasActivas
    ], Response::HTTP_OK);
}

    /**
     * Obtiene todas las lecturas individuales de temperatura o humedad en un rango de fechas
     * 
     * @param Request $request
     * @param int $dispId ID del dispositivo
     * @param string $tipoSensor Tipo de sensor ('temperatura' o 'humedad')
     * @return JsonResponse
     */
    public function getMedidasIndividuales(Request $request, int $dispId, string $tipoSensor): JsonResponse
    {
        // 1. Validar parámetros
        $request->validate([
            'fecha_inicio' => 'required|date|before_or_equal:fecha_fin',
            'fecha_fin'    => 'required|date',
        ]);

        $fechaInicio = $request->query('fecha_inicio');
        $fechaFin = $request->query('fecha_fin');

        // 2. Cargar dispositivo
        $dispositivo = Dispositivo::findOrFail($dispId);
        $serie = $dispositivo->numero_serie;

        // 3. Determinar el ID del sensor según el tipo
        $idSensor = $tipoSensor === 'temperatura' ? 6 : ($tipoSensor === 'humedad' ? 5 : null);

        if ($idSensor === null) {
            return response()->json([
                'error' => 'Tipo de sensor no válido. Use "temperatura" o "humedad".'
            ], Response::HTTP_BAD_REQUEST);
        }

        // 4. Cargar camada asociada
        $camada = Camada::join('tb_relacion_camada_dispositivo', 'tb_camada.id_camada', '=', 'tb_relacion_camada_dispositivo.id_camada')
            ->where('tb_relacion_camada_dispositivo.id_dispositivo', $dispId)
            ->where(function ($query) use ($fechaInicio, $fechaFin) {
                $query->where(function ($q) use ($fechaInicio, $fechaFin) {
                    $q->where('tb_camada.fecha_hora_inicio', '<=', $fechaFin)
                        ->where(function ($q2) use ($fechaInicio) {
                            $q2->whereNull('tb_camada.fecha_hora_final')
                                ->orWhere('tb_camada.fecha_hora_final', '>=', $fechaInicio);
                        });
                });
            })
            ->select('tb_camada.*')
            ->first();

        if (!$camada) {
            return response()->json([
                'mensaje' => 'No se encontró una camada activa para este dispositivo en el rango de fechas especificado',
                'dispositivo' => [
                    'id' => $dispId,
                    'numero_serie' => $serie
                ]
            ], Response::HTTP_OK);
        }

        // 5. Obtener todas las lecturas individuales
        $lecturas = EntradaDato::where('id_dispositivo', $serie)
            ->where('id_sensor', $idSensor)
            ->whereBetween('fecha', [$fechaInicio . ' 00:00:00', $fechaFin . ' 23:59:59'])
            ->orderBy('fecha')
            ->get(['valor', 'fecha']);

        // 6. Calcular estadísticas básicas
        $total = $lecturas->count();
        $media = $total > 0 ? round($lecturas->avg('valor'), 2) : 0;
        $minima = $total > 0 ? round($lecturas->min('valor'), 2) : 0;
        $maxima = $total > 0 ? round($lecturas->max('valor'), 2) : 0;

        // 7. Preparar datos para la gráfica
        $medidas = $lecturas->map(function ($lectura) {
            return [
                'valor' => (float) $lectura->valor,
                'fecha' => $lectura->fecha,
                'hora' => Carbon::parse($lectura->fecha)->format('H:i'),
                'dia' => Carbon::parse($lectura->fecha)->format('Y-m-d')
            ];
        });

        // 8. Agrupar por día para obtener totales diarios
        $porDia = $medidas->groupBy('dia')->map(function ($grupo) {
            return [
                'fecha' => $grupo[0]['dia'],
                'total' => count($grupo),
                'media' => round($grupo->avg('valor'), 2)
            ];
        })->values();

        // 9. Preparar respuesta
        return response()->json([
            'dispositivo' => [
                'id' => $dispId,
                'numero_serie' => $serie
            ],
            'camada' => [
                'id' => $camada->id_camada,
                'nombre' => $camada->nombre_camada
            ],
            'periodo' => [
                'fecha_inicio' => $fechaInicio,
                'fecha_fin' => $fechaFin
            ],
            'tipo_sensor' => $tipoSensor,
            'estadisticas' => [
                'total_lecturas' => $total,
                'media' => $media,
                'minima' => $minima,
                'maxima' => $maxima
            ],
            'resumen_diario' => $porDia,
            'medidas' => $medidas
        ], Response::HTTP_OK);
    }

    /**
     * Obtiene datos ambientales diarios para un dispositivo en una fecha específica
     * 
     * @param Request $request
     * @param int $dispId ID del dispositivo
     * @return JsonResponse
     */
    /**
     * Obtiene datos ambientales diarios para un dispositivo en una fecha específica
     * 
     * @param Request $request
     * @param int $dispId ID del dispositivo
     * @return JsonResponse
     */
    public function getDatosAmbientalesDiarios(Request $request, int $dispId): JsonResponse
    {
        // 1. Validar parámetros
        $request->validate([
            'fecha' => 'required|date',
        ]);

        $fecha = $request->query('fecha');

        // Usar fecha actual si no se proporciona
        if (!$fecha) {
            $fecha = Carbon::now()->format('Y-m-d');
        }

        // 2. Cargar dispositivo y camada asociada
        $dispositivo = Dispositivo::findOrFail($dispId);
        $serie = $dispositivo->numero_serie;

        $camada = Camada::join('tb_relacion_camada_dispositivo', 'tb_camada.id_camada', '=', 'tb_relacion_camada_dispositivo.id_camada')
            ->where('tb_relacion_camada_dispositivo.id_dispositivo', $dispId)
            ->where('tb_camada.fecha_hora_inicio', '<=', $fecha)
            ->where(function ($query) use ($fecha) {
                $query->whereNull('tb_camada.fecha_hora_final')
                    ->orWhere('tb_camada.fecha_hora_final', '>=', $fecha);
            })
            ->select('tb_camada.*')
            ->first();

        if (!$camada) {
            return response()->json([
                'mensaje' => 'No se encontró una camada activa para este dispositivo en la fecha especificada',
                'dispositivo' => [
                    'id' => $dispId,
                    'numero_serie' => $serie
                ],
                'fecha' => $fecha
            ], Response::HTTP_OK);
        }

        // 3. Calcular edad de la camada en este día
        $edadDias = Carbon::parse($camada->fecha_hora_inicio)->diffInDays($fecha);

        // 4. Definición de sensores
        $SENSOR_TEMPERATURA = 6;
        $SENSOR_HUMEDAD = 5;
        $SENSOR_TEMPERATURA_SUELO = 12;
        $SENSOR_HUMEDAD_SUELO = 13;

        // 5. Obtener lecturas para cada sensor en la fecha dada
        $lecturas_temp = EntradaDato::where('id_dispositivo', $serie)
            ->where('id_sensor', $SENSOR_TEMPERATURA)
            ->whereDate('fecha', $fecha)
            ->get(['valor', 'fecha']);

        $lecturas_hum = EntradaDato::where('id_dispositivo', $serie)
            ->where('id_sensor', $SENSOR_HUMEDAD)
            ->whereDate('fecha', $fecha)
            ->get(['valor', 'fecha']);

        $lecturas_temp_suelo = EntradaDato::where('id_dispositivo', $serie)
            ->where('id_sensor', $SENSOR_TEMPERATURA_SUELO)
            ->whereDate('fecha', $fecha)
            ->get(['valor', 'fecha']);

        $lecturas_hum_suelo = EntradaDato::where('id_dispositivo', $serie)
            ->where('id_sensor', $SENSOR_HUMEDAD_SUELO)
            ->whereDate('fecha', $fecha)
            ->get(['valor', 'fecha']);

        // 6. Calcular medias
        $temp_media = $lecturas_temp->count() > 0 ? round($lecturas_temp->avg('valor'), 1) : null;
        $hum_media = $lecturas_hum->count() > 0 ? round($lecturas_hum->avg('valor'), 1) : null;
        $temp_suelo_media = $lecturas_temp_suelo->count() > 0 ? round($lecturas_temp_suelo->avg('valor'), 1) : null;
        $hum_suelo_media = $lecturas_hum_suelo->count() > 0 ? round($lecturas_hum_suelo->avg('valor'), 1) : null;

        // 7. Calcular índice de estrés calórico (IEC)
        // Fórmula: IEC = Temperatura Ambiente (ºC) + Humedad relativa del aire (%)
        $indice_estres_calorico = null;
        $nivel_estres_calorico = null;
        if ($temp_media !== null && $hum_media !== null) {
            $indice_estres_calorico = round($temp_media + $hum_media, 1);

            // Determinar nivel de estrés calórico según índice
            if ($indice_estres_calorico <= 105) {
                $nivel_estres_calorico = [
                    'nivel' => 'normal',
                    'color' => 'green',
                    'mensaje' => 'Condiciones normales'
                ];
            } elseif ($indice_estres_calorico <= 120) {
                $nivel_estres_calorico = [
                    'nivel' => 'alerta',
                    'color' => 'yellow',
                    'mensaje' => 'Alerta: Estrés calórico moderado'
                ];
            } elseif ($indice_estres_calorico <= 130) {
                $nivel_estres_calorico = [
                    'nivel' => 'peligro',
                    'color' => 'orange',
                    'mensaje' => 'Peligro: Estrés calórico alto'
                ];
            } else {
                $nivel_estres_calorico = [
                    'nivel' => 'emergencia',
                    'color' => 'red',
                    'mensaje' => 'Emergencia: Estrés calórico extremo'
                ];
            }
        }

        // 8. Calcular índice THI (Temperature Humidity Index)
        // Fórmula: THI = (0,8 x Tª Ambiente (ºC)) + ((Hr del aire (%) / 100) x (Tª Ambiente – 14,4)) + 46,4
        $indice_thi = null;
        $nivel_thi = null;
        if ($temp_media !== null && $hum_media !== null) {
            $indice_thi = round((0.8 * $temp_media) + (($hum_media / 100) * ($temp_media - 14.4)) + 46.4, 1);

            // Determinar nivel THI según índice
            if ($indice_thi <= 72) {
                $nivel_thi = [
                    'nivel' => 'normal',
                    'color' => 'green',
                    'mensaje' => 'THI normal: Condiciones óptimas'
                ];
            } elseif ($indice_thi <= 79) {
                $nivel_thi = [
                    'nivel' => 'alerta',
                    'color' => 'yellow',
                    'mensaje' => 'THI elevado: Alerta'
                ];
            } elseif ($indice_thi <= 88) {
                $nivel_thi = [
                    'nivel' => 'peligro',
                    'color' => 'orange',
                    'mensaje' => 'THI alto: Peligro'
                ];
            } else {
                $nivel_thi = [
                    'nivel' => 'emergencia',
                    'color' => 'red',
                    'mensaje' => 'THI crítico: Emergencia'
                ];
            }
        }

        // 9. Obtener referencias de temperatura
        $referenciasTemperatura = TemperaturaBroilers::orderBy('edad')->get();
        $cacheReferencias = [];

        // Función auxiliar para obtener la temperatura de referencia por edad
        $obtenerReferenciaTemperatura = function ($edadDias) use ($referenciasTemperatura, &$cacheReferencias) {
            // Si ya tenemos esta edad en caché, devolver valor almacenado
            if (isset($cacheReferencias[$edadDias])) {
                return $cacheReferencias[$edadDias];
            }

            // Intentar encontrar coincidencia exacta
            $referenciaExacta = $referenciasTemperatura->firstWhere('edad', $edadDias);
            if ($referenciaExacta) {
                $cacheReferencias[$edadDias] = $referenciaExacta->temperatura;
                return $referenciaExacta->temperatura;
            }

            // Buscar la referencia más cercana
            $refCercana = null;
            $menorDiferencia = PHP_INT_MAX;

            foreach ($referenciasTemperatura as $ref) {
                $diferencia = abs($ref->edad - $edadDias);
                if ($diferencia < $menorDiferencia) {
                    $menorDiferencia = $diferencia;
                    $refCercana = $ref;
                }
            }

            // Guardar en caché y devolver
            $temperatura = $refCercana ? $refCercana->temperatura : null;
            $cacheReferencias[$edadDias] = $temperatura;
            return $temperatura;
        };

        // 10. Obtener la temperatura de referencia para esta edad
        $temperatura_referencia = $obtenerReferenciaTemperatura($edadDias);

        // 11. Definir márgenes de temperatura según edad
        $obtenerMargenes = function ($edadDias) {
            if ($edadDias >= 0 && $edadDias <= 14) {
                return [
                    'inferior' => 5,  // -5%
                    'superior' => 10  // +10%
                ];
            } elseif ($edadDias <= 28) {
                return [
                    'inferior' => 10, // -10%
                    'superior' => 15  // +15%
                ];
            } else {
                return [
                    'inferior' => 15, // -15%
                    'superior' => 25  // +25%
                ];
            }
        };

        // 12. Definir rangos de humedad aceptables según edad
        $obtenerRangosHumedad = function ($edadDias) {
            if ($edadDias >= 0 && $edadDias <= 3) {
                return [
                    'min' => 55,
                    'max' => 75
                ];
            } elseif ($edadDias <= 14) {
                return [
                    'min' => 50,
                    'max' => 70
                ];
            } else {
                return [
                    'min' => 45,
                    'max' => 65
                ];
            }
        };

        // 13. Obtener márgenes y calcular límites para temperatura
        $margenes = $obtenerMargenes($edadDias);
        $limite_inferior_temp = $temperatura_referencia ? round($temperatura_referencia * (1 - $margenes['inferior'] / 100), 1) : null;
        $limite_superior_temp = $temperatura_referencia ? round($temperatura_referencia * (1 + $margenes['superior'] / 100), 1) : null;

        // 14. Obtener rangos para humedad
        $rangos_humedad = $obtenerRangosHumedad($edadDias);
        $humedad_referencia = ($rangos_humedad['min'] + $rangos_humedad['max']) / 2;

        // 15. Evaluar alertas de temperatura
        $alerta_temperatura = null;
        if ($temp_media !== null && $temperatura_referencia !== null) {
            if ($temp_media < $limite_inferior_temp) {
                $alerta_temperatura = [
                    'tipo' => 'baja',
                    'valor' => $temp_media,
                    'referencia' => $temperatura_referencia,
                    'limite' => $limite_inferior_temp,
                    'desviacion' => round($temp_media - $temperatura_referencia, 1),
                    'desviacion_porcentaje' => round((($temp_media - $temperatura_referencia) / $temperatura_referencia) * 100, 1)
                ];
            } elseif ($temp_media > $limite_superior_temp) {
                $alerta_temperatura = [
                    'tipo' => 'alta',
                    'valor' => $temp_media,
                    'referencia' => $temperatura_referencia,
                    'limite' => $limite_superior_temp,
                    'desviacion' => round($temp_media - $temperatura_referencia, 1),
                    'desviacion_porcentaje' => round((($temp_media - $temperatura_referencia) / $temperatura_referencia) * 100, 1)
                ];
            }
        }

        // 16. Evaluar alertas de humedad
        $alerta_humedad = null;
        if ($hum_media !== null) {
            if ($hum_media < $rangos_humedad['min']) {
                $alerta_humedad = [
                    'tipo' => 'baja',
                    'valor' => $hum_media,
                    'referencia' => $humedad_referencia,
                    'limite' => $rangos_humedad['min'],
                    'desviacion' => round($hum_media - $humedad_referencia, 1),
                    'desviacion_porcentaje' => round((($hum_media - $humedad_referencia) / $humedad_referencia) * 100, 1)
                ];
            } elseif ($hum_media > $rangos_humedad['max']) {
                $alerta_humedad = [
                    'tipo' => 'alta',
                    'valor' => $hum_media,
                    'referencia' => $humedad_referencia,
                    'limite' => $rangos_humedad['max'],
                    'desviacion' => round($hum_media - $humedad_referencia, 1),
                    'desviacion_porcentaje' => round((($hum_media - $humedad_referencia) / $humedad_referencia) * 100, 1)
                ];
            }
        }

        // 17. Preparar respuesta
        return response()->json([
            'dispositivo' => [
                'id' => $dispId,
                'numero_serie' => $serie
            ],
            'camada' => [
                'id' => $camada->id_camada,
                'nombre' => $camada->nombre_camada,
                'tipo_ave' => $camada->tipo_ave,
                'fecha_inicio' => $camada->fecha_hora_inicio,
                'edad_dias' => $edadDias
            ],
            'fecha' => $fecha,
            'lecturas' => [
                'temperatura' => [
                    'valor' => $temp_media,
                    'total_lecturas' => $lecturas_temp->count(),
                    'ultima_lectura' => $lecturas_temp->count() > 0 ? $lecturas_temp->sortByDesc('fecha')->first()->fecha : null,
                    'alerta' => $alerta_temperatura
                ],
                'humedad' => [
                    'valor' => $hum_media,
                    'total_lecturas' => $lecturas_hum->count(),
                    'ultima_lectura' => $lecturas_hum->count() > 0 ? $lecturas_hum->sortByDesc('fecha')->first()->fecha : null,
                    'alerta' => $alerta_humedad
                ],
                'temperatura_suelo' => [
                    'valor' => $temp_suelo_media,
                    'total_lecturas' => $lecturas_temp_suelo->count(),
                    'ultima_lectura' => $lecturas_temp_suelo->count() > 0 ? $lecturas_temp_suelo->sortByDesc('fecha')->first()->fecha : null
                ],
                'humedad_suelo' => [
                    'valor' => $hum_suelo_media,
                    'total_lecturas' => $lecturas_hum_suelo->count(),
                    'ultima_lectura' => $lecturas_hum_suelo->count() > 0 ? $lecturas_hum_suelo->sortByDesc('fecha')->first()->fecha : null
                ]
            ],
            'indices' => [
                'estres_calorico' => [
                    'valor' => $indice_estres_calorico,
                    'nivel' => $nivel_estres_calorico,
                    'rangos' => [
                        ['min' => null, 'max' => 105, 'nivel' => 'normal', 'color' => 'green'],
                        ['min' => 105, 'max' => 120, 'nivel' => 'alerta', 'color' => 'yellow'],
                        ['min' => 120, 'max' => 130, 'nivel' => 'peligro', 'color' => 'orange'],
                        ['min' => 130, 'max' => null, 'nivel' => 'emergencia', 'color' => 'red']
                    ]
                ],
                'thi' => [
                    'valor' => $indice_thi,
                    'nivel' => $nivel_thi,
                    'rangos' => [
                        ['min' => null, 'max' => 72, 'nivel' => 'normal', 'color' => 'green'],
                        ['min' => 72, 'max' => 79, 'nivel' => 'alerta', 'color' => 'yellow'],
                        ['min' => 79, 'max' => 88, 'nivel' => 'peligro', 'color' => 'orange'],
                        ['min' => 88, 'max' => null, 'nivel' => 'emergencia', 'color' => 'red']
                    ]
                ]
            ],
            'referencias' => [
                'temperatura' => [
                    'valor' => $temperatura_referencia,
                    'limite_inferior' => $limite_inferior_temp,
                    'limite_superior' => $limite_superior_temp,
                    'margenes' => $margenes
                ],
                'humedad' => [
                    'valor' => $humedad_referencia,
                    'limites' => $rangos_humedad
                ]
            ]
        ], Response::HTTP_OK);
    }

    /**
     * Monitorea la actividad de aves para un dispositivo en un rango de fechas
     * 
     * @param Request $request
     * @param int $dispId ID del dispositivo
     * @return JsonResponse
     */
    public function monitorearActividad(Request $request, int $dispId): JsonResponse
    {
        // 1. Validar parámetros
        $request->validate([
            'fecha_inicio' => 'nullable|date',
            'fecha_fin'    => 'nullable|date|after_or_equal:fecha_inicio',
        ]);

        // Si solo se proporciona una fecha, usar esa fecha como único día
        $fechaInicio = $request->query('fecha_inicio');
        $fechaFin = $request->query('fecha_fin', $fechaInicio);

        // Si no se proporciona ninguna fecha, usar la fecha actual
        if (!$fechaInicio) {
            $fechaInicio = Carbon::now()->format('Y-m-d');
            $fechaFin = $fechaInicio;
        }

        // 2. Cargar dispositivo
        $dispositivo = Dispositivo::findOrFail($dispId);
        $serie = $dispositivo->numero_serie;

        // 3. ID del sensor de actividad
        $SENSOR_ACTIVIDAD = 3;

        // 4. Obtener lecturas de actividad para el rango de fechas
        $lecturas = EntradaDato::where('id_dispositivo', $serie)
            ->where('id_sensor', $SENSOR_ACTIVIDAD)
            ->whereBetween('fecha', [$fechaInicio . ' 00:00:00', $fechaFin . ' 23:59:59'])
            ->orderBy('fecha')
            ->get(['valor', 'fecha']);

        if ($lecturas->isEmpty()) {
            return response()->json([
                'mensaje' => 'No se encontraron lecturas de actividad para el rango de fechas especificado',
                'dispositivo' => [
                    'id' => $dispId,
                    'numero_serie' => $serie
                ],
                'periodo' => [
                    'fecha_inicio' => $fechaInicio,
                    'fecha_fin' => $fechaFin
                ]
            ], Response::HTTP_OK);
        }

        // 5. Procesar las lecturas para determinar los periodos de actividad
        $periodosActividad = [];
        $inicioActividad = null;
        $finActividad = null;
        $actividadExtendida = false;

        // Función para agregar un periodo completado a la lista
        $agregarPeriodo = function ($inicio, $fin) use (&$periodosActividad) {
            if ($inicio && $fin) {
                $duracion = Carbon::parse($inicio)->diffInSeconds(Carbon::parse($fin));
                $periodosActividad[] = [
                    'inicio' => $inicio,
                    'fin' => $fin,
                    'duracion_segundos' => $duracion
                ];
            }
        };

        foreach ($lecturas as $index => $lectura) {
            $fechaActual = Carbon::parse($lectura->fecha);
            $valor = (int)$lectura->valor;

            // Si encontramos un 1 (actividad)
            if ($valor === 1) {
                // Si no hay periodo activo, iniciamos uno nuevo
                if ($inicioActividad === null) {
                    $inicioActividad = $lectura->fecha;
                    $finActividad = Carbon::parse($lectura->fecha)->addMinute()->format('Y-m-d H:i:s');
                }
                // Si ya hay un periodo activo, extendemos su duración
                else {
                    $finActividad = max($finActividad, Carbon::parse($lectura->fecha)->addMinute()->format('Y-m-d H:i:s'));
                }
                $actividadExtendida = true;
            }
            // Si encontramos un 0 (inactividad)
            else {
                // Solo procesamos el 0 si ya pasó el tiempo de gracia del último 1
                if ($inicioActividad !== null && $fechaActual > Carbon::parse($finActividad)) {
                    $agregarPeriodo($inicioActividad, $finActividad);
                    $inicioActividad = null;
                    $finActividad = null;
                    $actividadExtendida = false;
                }
            }

            // Si es la última lectura y hay un periodo activo pendiente
            if ($index === $lecturas->count() - 1 && $inicioActividad !== null) {
                $agregarPeriodo($inicioActividad, $finActividad);
            }
        }

        // 6. Calcular estadísticas de actividad
        $totalLecturas = $lecturas->count();
        $totalActivas = $lecturas->where('valor', 1)->count();

        // Calcular duración total del periodo analizado en segundos
        $duracionTotalSegundos = Carbon::parse($fechaInicio . ' 00:00:00')->diffInSeconds(Carbon::parse($fechaFin . ' 23:59:59')) + 1;

        // Calcular tiempo total de actividad en segundos
        $tiempoActividadTotal = collect($periodosActividad)->sum('duracion_segundos');

        // Convertir a horas, minutos y segundos
        $horasActividad = floor($tiempoActividadTotal / 3600);
        $minutosActividad = floor(($tiempoActividadTotal % 3600) / 60);
        $segundosActividad = $tiempoActividadTotal % 60;

        // Calcular porcentajes
        $porcentajeActividad = round(($tiempoActividadTotal / $duracionTotalSegundos) * 100, 2);
        $porcentajeInactividad = round(100 - $porcentajeActividad, 2);

        // 7. Preparar resumen diario si hay más de un día
        $resumenDiario = [];
        if ($fechaInicio !== $fechaFin) {
            $periodo = CarbonPeriod::create($fechaInicio, $fechaFin);

            foreach ($periodo as $dia) {
                $fechaDia = $dia->format('Y-m-d');

                // Filtrar periodos de actividad para este día
                $periodosDelDia = collect($periodosActividad)->filter(function ($periodo) use ($fechaDia) {
                    $inicioDia = Carbon::parse($periodo['inicio'])->format('Y-m-d');
                    $finDia = Carbon::parse($periodo['fin'])->format('Y-m-d');

                    // Si el periodo cruza días, debemos considerar solo la parte que corresponde a este día
                    return ($inicioDia <= $fechaDia && $finDia >= $fechaDia);
                });

                // Calcular tiempo de actividad para este día
                $tiempoActividadDia = 0;

                foreach ($periodosDelDia as $periodo) {
                    $inicioEnDia = max(Carbon::parse($periodo['inicio']), Carbon::parse($fechaDia . ' 00:00:00'));
                    $finEnDia = min(Carbon::parse($periodo['fin']), Carbon::parse($fechaDia . ' 23:59:59'));

                    $tiempoActividadDia += $inicioEnDia->diffInSeconds($finEnDia);
                }

                // Calcular porcentaje para este día
                $duracionDiaSegundos = 86400; // 24 horas en segundos
                $porcentajeActividadDia = round(($tiempoActividadDia / $duracionDiaSegundos) * 100, 2);

                $resumenDiario[] = [
                    'fecha' => $fechaDia,
                    'tiempo_actividad_segundos' => $tiempoActividadDia,
                    'tiempo_actividad_formateado' => sprintf(
                        '%02d:%02d:%02d',
                        floor($tiempoActividadDia / 3600),
                        floor(($tiempoActividadDia % 3600) / 60),
                        $tiempoActividadDia % 60
                    ),
                    'porcentaje_actividad' => $porcentajeActividadDia,
                    'porcentaje_inactividad' => round(100 - $porcentajeActividadDia, 2)
                ];
            }
        }

        // 8. Preparar distribución de actividad por hora
        $actividadPorHora = [];
        for ($hora = 0; $hora < 24; $hora++) {
            $horaFormateada = str_pad($hora, 2, '0', STR_PAD_LEFT);
            $actividadPorHora[$horaFormateada] = 0;
        }

        // Calcular segundos de actividad por hora
        foreach ($periodosActividad as $periodo) {
            $inicio = Carbon::parse($periodo['inicio']);
            $fin = Carbon::parse($periodo['fin']);

            // Si inicio y fin están en la misma hora
            if ($inicio->format('H') === $fin->format('H')) {
                $hora = $inicio->format('H');
                $actividadPorHora[$hora] += $inicio->diffInSeconds($fin);
            }
            // Si cruzan horas diferentes
            else {
                $periodoHora = clone $inicio;
                $periodoHora->minute(0)->second(0);

                // Para cada hora entre inicio y fin
                while ($periodoHora->format('YmdH') <= $fin->format('YmdH')) {
                    $hora = $periodoHora->format('H');

                    // Para la primera hora (puede ser parcial)
                    if ($periodoHora->format('YmdH') === $inicio->format('YmdH')) {
                        $finHora = (clone $periodoHora)->addHour();
                        $actividadPorHora[$hora] += $inicio->diffInSeconds(min($finHora, $fin));
                    }
                    // Para la última hora (puede ser parcial)
                    elseif ($periodoHora->format('YmdH') === $fin->format('YmdH')) {
                        $actividadPorHora[$hora] += $periodoHora->diffInSeconds($fin);
                    }
                    // Para horas completas en medio
                    elseif ($periodoHora > $inicio && $periodoHora->addHour() < $fin) {
                        $actividadPorHora[$hora] += 3600; // 1 hora completa
                    }

                    $periodoHora->addHour();
                }
            }
        }

        // Convertir segundos a minutos por hora y calcular porcentajes
        $actividadPorHoraFormateada = [];
        foreach ($actividadPorHora as $hora => $segundos) {
            $minutos = round($segundos / 60, 1);
            $porcentaje = round(($segundos / 3600) * 100, 1);

            $actividadPorHoraFormateada[] = [
                'hora' => $hora,
                'minutos_actividad' => $minutos,
                'porcentaje' => $porcentaje
            ];
        }

        // 9. Preparar las medidas filtradas (eliminar 0s dentro del periodo de actividad)
        $medidasFiltradas = [];
        $ultimaMedidaActiva = null;

        foreach ($lecturas as $lectura) {
            $valor = (int)$lectura->valor;
            $fechaLectura = Carbon::parse($lectura->fecha);

            // Si es una lectura de actividad, siempre la incluimos
            if ($valor === 1) {
                $medidasFiltradas[] = [
                    'fecha' => $lectura->fecha,
                    'valor' => $valor
                ];
                $ultimaMedidaActiva = $fechaLectura;
            }
            // Si es inactividad, solo la incluimos si no estamos en periodo extendido
            elseif ($ultimaMedidaActiva === null || $fechaLectura > $ultimaMedidaActiva->copy()->addMinute()) {
                $medidasFiltradas[] = [
                    'fecha' => $lectura->fecha,
                    'valor' => $valor
                ];
            }
        }

        // 10. Preparar respuesta completa
        return response()->json([
            'dispositivo' => [
                'id' => $dispId,
                'numero_serie' => $serie
            ],
            'periodo' => [
                'fecha_inicio' => $fechaInicio,
                'fecha_fin' => $fechaFin,
                'duracion_total_segundos' => $duracionTotalSegundos
            ],
            'resumen_actividad' => [
                'tiempo_total_segundos' => $tiempoActividadTotal,
                'tiempo_formateado' => sprintf('%02d:%02d:%02d', $horasActividad, $minutosActividad, $segundosActividad),
                'porcentaje_actividad' => $porcentajeActividad,
                'porcentaje_inactividad' => $porcentajeInactividad,
                'total_lecturas' => $totalLecturas,
                'lecturas_actividad' => $totalActivas
            ],
            'periodos_actividad' => $periodosActividad,
            'resumen_diario' => $resumenDiario,
            'actividad_por_hora' => $actividadPorHoraFormateada,
            'medidas_filtradas' => $medidasFiltradas
        ], Response::HTTP_OK);
    }

    /**
     * Monitorea la intensidad de luz para un dispositivo en un rango de fechas
     * 
     * @param Request $request
     * @param int $dispId ID del dispositivo
     * @return JsonResponse
     */
    public function monitorearLuz(Request $request, int $dispId): JsonResponse
    {
        // 1. Validar parámetros
        $request->validate([
            'fecha_inicio' => 'nullable|date',
            'fecha_fin'    => 'nullable|date|after_or_equal:fecha_inicio',
        ]);

        // Si solo se proporciona una fecha, usar esa fecha como único día
        $fechaInicio = $request->query('fecha_inicio');
        $fechaFin = $request->query('fecha_fin', $fechaInicio);

        // Si no se proporciona ninguna fecha, usar la fecha actual
        if (!$fechaInicio) {
            $fechaInicio = Carbon::now()->format('Y-m-d');
            $fechaFin = $fechaInicio;
        }

        // 2. Cargar dispositivo
        $dispositivo = Dispositivo::findOrFail($dispId);
        $serie = $dispositivo->numero_serie;

        // 3. ID del sensor de luz
        $SENSOR_LUZ = 4;
        $UMBRAL_LUZ = 0.5; // Umbral para considerar luz encendida (en lux)
        $TIEMPO_GRACIA_MINUTOS = 1; // Tiempo de gracia en minutos para unir periodos cercanos

        // 4. Obtener TODAS las lecturas de luz para el rango de fechas
        $lecturas = EntradaDato::where('id_dispositivo', $serie)
            ->where('id_sensor', $SENSOR_LUZ)
            ->whereBetween('fecha', [$fechaInicio . ' 00:00:00', $fechaFin . ' 23:59:59'])
            ->orderBy('fecha')
            ->get(['valor', 'fecha']);

        if ($lecturas->isEmpty()) {
            return response()->json([
                'mensaje' => 'No se encontraron lecturas de luz para el rango de fechas especificado',
                'dispositivo' => [
                    'id' => $dispId,
                    'numero_serie' => $serie
                ],
                'periodo' => [
                    'fecha_inicio' => $fechaInicio,
                    'fecha_fin' => $fechaFin
                ]
            ], Response::HTTP_OK);
        }

        // 5. Procesar las lecturas para determinar los periodos de luz
        $periodosLuz = [];
        $inicioLuz = null;
        $finLuz = null;

        // Función para agregar un periodo completado a la lista
        $agregarPeriodo = function ($inicio, $fin) use (&$periodosLuz) {
            if ($inicio && $fin) {
                $duracion = Carbon::parse($inicio)->diffInSeconds(Carbon::parse($fin));
                $periodosLuz[] = [
                    'inicio' => $inicio,
                    'fin' => $fin,
                    'duracion_segundos' => $duracion
                ];
            }
        };

        foreach ($lecturas as $index => $lectura) {
            $fechaActual = Carbon::parse($lectura->fecha);
            $valor = (float)$lectura->valor;

            // Si el valor está por encima del umbral (luz encendida)
            if ($valor >= $UMBRAL_LUZ) {
                // Si no hay periodo activo, iniciamos uno nuevo
                if ($inicioLuz === null) {
                    $inicioLuz = $lectura->fecha;
                }

                // Extendemos el final del periodo con el tiempo de gracia
                $finLuz = Carbon::parse($lectura->fecha)->addMinutes($TIEMPO_GRACIA_MINUTOS)->format('Y-m-d H:i:s');
            }
            // Si el valor está por debajo del umbral (luz apagada)
            else {
                // Solo finalizamos el periodo si ya pasó el tiempo de gracia desde la última lectura con luz
                if ($inicioLuz !== null && $fechaActual > Carbon::parse($finLuz)) {
                    $agregarPeriodo($inicioLuz, $finLuz);
                    $inicioLuz = null;
                    $finLuz = null;
                }
            }

            // Si es la última lectura y hay un periodo de luz pendiente
            if ($index === $lecturas->count() - 1 && $inicioLuz !== null) {
                $agregarPeriodo($inicioLuz, $finLuz);
            }
        }

        // 6. Calcular estadísticas de luz usando TODAS las lecturas
        $totalLecturas = $lecturas->count();
        $totalConLuz = $lecturas->filter(function ($lectura) use ($UMBRAL_LUZ) {
            return (float)$lectura->valor >= $UMBRAL_LUZ;
        })->count();

        // Calcular el valor promedio de luz
        $valorPromedioLuz = $lecturas->avg('valor');

        // Calcular el valor máximo y mínimo de luz
        $valorMaximoLuz = $lecturas->max('valor');
        $valorMinimoLuz = $lecturas->min('valor');

        // Calcular duración total del periodo analizado en segundos
        $duracionTotalSegundos = Carbon::parse($fechaInicio . ' 00:00:00')->diffInSeconds(Carbon::parse($fechaFin . ' 23:59:59')) + 1;

        // Calcular tiempo total de luz en segundos
        $tiempoLuzTotal = collect($periodosLuz)->sum('duracion_segundos');

        // Convertir a horas, minutos y segundos
        $horasLuz = floor($tiempoLuzTotal / 3600);
        $minutosLuz = floor(($tiempoLuzTotal % 3600) / 60);
        $segundosLuz = $tiempoLuzTotal % 60;

        // Calcular porcentajes
        $porcentajeLuz = round(($tiempoLuzTotal / $duracionTotalSegundos) * 100, 2);
        $porcentajeOscuridad = round(100 - $porcentajeLuz, 2);

        // 7. Preparar resumen diario si hay más de un día
        $resumenDiario = [];
        if ($fechaInicio !== $fechaFin) {
            $periodo = CarbonPeriod::create($fechaInicio, $fechaFin);

            foreach ($periodo as $dia) {
                $fechaDia = $dia->format('Y-m-d');

                // Filtrar lecturas para este día
                $lecturasDelDia = $lecturas->filter(function ($lectura) use ($fechaDia) {
                    return Carbon::parse($lectura->fecha)->format('Y-m-d') === $fechaDia;
                });

                // Filtrar periodos de luz para este día
                $periodosDelDia = collect($periodosLuz)->filter(function ($periodo) use ($fechaDia) {
                    $inicioDia = Carbon::parse($periodo['inicio'])->format('Y-m-d');
                    $finDia = Carbon::parse($periodo['fin'])->format('Y-m-d');

                    // Si el periodo cruza días, debemos considerar solo la parte que corresponde a este día
                    return ($inicioDia <= $fechaDia && $finDia >= $fechaDia);
                });

                // Calcular tiempo de luz para este día
                $tiempoLuzDia = 0;

                foreach ($periodosDelDia as $periodo) {
                    $inicioEnDia = max(Carbon::parse($periodo['inicio']), Carbon::parse($fechaDia . ' 00:00:00'));
                    $finEnDia = min(Carbon::parse($periodo['fin']), Carbon::parse($fechaDia . ' 23:59:59'));

                    $tiempoLuzDia += $inicioEnDia->diffInSeconds($finEnDia);
                }

                // Calcular porcentaje para este día
                $duracionDiaSegundos = 86400; // 24 horas en segundos
                $porcentajeLuzDia = round(($tiempoLuzDia / $duracionDiaSegundos) * 100, 2);

                // Calcular promedio de luz para este día
                $promedioLuzDia = count($lecturasDelDia) > 0 ? $lecturasDelDia->avg('valor') : 0;

                $resumenDiario[] = [
                    'fecha' => $fechaDia,
                    'tiempo_luz_segundos' => $tiempoLuzDia,
                    'tiempo_luz_formateado' => sprintf(
                        '%02d:%02d:%02d',
                        floor($tiempoLuzDia / 3600),
                        floor(($tiempoLuzDia % 3600) / 60),
                        $tiempoLuzDia % 60
                    ),
                    'porcentaje_luz' => $porcentajeLuzDia,
                    'porcentaje_oscuridad' => round(100 - $porcentajeLuzDia, 2),
                    'promedio_lux' => round($promedioLuzDia, 2),
                    'total_lecturas' => count($lecturasDelDia),
                    'lecturas_con_luz' => $lecturasDelDia->filter(function ($l) use ($UMBRAL_LUZ) {
                        return (float)$l->valor >= $UMBRAL_LUZ;
                    })->count()
                ];
            }
        }

        // 8. Preparar distribución de luz por hora
        $luzPorHora = [];
        for ($hora = 0; $hora < 24; $hora++) {
            $horaFormateada = str_pad($hora, 2, '0', STR_PAD_LEFT);
            $luzPorHora[$horaFormateada] = [
                'segundos' => 0,
                'lecturas' => 0,
                'promedio_lux' => 0,
                'lecturas_con_luz' => 0
            ];
        }

        // Calcular estadísticas por hora usando todas las lecturas
        foreach ($lecturas as $lectura) {
            $hora = Carbon::parse($lectura->fecha)->format('H');
            $valor = (float)$lectura->valor;

            // Incrementar contador de lecturas para esta hora
            $luzPorHora[$hora]['lecturas']++;

            // Acumular el valor para calcular el promedio
            $luzPorHora[$hora]['promedio_lux'] += $valor;

            // Contar lecturas por encima del umbral
            if ($valor >= $UMBRAL_LUZ) {
                $luzPorHora[$hora]['lecturas_con_luz']++;
            }
        }

        // Calcular segundos de luz por hora usando los periodos identificados
        foreach ($periodosLuz as $periodo) {
            $inicio = Carbon::parse($periodo['inicio']);
            $fin = Carbon::parse($periodo['fin']);

            // Si inicio y fin están en la misma hora
            if ($inicio->format('H') === $fin->format('H')) {
                $hora = $inicio->format('H');
                $luzPorHora[$hora]['segundos'] += $inicio->diffInSeconds($fin);
            }
            // Si cruzan horas diferentes
            else {
                $periodoHora = clone $inicio;
                $periodoHora->minute(0)->second(0);

                // Para cada hora entre inicio y fin
                while ($periodoHora->format('YmdH') <= $fin->format('YmdH')) {
                    $hora = $periodoHora->format('H');

                    // Para la primera hora (puede ser parcial)
                    if ($periodoHora->format('YmdH') === $inicio->format('YmdH')) {
                        $finHora = (clone $periodoHora)->addHour();
                        $luzPorHora[$hora]['segundos'] += $inicio->diffInSeconds(min($finHora, $fin));
                    }
                    // Para la última hora (puede ser parcial)
                    elseif ($periodoHora->format('YmdH') === $fin->format('YmdH')) {
                        $luzPorHora[$hora]['segundos'] += $periodoHora->diffInSeconds($fin);
                    }
                    // Para horas completas en medio
                    elseif ($periodoHora > $inicio && $periodoHora->addHour() < $fin) {
                        $luzPorHora[$hora]['segundos'] += 3600; // 1 hora completa
                    }

                    $periodoHora->addHour();
                }
            }
        }

        // Finalizar cálculos y formatear datos por hora
        $luzPorHoraFormateada = [];
        foreach ($luzPorHora as $hora => $datos) {
            // Calcular promedio si hay lecturas
            if ($datos['lecturas'] > 0) {
                $datos['promedio_lux'] = round($datos['promedio_lux'] / $datos['lecturas'], 2);
            }

            $minutos = round($datos['segundos'] / 60, 1);
            $porcentaje = round(($datos['segundos'] / 3600) * 100, 1);

            $luzPorHoraFormateada[] = [
                'hora' => $hora,
                'minutos_luz' => $minutos,
                'porcentaje_luz' => $porcentaje,
                'promedio_lux' => $datos['promedio_lux'],
                'total_lecturas' => $datos['lecturas'],
                'lecturas_con_luz' => $datos['lecturas_con_luz'],
                'porcentaje_lecturas_con_luz' => $datos['lecturas'] > 0
                    ? round(($datos['lecturas_con_luz'] / $datos['lecturas']) * 100, 1)
                    : 0
            ];
        }

        // 9. Preparar las medidas filtradas para visualización
        // Esto mantiene todas las lecturas, pero marca claramente los periodos de luz
        $medidasFiltradas = [];

        foreach ($lecturas as $lectura) {
            $valor = (float)$lectura->valor;
            $fechaLectura = Carbon::parse($lectura->fecha);
            $enPeriodoLuz = false;

            // Determinar si esta lectura está en un periodo de luz identificado
            foreach ($periodosLuz as $periodo) {
                $inicioPeriodo = Carbon::parse($periodo['inicio']);
                $finPeriodo = Carbon::parse($periodo['fin']);

                if ($fechaLectura >= $inicioPeriodo && $fechaLectura <= $finPeriodo) {
                    $enPeriodoLuz = true;
                    break;
                }
            }

            $medidasFiltradas[] = [
                'fecha' => $lectura->fecha,
                'valor' => $valor,
                'en_periodo_luz' => $enPeriodoLuz,
                'supera_umbral' => $valor >= $UMBRAL_LUZ
            ];
        }

        // 10. Preparar respuesta completa
        return response()->json([
            'dispositivo' => [
                'id' => $dispId,
                'numero_serie' => $serie
            ],
            'periodo' => [
                'fecha_inicio' => $fechaInicio,
                'fecha_fin' => $fechaFin,
                'duracion_total_segundos' => $duracionTotalSegundos
            ],
            'configuracion' => [
                'umbral_lux' => $UMBRAL_LUZ,
                'tiempo_gracia_minutos' => $TIEMPO_GRACIA_MINUTOS
            ],
            'resumen_luz' => [
                'tiempo_total_segundos' => $tiempoLuzTotal,
                'tiempo_formateado' => sprintf('%02d:%02d:%02d', $horasLuz, $minutosLuz, $segundosLuz),
                'porcentaje_luz' => $porcentajeLuz,
                'porcentaje_oscuridad' => $porcentajeOscuridad,
                'total_lecturas' => $totalLecturas,
                'lecturas_con_luz' => $totalConLuz,
                'promedio_lux' => round($valorPromedioLuz, 2),
                'maximo_lux' => round($valorMaximoLuz, 2),
                'minimo_lux' => round($valorMinimoLuz, 2)
            ],
            'periodos_luz' => $periodosLuz,
            'resumen_diario' => $resumenDiario,
            'luz_por_hora' => $luzPorHoraFormateada,
            'medidas_filtradas' => $medidasFiltradas
        ], Response::HTTP_OK);
    }
}
