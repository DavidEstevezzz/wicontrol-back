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
    $obtenerMargenes = function($edadDias) use ($usarMargenesPersonalizados) {
        if (!$usarMargenesPersonalizados) {
            // Usar margen fijo si no se quieren los personalizados
            return [
                'inferior' => 1.5,
                'superior' => 1.5
            ];
        }
        
        // Definir márgenes variables según la edad (en porcentajes)
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
    $cacheMargenes = [];
    
    // Función auxiliar para encontrar la referencia para una edad
    $obtenerReferenciaTemperatura = function($edadDias) use ($referenciasTemperatura, &$cacheReferencias) {
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
    
    // 5. Sensor de temperatura
    $SENSOR_TEMPERATURA = 6;
    
    // 6. Obtener todas las lecturas individuales para la tabla de alertas
    $todasLasLecturas = EntradaDato::where('id_dispositivo', $serie)
        ->where('id_sensor', $SENSOR_TEMPERATURA)
        ->whereBetween('fecha', [$fechaInicio, $fechaFin])
        ->orderBy('fecha')
        ->get(['valor', 'fecha']);
    
    // 7. Obtener datos diarios para la gráfica
    $datosDiarios = EntradaDato::where('id_dispositivo', $serie)
        ->where('id_sensor', $SENSOR_TEMPERATURA)
        ->whereBetween('fecha', [$fechaInicio, $fechaFin])
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
        // Calcular edad de la camada para ese día
        $edadDias = Carbon::parse($camada->fecha_hora_inicio)
            ->diffInDays(Carbon::parse($dato->dia));
        
        // Obtener temperatura de referencia
        $tempReferencia = $obtenerReferenciaTemperatura($edadDias);
        
        // Obtener márgenes para esta edad
        $margenes = $obtenerMargenes($edadDias);
        $margenInferior = $margenes['inferior'];
        $margenSuperior = $margenes['superior'];
        
        // Calcular rangos aceptables de temperatura
        $limiteInferior = $tempReferencia ? round($tempReferencia * (1 - $margenInferior/100), 2) : null;
        $limiteSuperior = $tempReferencia ? round($tempReferencia * (1 + $margenSuperior/100), 2) : null;
        
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
    
    // 9. Preparar datos para la tabla de alertas (lecturas fuera de rango)
    $alertas = [];
    $totalFueraDeRango = 0;
    
    foreach ($todasLasLecturas as $lectura) {
        $fechaLectura = Carbon::parse($lectura->fecha);
        $edadDias = Carbon::parse($camada->fecha_hora_inicio)->diffInDays($fechaLectura);
        
        // Obtener temperatura de referencia
        $tempReferencia = $obtenerReferenciaTemperatura($edadDias);
        
        // Si no hay referencia, no podemos comparar
        if ($tempReferencia === null) {
            continue;
        }
        
        // Obtener márgenes para esta edad
        $margenes = $obtenerMargenes($edadDias);
        $margenInferior = $margenes['inferior'];
        $margenSuperior = $margenes['superior'];
        
        // Calcular rangos aceptables
        $limiteInferior = round($tempReferencia * (1 - $margenInferior/100), 2);
        $limiteSuperior = round($tempReferencia * (1 + $margenSuperior/100), 2);
        
        $valorLectura = (float) $lectura->valor;
        
        // Verificar si está fuera del rango aceptable
        if ($valorLectura < $limiteInferior || $valorLectura > $limiteSuperior) {
            $tipo = $valorLectura < $limiteInferior ? 'baja' : 'alta';
            $desviacion = round($valorLectura - $tempReferencia, 2);
            $desviacionPorcentaje = round(($desviacion / $tempReferencia) * 100, 2);
            
            $alertas[] = [
                'fecha' => $fechaLectura->format('Y-m-d'),
                'hora' => $fechaLectura->format('H:i:s'),
                'temperatura_medida' => $valorLectura,
                'temperatura_referencia' => $tempReferencia,
                'limite_inferior' => $limiteInferior,
                'limite_superior' => $limiteSuperior,
                'desviacion' => $desviacion,
                'desviacion_porcentaje' => $desviacionPorcentaje,
                'tipo' => $tipo,
                'edad_dias' => $edadDias,
                'margen_edad' => [
                    'inferior' => "{$margenInferior}%",
                    'superior' => "{$margenSuperior}%"
                ]
            ];
            $totalFueraDeRango++;
        }
    }
    
    // 10. Calcular temperatura media global para el periodo
    $temperaturaMediaGlobal = $todasLasLecturas->avg('valor');
    $totalLecturas = $todasLasLecturas->count();
    $porcentajeFueraDeRango = $totalLecturas > 0 ? 
        round(($totalFueraDeRango / $totalLecturas) * 100, 2) : 0;
    
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
        'datos_grafica' => $datosGrafica,
        'alertas' => $alertas
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
    $obtenerRangosHumedad = function($edadDias) {
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
    
    // 5. Obtener todas las lecturas individuales para la tabla de alertas
    $todasLasLecturas = EntradaDato::where('id_dispositivo', $serie)
        ->where('id_sensor', $SENSOR_HUMEDAD)
        ->whereBetween('fecha', [$fechaInicio, $fechaFin])
        ->orderBy('fecha')
        ->get(['valor', 'fecha']);
    
    // 6. Obtener datos diarios para la gráfica
    $datosDiarios = EntradaDato::where('id_dispositivo', $serie)
        ->where('id_sensor', $SENSOR_HUMEDAD)
        ->whereBetween('fecha', [$fechaInicio, $fechaFin])
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
        // Calcular edad de la camada para ese día
        $edadDias = Carbon::parse($camada->fecha_hora_inicio)
            ->diffInDays(Carbon::parse($dato->dia));
        
        // Obtener rangos de humedad para esta edad
        $rangos = $obtenerRangosHumedad($edadDias);
        $humedadMin = $rangos['min'];
        $humedadMax = $rangos['max'];
        
        $humedadReferencia = ($humedadMin + $humedadMax) / 2; // Punto medio del rango como referencia
        
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
    
    // 8. Preparar datos para la tabla de alertas (lecturas fuera de rango)
    $alertas = [];
    $totalFueraDeRango = 0;
    
    foreach ($todasLasLecturas as $lectura) {
        $fechaLectura = Carbon::parse($lectura->fecha);
        $edadDias = Carbon::parse($camada->fecha_hora_inicio)->diffInDays($fechaLectura);
        
        // Obtener rangos de humedad para esta edad
        $rangos = $obtenerRangosHumedad($edadDias);
        $humedadMin = $rangos['min'];
        $humedadMax = $rangos['max'];
        $humedadReferencia = ($humedadMin + $humedadMax) / 2;
        
        $valorLectura = (float) $lectura->valor;
        
        // Verificar si está fuera del rango aceptable
        if ($valorLectura < $humedadMin || $valorLectura > $humedadMax) {
            $tipo = $valorLectura < $humedadMin ? 'baja' : 'alta';
            $desviacion = round($valorLectura - $humedadReferencia, 2);
            $desviacionPorcentaje = round(($desviacion / $humedadReferencia) * 100, 2);
            
            $alertas[] = [
                'fecha' => $fechaLectura->format('Y-m-d'),
                'hora' => $fechaLectura->format('H:i:s'),
                'humedad_medida' => $valorLectura,
                'humedad_referencia' => $humedadReferencia,
                'limite_inferior' => $humedadMin,
                'limite_superior' => $humedadMax,
                'desviacion' => $desviacion,
                'desviacion_porcentaje' => $desviacionPorcentaje,
                'tipo' => $tipo,
                'edad_dias' => $edadDias,
                'rango_edad' => $edadDias <= 3 ? '0-3 días' : ($edadDias <= 14 ? '4-14 días' : '15+ días')
            ];
            $totalFueraDeRango++;
        }
    }
    
    // 9. Calcular humedad media global para el periodo
    $humedadMediaGlobal = $todasLasLecturas->avg('valor');
    $totalLecturas = $todasLasLecturas->count();
    $porcentajeFueraDeRango = $totalLecturas > 0 ? 
        round(($totalFueraDeRango / $totalLecturas) * 100, 2) : 0;
    
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
        'datos_grafica' => $datosGrafica,
        'alertas' => $alertas
    ], Response::HTTP_OK);
}
}
