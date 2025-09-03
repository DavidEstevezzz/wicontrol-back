<?php
// app/Http/Controllers/CamadaController.php

namespace App\Http\Controllers;

use App\Models\Camada;
use App\Models\Granja;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
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
 * Obtiene dispositivos disponibles para vincular a una camada de una granja específica
 * (dispositivos que no tienen vinculación activa)
 * 
 * @param string $codigoGranja
 * @return JsonResponse
 */
public function getDispositivosDisponiblesByGranja(string $codigoGranja): JsonResponse
{
    // Validar que la granja existe
    $granja = Granja::where('numero_rega', $codigoGranja)->first();
    if (!$granja) {
        return response()->json([
            'message' => 'Granja no encontrada'
        ], Response::HTTP_NOT_FOUND);
    }

    // Obtener todos los dispositivos de la granja usando la relación correcta:
    // Dispositivo -> Instalacion -> Granja
    $todosDispositivos = Dispositivo::join('tb_instalacion', 'tb_dispositivo.id_instalacion', '=', 'tb_instalacion.id_instalacion')
        ->where('tb_instalacion.numero_rega', $codigoGranja)
        ->select([
            'tb_dispositivo.id_dispositivo',
            'tb_dispositivo.numero_serie',
            'tb_dispositivo.ip_address'
        ])
        ->get();

    // Obtener dispositivos que tienen vinculación activa (fecha_vinculacion SIN fecha_desvinculacion)
    $dispositivosOcupados = DB::table('tb_relacion_camada_dispositivo')
        ->whereNull('fecha_desvinculacion')
        ->pluck('id_dispositivo')
        ->toArray();

    // Filtrar dispositivos disponibles (los que NO están en la lista de ocupados)
    $dispositivosDisponibles = $todosDispositivos->filter(function ($dispositivo) use ($dispositivosOcupados) {
        return !in_array($dispositivo->id_dispositivo, $dispositivosOcupados);
    })->values();

    return response()->json([
        'total' => $dispositivosDisponibles->count(),
        'dispositivos' => $dispositivosDisponibles
    ], Response::HTTP_OK);
}

/**
 * Obtiene dispositivos vinculados activamente a una camada específica
 * (tienen fecha_vinculacion pero NO fecha_desvinculacion)
 * 
 * @param int $camadaId
 * @return JsonResponse
 */
public function getDispositivosVinculadosByCamada(int $camadaId): JsonResponse
{
    $camada = Camada::findOrFail($camadaId);

    $dispositivos = Dispositivo::join('tb_relacion_camada_dispositivo', 'tb_dispositivo.id_dispositivo', '=', 'tb_relacion_camada_dispositivo.id_dispositivo')
        ->where('tb_relacion_camada_dispositivo.id_camada', $camadaId)
        ->whereNull('tb_relacion_camada_dispositivo.fecha_desvinculacion') // Solo activos
        ->select([
            'tb_dispositivo.id_dispositivo',
            'tb_dispositivo.numero_serie',
            'tb_dispositivo.ip_address',
            'tb_relacion_camada_dispositivo.fecha_vinculacion'
        ])
        ->get();

    return response()->json([
        'total' => $dispositivos->count(),
        'dispositivos' => $dispositivos
    ], Response::HTTP_OK);
}

/**
 * Vincula un dispositivo a una camada usando la tabla de relación
 * 
 * @param int $camadaId
 * @param int $dispId
 * @return JsonResponse
 */
public function attachDispositivo(int $camadaId, int $dispId): JsonResponse
{
    $camada = Camada::findOrFail($camadaId);
    $dispositivo = Dispositivo::findOrFail($dispId);

    // Verificar si ya existe una vinculación activa
    $vinculacionActiva = DB::table('tb_relacion_camada_dispositivo')
        ->where('id_camada', $camadaId)
        ->where('id_dispositivo', $dispId)
        ->whereNull('fecha_desvinculacion')
        ->first();

    if ($vinculacionActiva) {
        return response()->json([
            'message' => 'El dispositivo ya está vinculado activamente a esta camada.'
        ], Response::HTTP_CONFLICT);
    }

    // Verificar si el dispositivo está ocupado por otra camada
    $dispositivoOcupado = DB::table('tb_relacion_camada_dispositivo')
        ->where('id_dispositivo', $dispId)
        ->whereNull('fecha_desvinculacion')
        ->first();

    if ($dispositivoOcupado) {
        return response()->json([
            'message' => 'El dispositivo está actualmente vinculado a otra camada.',
            'camada_ocupante' => $dispositivoOcupado->id_camada
        ], Response::HTTP_CONFLICT);
    }

    // Crear nueva vinculación
    DB::table('tb_relacion_camada_dispositivo')->insert([
        'id_camada' => $camadaId,
        'id_dispositivo' => $dispId,
        'fecha_vinculacion' => now(),
        'fecha_desvinculacion' => null
    ]);

    return response()->json([
        'message' => "Dispositivo {$dispId} vinculado exitosamente a camada {$camadaId}.",
        'vinculacion' => [
            'id_camada' => $camadaId,
            'id_dispositivo' => $dispId,
            'fecha_vinculacion' => now()
        ]
    ], Response::HTTP_CREATED);
}

/**
 * Desvincula un dispositivo de una camada estableciendo fecha_desvinculacion
 * 
 * @param int $camadaId
 * @param int $dispId
 * @return JsonResponse
 */
public function detachDispositivo(int $camadaId, int $dispId): JsonResponse
{
    $camada = Camada::findOrFail($camadaId);
    $dispositivo = Dispositivo::findOrFail($dispId);

    // Buscar vinculación activa
    $vinculacion = DB::table('tb_relacion_camada_dispositivo')
        ->where('id_camada', $camadaId)
        ->where('id_dispositivo', $dispId)
        ->whereNull('fecha_desvinculacion')
        ->first();

    if (!$vinculacion) {
        return response()->json([
            'message' => 'No existe una vinculación activa entre este dispositivo y la camada.'
        ], Response::HTTP_NOT_FOUND);
    }

    // Establecer fecha de desvinculación
    DB::table('tb_relacion_camada_dispositivo')
        ->where('id_camada', $camadaId)
        ->where('id_dispositivo', $dispId)
        ->whereNull('fecha_desvinculacion')
        ->update([
            'fecha_desvinculacion' => now()
        ]);

    return response()->json([
        'message' => "Dispositivo {$dispId} desvinculado exitosamente de camada {$camadaId}.",
        'desvinculacion' => [
            'id_camada' => $camadaId,
            'id_dispositivo' => $dispId,
            'fecha_desvinculacion' => now()
        ]
    ], Response::HTTP_OK);
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
        return $this->getPesoReferenciaOptimizado([
            'tipo_ave' => $camada->tipo_ave,          // ✅ AÑADIR
            'tipo_estirpe' => $camada->tipo_estirpe,
            'sexaje' => $camada->sexaje
        ], $edadDias);
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
     * Función auxiliar para agrupar pesadas consecutivas en un margen de 10 segundos
     * VERSIÓN CORREGIDA Y OPTIMIZADA - SIN LOGS PARA PRODUCCIÓN
     */
    private function agruparPesadasConsecutivas(Collection $lecturas, int $margenSegundos = 10): Collection
    {
        if ($lecturas->isEmpty()) {
            return collect();
        }

        // ✅ ORDENAMIENTO OPTIMIZADO - Crear timestamps una sola vez
        $lecturasConTimestamp = $lecturas->map(function ($lectura) {
            $timestamp = Carbon::parse($lectura->fecha)->timestamp;
            return (object) [
                'id_dispositivo' => $lectura->id_dispositivo,
                'valor' => (float)$lectura->valor,
                'fecha' => $lectura->fecha,
                'timestamp' => $timestamp
            ];
        });

        // Ordenar por timestamp
        $lecturasOrdenadas = $lecturasConTimestamp->sortBy('timestamp')->values();

        $grupos = collect();
        $grupoActual = collect();

        foreach ($lecturasOrdenadas as $lectura) {
            // Si el grupo está vacío, iniciar nuevo grupo
            if ($grupoActual->isEmpty()) {
                $grupoActual = collect([$lectura]);
            } else {
                // Comparar con la ÚLTIMA lectura del grupo actual
                $ultimaLectura = $grupoActual->last();
                $diferencia = $lectura->timestamp - $ultimaLectura->timestamp;

                // Solo agrupar si está dentro del margen y es cronológicamente posterior
                if ($diferencia >= 0 && $diferencia <= $margenSegundos) {
                    $grupoActual->push($lectura);
                } else {
                    // Finalizar grupo actual y crear el resultado
                    $grupos->push($this->crearLecturaPromedio($grupoActual));
                    $grupoActual = collect([$lectura]);
                }
            }
        }

        // Procesar el último grupo
        if ($grupoActual->isNotEmpty()) {
            $grupos->push($this->crearLecturaPromedio($grupoActual));
        }

        return $grupos;
    }

    /**
     * Crea una lectura promedio a partir de un grupo de lecturas consecutivas
     * VERSIÓN CORREGIDA - CREA OBJETOS NUEVOS
     */
    private function crearLecturaPromedio(Collection $grupo): object
    {
        if ($grupo->count() === 1) {
            $lectura = $grupo->first();
            return (object) [
                'id_dispositivo' => $lectura->id_dispositivo,
                'valor' => $lectura->valor,
                'fecha' => $lectura->fecha,
                'lecturas_agrupadas' => 1
            ];
        }

        // Calcular promedios
        $valores = $grupo->pluck('valor')->toArray();
        $timestamps = $grupo->pluck('timestamp')->toArray();

        $valorPromedio = array_sum($valores) / count($valores);
        $timestampPromedio = array_sum($timestamps) / count($timestamps);

        // ✅ CREAR OBJETO NUEVO en lugar de clonar
        $primeraLectura = $grupo->first();

        return (object) [
            'id_dispositivo' => $primeraLectura->id_dispositivo,
            'valor' => round($valorPromedio, 2),
            'fecha' => Carbon::createFromTimestamp($timestampPromedio)->format('Y-m-d H:i:s'),
            'lecturas_agrupadas' => $grupo->count()
        ];
    }

    /**
     * Versión optimizada de calcularPesadasPorDia con agrupación corregida
     * Ahora incluye cálculo del coeficiente de variación y ajuste de descarte para broilers mixtos
     */
    public function calcularPesadasPorDia(Request $request, $camada): JsonResponse
    {
        // 1. Parámetros
        $fecha = $request->query('fecha');
        $coefHomogeneidad = $request->has('coefHomogeneidad')
            ? (float)$request->query('coefHomogeneidad')
            : null;

        $porcentajeDescarte = $request->has('porcentajeDescarte')
            ? (float)$request->query('porcentajeDescarte') / 100  // Convertir de % a decimal
            : 0.20; // 20% por defecto

        // 2. CONSULTA MASIVA ORDENADA
        $resultados = DB::select("
        SELECT 
            c.id_camada, 
            c.fecha_hora_inicio, 
            c.sexaje, 
            c.tipo_estirpe,
            c.tipo_ave,
            ed.id_dispositivo, 
            ed.valor, 
            ed.fecha
        FROM tb_camada c
        JOIN tb_relacion_camada_dispositivo rcd ON c.id_camada = rcd.id_camada
        JOIN tb_dispositivo d ON rcd.id_dispositivo = d.id_dispositivo
        LEFT JOIN tb_entrada_dato ed ON d.numero_serie = ed.id_dispositivo 
            AND DATE(ed.fecha) = ? 
            AND ed.id_sensor = 2
        WHERE c.id_camada = ?
        ORDER BY ed.id_dispositivo ASC, ed.fecha ASC
    ", [$fecha, $camada]);

        if (empty($resultados)) {
            return response()->json(['message' => 'Camada no encontrada'], 404);
        }

        // 3. Extraer datos de camada del primer resultado
        $primerResultado = $resultados[0];
        $camadaData = [
            'id_camada' => $primerResultado->id_camada,
            'fecha_hora_inicio' => Carbon::parse($primerResultado->fecha_hora_inicio),
            'sexaje' => $primerResultado->sexaje,
            'tipo_estirpe' => $primerResultado->tipo_estirpe,
            'tipo_ave' => $primerResultado->tipo_ave ?? ''
        ];

        // 4. Filtrar solo resultados con lecturas válidas
        $lecturasOriginales = collect($resultados)->filter(fn($r) => $r->valor !== null);

        if ($lecturasOriginales->isEmpty()) {
            return response()->json([
                'total_pesadas' => 0,
                'aceptadas' => 0,
                'rechazadas_homogeneidad' => 0,
                'peso_medio_global' => 0,
                'peso_medio_aceptadas' => 0,
                'coef_variacion' => 0,
                'tramo_aceptado' => ['min' => null, 'max' => null],
                'listado_pesos' => [],
                'info_agrupacion' => [
                    'lecturas_originales' => 0,
                    'lecturas_agrupadas' => 0,
                    'reduccion' => 0,
                    'porcentaje_reduccion' => 0
                ]
            ], Response::HTTP_OK);
        }

        // 5. ✅ APLICAR AGRUPACIÓN POR DISPOSITIVO (COMENTADO - SIN AGRUPACIÓN)
        // $lecturasPorDispositivo = $lecturasOriginales->groupBy('id_dispositivo');
        // $lecturasAgrupadas = collect();
        // foreach ($lecturasPorDispositivo as $dispositivo => $lecturas) {
        //     $lecturasAgrupadasDispositivo = $this->agruparPesadasConsecutivas($lecturas);
        //     $lecturasAgrupadas = $lecturasAgrupadas->merge($lecturasAgrupadasDispositivo);
        // }

        $lecturasAgrupadas = $lecturasOriginales;

        // 6. Calcular edad y peso de referencia
        $edadDias = $camadaData['fecha_hora_inicio']->diffInDays($fecha);
        $pesoRef = $this->getPesoReferenciaOptimizado([
            'tipo_ave' => $camadaData['tipo_ave'] ?? '',
            'tipo_estirpe' => $camadaData['tipo_estirpe'] ?? '',
            'sexaje' => $camadaData['sexaje'] ?? ''
        ], $edadDias);

        // ✅ NUEVO: Ajustar porcentaje de descarte para broilers mixtos según edad
        $porcentajesAjustados = $this->ajustarPorcentajeDescarte(
            $porcentajeDescarte,
            $edadDias,
            $camadaData['tipo_ave'] ?? '',
            $camadaData['sexaje'] ?? ''
        );

        // 7. Procesar lecturas agrupadas
        $consideradas = [];
        $sumaConsideradas = 0;
        $conteoConsideradas = 0;

        // Primera pasada: filtrar por ±% ajustado y calcular media global
        foreach ($lecturasAgrupadas as $lectura) {
            $v = (float)$lectura->valor;
            $diferenciaPorcentual = $pesoRef > 0 ? abs($v - $pesoRef) / $pesoRef : 0;

            // ✅ USAR PORCENTAJES AJUSTADOS: determinar si está dentro del rango
            $dentroDeLimiteInferior = $pesoRef > 0 && (($pesoRef - $v) / $pesoRef) <= $porcentajesAjustados['inferior'];
            $dentroDeLimiteSuperior = $pesoRef > 0 && (($v - $pesoRef) / $pesoRef) <= $porcentajesAjustados['superior'];
            $esConsiderada = $dentroDeLimiteInferior && $dentroDeLimiteSuperior;

            Log::info("Análisis lectura", [
                'valor' => $v . 'g',
                'peso_ref' => $pesoRef . 'g',
                'limite_inferior_ajustado' => round($porcentajesAjustados['inferior'] * 100, 1) . '%',
                'limite_superior_ajustado' => round($porcentajesAjustados['superior'] * 100, 1) . '%',
                'dentro_limite_inferior' => $dentroDeLimiteInferior ? 'SÍ' : 'NO',
                'dentro_limite_superior' => $dentroDeLimiteSuperior ? 'SÍ' : 'NO',
                'considerada' => $esConsiderada ? 'SÍ' : 'NO'
            ]);

            if ($esConsiderada) {
                $consideradas[] = [
                    'id_dispositivo' => $lectura->id_dispositivo,
                    'valor' => $v,
                    'fecha' => $lectura->fecha,
                    'lecturas_agrupadas' => $lectura->lecturas_agrupadas ?? 1
                ];
                $sumaConsideradas += $v;
                $conteoConsideradas++;
            }
        }

        $mediaGlobal = $conteoConsideradas > 0 ? round($sumaConsideradas / $conteoConsideradas, 2) : 0;

        // 8. Calcular tramo de aceptación
        $tramoMin = $tramoMax = null;
        if (!is_null($coefHomogeneidad) && $mediaGlobal > 0) {
            $tramoMin = round($mediaGlobal * (1 - $coefHomogeneidad), 2);
            $tramoMax = round($mediaGlobal * (1 + $coefHomogeneidad), 2);
        }

        // 9. Segunda pasada: aplicar coeficiente y clasificar
        $aceptadas = 0;
        $rechazadas = 0;
        $sumaAceptadas = 0;
        $listado = [];
        $valoresAceptados = []; // ✅ NUEVO: Para calcular coeficiente de variación

        foreach ($consideradas as $lectura) {
            $v = $lectura['valor'];

            if (is_null($coefHomogeneidad)) {
                $estado = 'aceptada';
                $aceptadas++;
                $sumaAceptadas += $v;
                $valoresAceptados[] = $v; // ✅ NUEVO
            } else {
                $diffGlobal = $mediaGlobal > 0 ? abs($v - $mediaGlobal) / $mediaGlobal : 0;
                if ($diffGlobal <= $coefHomogeneidad) {
                    $estado = 'aceptada';
                    $aceptadas++;
                    $sumaAceptadas += $v;
                    $valoresAceptados[] = $v; // ✅ NUEVO
                } else {
                    $estado = 'rechazada';
                    $rechazadas++;
                }
            }

            $listado[] = [
                'id_dispositivo' => $lectura['id_dispositivo'],
                'valor' => $v,
                'fecha' => $lectura['fecha'],
                'estado' => $estado,
                'lecturas_agrupadas' => $lectura['lecturas_agrupadas'],
            ];
        }

        // 10. Agregar lecturas descartadas al listado
        foreach ($lecturasAgrupadas as $lectura) {
            $v = (float)$lectura->valor;

            // ✅ USAR PORCENTAJES AJUSTADOS para determinar si fue descartada
            $dentroDeLimiteInferior = $pesoRef > 0 && (($pesoRef - $v) / $pesoRef) <= $porcentajesAjustados['inferior'];
            $dentroDeLimiteSuperior = $pesoRef > 0 && (($v - $pesoRef) / $pesoRef) <= $porcentajesAjustados['superior'];
            $fueDescartada = !($dentroDeLimiteInferior && $dentroDeLimiteSuperior);

            if ($fueDescartada) {
                $listado[] = [
                    'id_dispositivo' => $lectura->id_dispositivo,
                    'valor' => $v,
                    'fecha' => $lectura->fecha,
                    'estado' => 'descartado',
                    'lecturas_agrupadas' => $lectura->lecturas_agrupadas ?? 1,
                ];
            }
        }

        // 11. Calcular peso medio de aceptadas
        $pesoMedioAceptadas = $aceptadas > 0 ? round($sumaAceptadas / $aceptadas, 2) : 0;

        // 12. ✅ NUEVO: Calcular coeficiente de variación
        $coefVariacion = 0;
        if (count($valoresAceptados) > 1 && $pesoMedioAceptadas > 0) {
            // Calcular desviación estándar
            $sumaCuadrados = 0;
            foreach ($valoresAceptados as $valor) {
                $sumaCuadrados += pow($valor - $pesoMedioAceptadas, 2);
            }
            $varianza = $sumaCuadrados / count($valoresAceptados);
            $desviacionEstandar = sqrt($varianza);

            // Coeficiente de variación = (desviación estándar / media) * 100
            $coefVariacion = round(($desviacionEstandar / $pesoMedioAceptadas) * 100, 2);
        }

        // 13. Respuesta final con información sobre agrupación
        return response()->json([
            'total_pesadas' => $conteoConsideradas,
            'aceptadas' => $aceptadas,
            'rechazadas_homogeneidad' => $rechazadas,
            'peso_medio_global' => $mediaGlobal,
            'peso_medio_aceptadas' => $pesoMedioAceptadas,
            'coef_variacion' => $coefVariacion, // ✅ NUEVO CAMPO
            'tramo_aceptado' => ['min' => $tramoMin, 'max' => $tramoMax],
            'listado_pesos' => $listado,
            'peso_referencia' => [
                'valor' => $pesoRef,
                'edad_dias' => $edadDias,
                'sexaje' => $camadaData['sexaje'] ?? '',
                'tipo_ave' => $camadaData['tipo_ave'] ?? '',
                'tipo_estirpe' => $camadaData['tipo_estirpe'] ?? '',
                'tabla_usada' => $this->getTablaUsada($camadaData), // método auxiliar
                'porcentajes_descarte' => [
                    'original' => round($porcentajeDescarte * 100, 1) . '%',
                    'inferior_ajustado' => round($porcentajesAjustados['inferior'] * 100, 1) . '%',
                    'superior_ajustado' => round($porcentajesAjustados['superior'] * 100, 1) . '%',
                    'ajuste_aplicado' => ($camadaData['tipo_ave'] ?? '') === 'broilers' &&
                        ($camadaData['sexaje'] ?? '') === 'mixto'
                ]
            ],
            'info_agrupacion' => [
                'lecturas_originales' => $lecturasOriginales->count(),
                'lecturas_agrupadas' => $lecturasAgrupadas->count(),
                'reduccion' => $lecturasOriginales->count() - $lecturasAgrupadas->count(),
                'porcentaje_reduccion' => $lecturasOriginales->count() > 0
                    ? round((($lecturasOriginales->count() - $lecturasAgrupadas->count()) / $lecturasOriginales->count()) * 100, 2)
                    : 0
            ]
        ], Response::HTTP_OK);
    }

    private function getTablaUsada(array $camadaData): string
    {
        $tipoAve = strtolower(trim($camadaData['tipo_ave'] ?? ''));
        $tipoEstirpe = strtolower(trim($camadaData['tipo_estirpe'] ?? ''));

        if ($tipoAve === 'recrias' && $tipoEstirpe === 'ross') {
            return 'tb_peso_reproductores_ross';
        } elseif ($tipoAve === 'reproductores' && $tipoEstirpe === 'ross') {
            return 'tb_peso_reproductores_ross';
        } elseif ($tipoAve === 'broilers' && $tipoEstirpe === 'ross') {
            return 'tb_peso_ross';
        } else {
            return "tb_peso_{$tipoEstirpe}";
        }
    }

    /**
     * Ajusta el porcentaje de descarte para broilers mixtos según la edad
     * 
     * @param float $porcentajeDescarte Porcentaje base de descarte (en decimal, ej: 0.20 para 20%)
     * @param int $edadDias Edad de la camada en días
     * @param string $tipoAve Tipo de ave
     * @param string $sexaje Sexaje de la camada
     * @return array ['inferior' => float, 'superior' => float] Porcentajes ajustados en decimal
     */
    private function ajustarPorcentajeDescarte(float $porcentajeDescarte, int $edadDias, string $tipoAve, string $sexaje): array
    {
        // Normalizar valores para comparación
        $tipoAve = strtolower(trim($tipoAve ?? ''));
        $sexaje = strtolower(trim($sexaje ?? ''));

        // Solo aplicar ajuste para broilers mixtos
        if ($tipoAve !== 'broilers' || $sexaje !== 'mixto') {
            return [
                'inferior' => $porcentajeDescarte,
                'superior' => $porcentajeDescarte
            ];
        }

        // Tabla de ajustes según edad para broilers mixtos
        $ajustesPorEdad = [
            ['min' => 0,  'max' => 7,  'menos' => 0, 'mas' => 0],
            ['min' => 8,  'max' => 14, 'menos' => 1, 'mas' => 1],
            ['min' => 15, 'max' => 21, 'menos' => 2, 'mas' => 3],
            ['min' => 22, 'max' => 28, 'menos' => 3, 'mas' => 5],
            ['min' => 29, 'max' => 35, 'menos' => 4, 'mas' => 7],
            ['min' => 36, 'max' => 42, 'menos' => 5, 'mas' => 9],
            ['min' => 43, 'max' => 49, 'menos' => 6, 'mas' => 10],
            ['min' => 50, 'max' => 56, 'menos' => 7, 'mas' => 11],
        ];

        // Buscar el rango de edad correspondiente
        $ajuste = null;
        foreach ($ajustesPorEdad as $rango) {
            if ($edadDias >= $rango['min'] && $edadDias <= $rango['max']) {
                $ajuste = $rango;
                break;
            }
        }

        // Si no encuentra rango específico, usar el último (para edades > 56)
        if ($ajuste === null && $edadDias > 56) {
            $ajuste = ['menos' => 7, 'mas' => 11];
        }

        // Si no hay ajuste, usar porcentaje original
        if ($ajuste === null) {
            return [
                'inferior' => $porcentajeDescarte,
                'superior' => $porcentajeDescarte
            ];
        }

        // Convertir porcentaje base a porcentaje (ej: 0.20 -> 20)
        $porcentajeBase = $porcentajeDescarte * 100;

        // Calcular porcentajes ajustados
        $porcentajeInferior = $porcentajeDescarte;
        $porcentajeSuperior = ($porcentajeBase + $ajuste['mas']) / 100;

        Log::info("Ajuste descarte broilers mixtos", [
            'edad_dias' => $edadDias,
            'porcentaje_original' => $porcentajeBase . '%',
            'ajuste_menos' => $ajuste['menos'] . '%',
            'ajuste_mas' => $ajuste['mas'] . '%',
            'porcentaje_inferior_final' => ($porcentajeInferior * 100) . '%',
            'porcentaje_superior_final' => ($porcentajeSuperior * 100) . '%'
        ]);

        return [
            'inferior' => $porcentajeInferior,
            'superior' => $porcentajeSuperior
        ];
    }

    private function getPesoReferenciaOptimizado(array $camadaData, int $edadDias): float
    {
        // ✅ NUEVA LÓGICA: Considerar tanto tipo_ave como tipo_estirpe
        $tipoAve = strtolower(trim($camadaData['tipo_ave'] ?? ''));
        $tipoEstirpe = strtolower(trim($camadaData['tipo_estirpe'] ?? ''));

        Log::info("Obteniendo peso referencia para tipo_ave: {$tipoAve}, tipo_estirpe: {$tipoEstirpe}, edad_dias: {$edadDias}");
        if (empty($tipoEstirpe)) {
            $tipoEstirpe = 'ross';
        }

        // ✅ DETERMINAR LA TABLA CORRECTA según tipo_ave + tipo_estirpe
        $tabla = null;

        // Casos específicos para diferentes combinaciones
        if ($tipoAve === 'recrias' && $tipoEstirpe === 'ross') {
            $tabla = 'tb_peso_reproductores_ross';  // ✅ RECRIAS → REPRODUCTORES
        } elseif ($tipoAve === 'reproductores' && $tipoEstirpe === 'ross') {
            $tabla = 'tb_peso_reproductores_ross';
        } elseif ($tipoAve === 'broilers' && $tipoEstirpe === 'ross') {
            $tabla = 'tb_peso_ross';  // Mantener para broilers
        } elseif ($tipoAve === 'pavos' && $tipoEstirpe === 'butpremium') {
            $tabla = 'tb_peso_pavos_butpremium';
        } elseif ($tipoAve === 'pavos' && $tipoEstirpe === 'hybridconverter') {
            $tabla = 'tb_peso_pavos_hybridconverter';
        } elseif ($tipoAve === 'pavos' && $tipoEstirpe === 'nicholasselect') {
            $tabla = 'tb_peso_pavos_nicholasselect';
        } else {
            // Fallback: intentar construir el nombre dinámicamente
            if (!empty($tipoAve) && $tipoAve !== 'broilers') {
                $tabla = "tb_peso_{$tipoAve}_{$tipoEstirpe}";
            } else {
                $tabla = 'tb_peso_' . $tipoEstirpe;  // Comportamiento original
            }
        }

        $sexaje = strtolower(trim($camadaData['sexaje'] ?? 'mixto'));

        if ($tabla !== 'tb_peso_ross') {
            $columna = match ($sexaje) {
                'macho', 'machos' => 'macho',      // ✅ CORREGIDO: 'macho' no 'Machos'
                'hembra', 'hembras' => 'hembra',   // ✅ CORREGIDO: 'hembra' no 'Hembras'  
                default => 'macho'  // ✅ Default a macho para reproductores (no hay mixto)
            };
        } else {
            $columna = match ($sexaje) {
                'macho', 'machos' => 'Machos',
                'hembra', 'hembras' => 'Hembras',
                default => 'Mixto'  // ✅ Broilers pueden ser mixtos
            };
        }

        // Caché más específico incluyendo tipo_ave
        $cacheKey = "peso_ref_opt_{$tabla}_{$columna}_{$edadDias}";

        return (float) Cache::remember($cacheKey, 7200, function () use ($tabla, $columna, $edadDias, $tipoAve, $tipoEstirpe) {
            try {
                // ✅ LOG PARA DEBUG
                Log::info("Consultando tabla: {$tabla}, columna: {$columna}, edad: {$edadDias}");

                $result = DB::select("SELECT {$columna} FROM {$tabla} WHERE edad = ? LIMIT 1", [$edadDias]);
                if (!empty($result)) {
                    $peso = $result[0]->$columna ?? 0;
                    Log::info("Peso encontrado: {$peso}g desde {$tabla}");
                    return $peso;
                }
                return 0;
            } catch (\Exception $e) {
                Log::warning("Error peso referencia optimizado para {$tabla}: {$e->getMessage()}");

                // ✅ FALLBACK INTELIGENTE según el tipo
                try {
                    $fallbackTable = null;
                    if ($tipoAve === 'recrias' || $tipoAve === 'reproductores') {
                        $fallbackTable = 'tb_peso_reproductores_ross';
                    } elseif ($tipoAve === 'broilers' || empty($tipoAve)) {
                        $fallbackTable = 'tb_peso_ross';
                    } else {
                        $fallbackTable = 'tb_peso_ross';  // Último fallback
                    }

                    Log::info("Usando fallback table: {$fallbackTable}");
                    $result = DB::select("SELECT {$columna} FROM {$fallbackTable} WHERE edad = ? LIMIT 1", [$edadDias]);
                    return !empty($result) ? $result[0]->$columna ?? 0 : 0;
                } catch (\Exception $e2) {
                    Log::error("Error en fallback: {$e2->getMessage()}");
                    return 0;
                }
            }
        });
    }

    /**
     * Calcula el peso medio de un dispositivo en un rango de días
     * Incluye ajuste automático de descarte para broilers mixtos según edad
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
            'porcentajeDescarte' => 'nullable|numeric|min:0|max:100',
        ]);

        $fechaInicio = $request->query('fecha_inicio');
        $fechaFin = $request->query('fecha_fin');
        $coef = $request->has('coefHomogeneidad')
            ? (float)$request->query('coefHomogeneidad')
            : null;

        $porcentajeDescarte = $request->has('porcentajeDescarte')
            ? (float)$request->query('porcentajeDescarte') / 100
            : 0.20;

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
        $detalleAjustesPorDia = []; // ✅ NUEVO: Para mostrar ajustes aplicados cada día

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

            // ✅ NUEVO: Ajustar porcentaje de descarte para broilers mixtos según edad
            $porcentajesAjustados = $this->ajustarPorcentajeDescarte(
                $porcentajeDescarte,
                $edadDias,
                $camada->tipo_ave ?? '',
                $camada->sexaje ?? ''
            );

            // 7. Lecturas del dispositivo ese día (usar número de serie)
            // Importante: Asegurarse de que no hay ambigüedad en esta consulta
            $lecturas = EntradaDato::where('id_dispositivo', $serie)
                ->whereDate('fecha', $fecha)
                ->where('id_sensor', 2)
                ->get()
                ->map(fn($e) => (float)$e->valor);

            // ✅ USAR PORCENTAJES AJUSTADOS
            $consideradas = $lecturas
                ->filter(function ($v) use ($pesoRef, $porcentajesAjustados) {
                    if ($pesoRef <= 0) return false;

                    $dentroDeLimiteInferior = (($pesoRef - $v) / $pesoRef) <= $porcentajesAjustados['inferior'];
                    $dentroDeLimiteSuperior = (($v - $pesoRef) / $pesoRef) <= $porcentajesAjustados['superior'];

                    return $dentroDeLimiteInferior && $dentroDeLimiteSuperior;
                })
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
                // ✅ Verificar si se aplicó ajuste para este día
                $ajusteAplicado = ($camada->tipo_ave ?? '') === 'broilers' &&
                    ($camada->sexaje ?? '') === 'mixto';

                // Añadir al resumen diario
                $resumenPorDia[] = [
                    'fecha' => $fecha,
                    'peso_medio' => $pesoMedio,
                    'lecturas_aceptadas' => $aceptadas->count(),
                    'lecturas_totales' => $lecturas->count(),
                    'lecturas_consideradas' => $consideradas->count(),
                    'lecturas_descartadas' => $lecturas->count() - $consideradas->count(),
                    'peso_referencia' => $pesoRef,
                    'edad_dias' => $edadDias,
                    // ✅ INFORMACIÓN DE AJUSTE
                    'ajuste_descarte' => [
                        'aplicado' => $ajusteAplicado,
                        'porcentaje_original' => round($porcentajeDescarte * 100, 1) . '%',
                        'porcentaje_inferior' => round($porcentajesAjustados['inferior'] * 100, 1) . '%',
                        'porcentaje_superior' => round($porcentajesAjustados['superior'] * 100, 1) . '%'
                    ]
                ];

                // ✅ Guardar detalle de ajustes si se aplicó
                if ($ajusteAplicado) {
                    $detalleAjustesPorDia[] = [
                        'fecha' => $fecha,
                        'edad_dias' => $edadDias,
                        'porcentaje_original' => round($porcentajeDescarte * 100, 1),
                        'porcentaje_inferior_ajustado' => round($porcentajesAjustados['inferior'] * 100, 1),
                        'porcentaje_superior_ajustado' => round($porcentajesAjustados['superior'] * 100, 1),
                        'incremento_inferior' => round(($porcentajesAjustados['inferior'] - $porcentajeDescarte) * 100, 1),
                        'incremento_superior' => round(($porcentajesAjustados['superior'] - $porcentajeDescarte) * 100, 1),
                        'lecturas_antes_filtro' => $lecturas->count(),
                        'lecturas_despues_filtro' => $consideradas->count(),
                        'lecturas_descartadas_por_ajuste' => $lecturas->count() - $consideradas->count()
                    ];
                }

                // Añadir a la colección para el cálculo global
                $pesosTotales = $pesosTotales->merge($aceptadas);
            }
        }

        // Cálculo del peso medio global para todo el periodo
        $pesoMedioGlobal = $pesosTotales->count()
            ? round($pesosTotales->avg(), 2)
            : 0.0;

        // ✅ Calcular estadísticas de ajustes aplicados
        $estadisticasAjustes = [
            'dias_con_ajuste' => count($detalleAjustesPorDia),
            'dias_sin_ajuste' => count($resumenPorDia) - count($detalleAjustesPorDia),
            'total_dias_procesados' => count($resumenPorDia),
            'porcentaje_dias_con_ajuste' => count($resumenPorDia) > 0
                ? round((count($detalleAjustesPorDia) / count($resumenPorDia)) * 100, 1)
                : 0,
            'ajuste_promedio_inferior' => count($detalleAjustesPorDia) > 0
                ? round(collect($detalleAjustesPorDia)->avg('incremento_inferior'), 1)
                : 0,
            'ajuste_promedio_superior' => count($detalleAjustesPorDia) > 0
                ? round(collect($detalleAjustesPorDia)->avg('incremento_superior'), 1)
                : 0,
            'lecturas_descartadas_por_ajuste_total' => collect($detalleAjustesPorDia)->sum('lecturas_descartadas_por_ajuste')
        ];

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
            // ✅ NUEVA INFORMACIÓN SOBRE AJUSTES
            'configuracion_descarte' => [
                'porcentaje_base' => round($porcentajeDescarte * 100, 1) . '%',
                'coeficiente_homogeneidad' => $coef,
                'ajuste_automatico_broilers_mixtos' => true
            ],
            'estadisticas_ajustes' => $estadisticasAjustes,
            'detalle_ajustes_por_dia' => $detalleAjustesPorDia,
            // ✅ Información adicional para análisis
            'analisis_global' => [
                'total_lecturas_consideradas' => collect($resumenPorDia)->sum('lecturas_consideradas'),
                'total_lecturas_originales' => collect($resumenPorDia)->sum('lecturas_totales'),
                'total_lecturas_descartadas' => collect($resumenPorDia)->sum('lecturas_descartadas'),
                'porcentaje_aprovechamiento' => collect($resumenPorDia)->sum('lecturas_totales') > 0
                    ? round((collect($resumenPorDia)->sum('lecturas_consideradas') / collect($resumenPorDia)->sum('lecturas_totales')) * 100, 1)
                    : 0,
                'rango_edades_procesadas' => [
                    'minima' => collect($resumenPorDia)->min('edad_dias'),
                    'maxima' => collect($resumenPorDia)->max('edad_dias')
                ]
            ]
        ], Response::HTTP_OK);
    }

    public function pesadasRango(Request $request, int $camadaId, int $dispId): JsonResponse
    {
        // 1. Validar parámetros
        $request->validate([
            'fecha_inicio'      => 'required|date|before_or_equal:fecha_fin',
            'fecha_fin'         => 'required|date',
            'coefHomogeneidad'  => 'nullable|numeric|min:0|max:1',
            'porcentajeDescarte' => 'nullable|numeric|min:0|max:100',
        ]);

        $fi = $request->query('fecha_inicio');
        $ff = $request->query('fecha_fin');
        $coef = $request->has('coefHomogeneidad') ? (float)$request->query('coefHomogeneidad') : null;

        $porcentajeDescarte = $request->has('porcentajeDescarte')
            ? (float)$request->query('porcentajeDescarte') / 100  // Convertir de % a decimal
            : 0.20; // 20% por defecto

        // 2. Verificar camada y dispositivo
        $camada = Camada::select('id_camada', 'fecha_hora_inicio', 'sexaje', 'tipo_estirpe', 'tipo_ave')->findOrFail($camadaId);

        Log::info("=== PESADAS RANGO DEBUG ===", [
            'camada_id' => $camadaId,
            'dispositivo_id' => $dispId,
            'fecha_inicio' => $fi,
            'fecha_fin' => $ff,
            'camada_datos' => [
                'id_camada' => $camada->id_camada,
                'tipo_ave' => $camada->tipo_ave ?? 'NULL',
                'tipo_estirpe' => $camada->tipo_estirpe ?? 'NULL',
                'sexaje' => $camada->sexaje ?? 'NULL',
                'fecha_inicio' => $camada->fecha_hora_inicio
            ]
        ]);

        $dispositivo = DB::table('tb_dispositivo as d')
            ->join('tb_relacion_camada_dispositivo as rcd', 'd.id_dispositivo', '=', 'rcd.id_dispositivo')
            ->where('rcd.id_camada', $camadaId)
            ->where('d.id_dispositivo', $dispId)
            ->select('d.numero_serie')
            ->first();

        if (!$dispositivo) {
            // Verificar relación histórica
            $relacionHistorica = DB::table('tb_relacion_camada_dispositivo')
                ->where('id_camada', $camadaId)
                ->where('id_dispositivo', $dispId)
                ->exists();

            if (!$relacionHistorica) {
                return response()->json(['message' => "Nunca estuvo vinculado"], 400);
            }

            $numeroSerie = Dispositivo::findOrFail($dispId)->numero_serie;
        } else {
            $numeroSerie = $dispositivo->numero_serie;
        }

        $fechaInicioCamada = $camada->fecha_hora_inicio;
        $numeroSerie = $dispositivo->numero_serie;

        // 3. Obtener TODAS las lecturas del rango
        $lecturasRaw = DB::table('tb_entrada_dato')
            ->where('id_dispositivo', $numeroSerie)
            ->where('id_sensor', 2)
            ->whereBetween('fecha', [$fi . ' 00:00:00', $ff . ' 23:59:59'])
            ->select('valor', 'fecha')
            ->orderBy('fecha')
            ->get();

        // 4. Preparar fechas
        $inicio = Carbon::parse($fi);
        $fin = Carbon::parse($ff);

        // 5. Agrupar por día y aplicar agrupación
        $lecturasPorDia = $lecturasRaw->groupBy(function ($item) {
            return Carbon::parse($item->fecha)->format('Y-m-d');
        });

        // ✅ APLICAR AGRUPACIÓN POR CADA DÍA (COMENTADO - SIN AGRUPACIÓN)
        // $lecturasPorDiaAgrupadas = collect();
        // foreach ($lecturasPorDia as $fecha => $lecturasDia) {
        //     // Convertir a objetos con id_dispositivo para compatibilidad
        //     $lecturasConDispositivo = $lecturasDia->map(function ($item) use ($numeroSerie) {
        //         return (object) [
        //             'id_dispositivo' => $numeroSerie,
        //             'valor' => $item->valor,
        //             'fecha' => $item->fecha
        //         ];
        //     });

        //     $lecturasAgrupadasDia = $this->agruparPesadasConsecutivas($lecturasConDispositivo);
        //     $lecturasPorDiaAgrupadas->put($fecha, $lecturasAgrupadasDia);
        // }

        // SIN AGRUPACIÓN - usar lecturas originales por día
        $lecturasPorDiaAgrupadas = collect();
        foreach ($lecturasPorDia as $fecha => $lecturasDia) {
            // Convertir a objetos con id_dispositivo para compatibilidad
            $lecturasConDispositivo = $lecturasDia->map(function ($item) use ($numeroSerie) {
                return (object) [
                    'id_dispositivo' => $numeroSerie,
                    'valor' => $item->valor,
                    'fecha' => $item->fecha,
                    'lecturas_agrupadas' => 1  // Marcar como 1 lectura original
                ];
            });

            $lecturasPorDiaAgrupadas->put($fecha, $lecturasConDispositivo);
        }

        // 6. Precalcular pesos de referencia
        $edadMinima = $fechaInicioCamada->diffInDays($inicio);
        $edadMaxima = $fechaInicioCamada->diffInDays($fin);
        $pesosReferencia = $this->getPesosReferenciaRango($camada, $edadMinima, $edadMaxima);

        // ✅ NUEVO: Variables para estadísticas de ajustes
        $totalAjustesAplicados = 0;
        $detalleAjustesPorDia = [];
        $estadisticasAjustes = [
            'dias_con_ajuste' => 0,
            'dias_sin_ajuste' => 0,
            'ajuste_promedio_inferior' => 0,
            'ajuste_promedio_superior' => 0,
            'total_lecturas_descartadas_por_ajuste' => 0
        ];

        // 7. Procesar cada día
        $result = [];

        for ($dia = $inicio->copy(); $dia->lte($fin); $dia->addDay()) {
            $fechaStr = $dia->format('Y-m-d');
            $lecturasOriginalesDia = $lecturasPorDia->get($fechaStr, collect());
            $lecturasDia = $lecturasPorDiaAgrupadas->get($fechaStr, collect());

            // Calcular edad de la camada
            $edadDias = $fechaInicioCamada->diffInDays($dia);

            // Obtener peso de referencia
            $pesoRef = $this->getPesoReferenciaOptimizado([
                'tipo_ave' => $camada->tipo_ave ?? '',
                'tipo_estirpe' => $camada->tipo_estirpe ?? '',
                'sexaje' => $camada->sexaje ?? ''
            ], $edadDias);

            // ✅ NUEVO: Ajustar porcentaje de descarte para broilers mixtos según edad
            $porcentajesAjustados = $this->ajustarPorcentajeDescarte(
                $porcentajeDescarte,
                $edadDias,
                $camada->tipo_ave ?? '',
                $camada->sexaje ?? ''
            );

            Log::info("Peso referencia calculado: {$pesoRef}, Edad días: {$edadDias}");

            // ✅ Verificar si se aplicó ajuste y registrar estadísticas
            $ajusteAplicado = ($camada->tipo_ave ?? '') === 'broilers' &&
                ($camada->sexaje ?? '') === 'mixto';

            if ($ajusteAplicado) {
                $estadisticasAjustes['dias_con_ajuste']++;
                $totalAjustesAplicados++;

                $incrementoInferior = ($porcentajesAjustados['inferior'] - $porcentajeDescarte) * 100;
                $incrementoSuperior = ($porcentajesAjustados['superior'] - $porcentajeDescarte) * 100;

                $detalleAjustesPorDia[] = [
                    'fecha' => $fechaStr,
                    'edad_dias' => $edadDias,
                    'porcentaje_original' => round($porcentajeDescarte * 100, 1),
                    'porcentaje_inferior_ajustado' => round($porcentajesAjustados['inferior'] * 100, 1),
                    'porcentaje_superior_ajustado' => round($porcentajesAjustados['superior'] * 100, 1),
                    'incremento_inferior' => round($incrementoInferior, 1),
                    'incremento_superior' => round($incrementoSuperior, 1)
                ];
            } else {
                $estadisticasAjustes['dias_sin_ajuste']++;
            }

            if ($lecturasDia->isEmpty()) {
                $result[] = [
                    'fecha' => $fechaStr,
                    'peso_medio_aceptadas' => 0.0,
                    'coef_variacion' => 0.0,
                    'pesadas' => [],
                    'pesadas_horarias' => array_fill_keys(
                        array_map(fn($h) => str_pad($h, 2, '0', STR_PAD_LEFT), range(0, 23)),
                        0
                    ),
                    'info_agrupacion' => [
                        'lecturas_originales' => $lecturasOriginalesDia->count(),
                        'lecturas_agrupadas' => 0,
                        'reduccion' => $lecturasOriginalesDia->count()
                    ],
                    // ✅ NUEVA INFORMACIÓN DE AJUSTE
                    'ajuste_descarte' => [
                        'aplicado' => $ajusteAplicado,
                        'edad_dias' => $edadDias,
                        'porcentaje_original' => round($porcentajeDescarte * 100, 1) . '%',
                        'porcentaje_inferior' => round($porcentajesAjustados['inferior'] * 100, 1) . '%',
                        'porcentaje_superior' => round($porcentajesAjustados['superior'] * 100, 1) . '%'
                    ]
                ];
                continue;
            }

            // Filtrar por ±% ajustado del peso ideal
            $consideradas = $lecturasDia->filter(function ($e) use ($pesoRef, $porcentajesAjustados) {
                if ($pesoRef <= 0) return false;

                $v = (float)$e->valor;
                $dentroDeLimiteInferior = (($pesoRef - $v) / $pesoRef) <= $porcentajesAjustados['inferior'];
                $dentroDeLimiteSuperior = (($v - $pesoRef) / $pesoRef) <= $porcentajesAjustados['superior'];

                return $dentroDeLimiteInferior && $dentroDeLimiteSuperior;
            });

            $valoresConsiderados = $consideradas->map(fn($e) => (float)$e->valor);

            // ✅ Contar lecturas descartadas por ajuste
            $lecturasDescartadasPorAjuste = $lecturasDia->count() - $consideradas->count();
            if ($ajusteAplicado) {
                $estadisticasAjustes['total_lecturas_descartadas_por_ajuste'] += $lecturasDescartadasPorAjuste;

                // Actualizar el detalle del día con esta información
                $indiceDetalle = count($detalleAjustesPorDia) - 1;
                if ($indiceDetalle >= 0) {
                    $detalleAjustesPorDia[$indiceDetalle]['lecturas_antes_filtro'] = $lecturasDia->count();
                    $detalleAjustesPorDia[$indiceDetalle]['lecturas_despues_filtro'] = $consideradas->count();
                    $detalleAjustesPorDia[$indiceDetalle]['lecturas_descartadas_por_ajuste'] = $lecturasDescartadasPorAjuste;
                }
            }

            if ($consideradas->isEmpty()) {
                $result[] = [
                    'fecha' => $fechaStr,
                    'peso_medio_aceptadas' => 0.0,
                    'coef_variacion' => 0.0,
                    'pesadas' => [],
                    'pesadas_horarias' => array_fill_keys(
                        array_map(fn($h) => str_pad($h, 2, '0', STR_PAD_LEFT), range(0, 23)),
                        0
                    ),
                    'info_agrupacion' => [
                        'lecturas_originales' => $lecturasOriginalesDia->count(),
                        'lecturas_agrupadas' => $lecturasDia->count(),
                        'reduccion' => $lecturasOriginalesDia->count() - $lecturasDia->count()
                    ],
                    // ✅ INFORMACIÓN DE AJUSTE
                    'ajuste_descarte' => [
                        'aplicado' => $ajusteAplicado,
                        'edad_dias' => $edadDias,
                        'porcentaje_original' => round($porcentajeDescarte * 100, 1) . '%',
                        'porcentaje_inferior' => round($porcentajesAjustados['inferior'] * 100, 1) . '%',
                        'porcentaje_superior' => round($porcentajesAjustados['superior'] * 100, 1) . '%',
                        'lecturas_descartadas_por_ajuste' => $lecturasDescartadasPorAjuste
                    ]
                ];
                continue;
            }

            // Media global
            $mediaGlobal = $valoresConsiderados->avg();

            // Aplicar coeficiente de homogeneidad
            $lecturasFiltradas = $consideradas;
            if (!is_null($coef) && $mediaGlobal > 0) {
                $lecturasFiltradas = $consideradas->filter(function ($e) use ($mediaGlobal, $coef) {
                    $v = (float)$e->valor;
                    return abs($v - $mediaGlobal) / $mediaGlobal <= $coef;
                });
            }

            $valoresAceptados = $lecturasFiltradas->map(fn($e) => (float)$e->valor);

            // Calcular estadísticas
            $pesoMedio = $valoresAceptados->isEmpty() ? 0.0 : round($valoresAceptados->avg(), 2);

            // Coeficiente de variación
            $cv = 0.0;
            if ($valoresAceptados->count() > 1 && $pesoMedio > 0) {
                $varianza = $valoresAceptados->map(fn($v) => pow($v - $pesoMedio, 2))->avg();
                $cv = round((sqrt($varianza) / $pesoMedio) * 100, 2);
            }

            // Preparar datos de pesadas
            $pesadas = $lecturasFiltradas->map(function ($e) {
                $fecha = Carbon::parse($e->fecha);
                return [
                    'valor' => (float)$e->valor,
                    'fecha' => $e->fecha,
                    'hora' => $fecha->format('H:i:s'),
                    'lecturas_agrupadas' => $e->lecturas_agrupadas ?? 1
                ];
            })->values();

            // Conteo por hora
            $conteoPorHora = array_fill_keys(
                array_map(fn($h) => str_pad($h, 2, '0', STR_PAD_LEFT), range(0, 23)),
                0
            );

            foreach ($pesadas as $pesada) {
                $hora = Carbon::parse($pesada['fecha'])->format('H');
                $horaKey = str_pad($hora, 2, '0', STR_PAD_LEFT);
                $conteoPorHora[$horaKey]++;
            }

            $result[] = [
                'fecha' => $fechaStr,
                'peso_medio_aceptadas' => $pesoMedio,
                'coef_variacion' => $cv,
                'pesadas' => $pesadas,
                'pesadas_horarias' => $conteoPorHora,
                'peso_referencia' => [
                    'valor' => $pesoRef,
                    'edad_dias' => $edadDias,
                    'sexaje' => $camada->sexaje,
                    'tipo_ave' => $camada->tipo_ave,
                    'tipo_estirpe' => $camada->tipo_estirpe,
                    'porcentajes_descarte' => [
                        'original' => round($porcentajeDescarte * 100, 1) . '%',
                        'inferior_ajustado' => round($porcentajesAjustados['inferior'] * 100, 1) . '%',
                        'superior_ajustado' => round($porcentajesAjustados['superior'] * 100, 1) . '%',
                        'ajuste_aplicado' => ($camada->tipo_ave ?? '') === 'broilers' &&
                            ($camada->sexaje ?? '') === 'mixto'
                    ]
                ],
                'info_agrupacion' => [
                    'lecturas_originales' => $lecturasOriginalesDia->count(),
                    'lecturas_agrupadas' => $lecturasDia->count(),
                    'reduccion' => $lecturasOriginalesDia->count() - $lecturasDia->count(),
                    'porcentaje_reduccion' => $lecturasOriginalesDia->count() > 0
                        ? round((($lecturasOriginalesDia->count() - $lecturasDia->count()) / $lecturasOriginalesDia->count()) * 100, 2)
                        : 0
                ],
                // ✅ INFORMACIÓN DETALLADA DE AJUSTE POR DÍA
                'ajuste_descarte' => [
                    'aplicado' => $ajusteAplicado,
                    'edad_dias' => $edadDias,
                    'porcentaje_original' => round($porcentajeDescarte * 100, 1) . '%',
                    'porcentaje_inferior' => round($porcentajesAjustados['inferior'] * 100, 1) . '%',
                    'porcentaje_superior' => round($porcentajesAjustados['superior'] * 100, 1) . '%',
                    'lecturas_antes_ajuste' => $lecturasDia->count(),
                    'lecturas_despues_ajuste' => $consideradas->count(),
                    'lecturas_descartadas_por_ajuste' => $lecturasDescartadasPorAjuste,
                    'porcentaje_aprovechamiento' => $lecturasDia->count() > 0
                        ? round(($consideradas->count() / $lecturasDia->count()) * 100, 1)
                        : 0
                ]
            ];
        }

        // ✅ Finalizar cálculo de estadísticas de ajustes
        if ($estadisticasAjustes['dias_con_ajuste'] > 0) {
            $estadisticasAjustes['ajuste_promedio_inferior'] = round(
                collect($detalleAjustesPorDia)->avg('incremento_inferior'),
                1
            );
            $estadisticasAjustes['ajuste_promedio_superior'] = round(
                collect($detalleAjustesPorDia)->avg('incremento_superior'),
                1
            );
        }

        // ✅ Calcular estadísticas globales del rango
        $totalDias = count($result);
        $diasConDatos = collect($result)->filter(fn($dia) => count($dia['pesadas']) > 0)->count();
        $totalLecturasOriginales = collect($result)->sum(fn($dia) => $dia['info_agrupacion']['lecturas_originales']);
        $totalLecturasConsideradas = collect($result)->sum(fn($dia) => $dia['ajuste_descarte']['lecturas_despues_ajuste'] ?? 0);

        return response()->json([
            // ✅ INFORMACIÓN BÁSICA
            'camada' => [
                'id' => $camada->id_camada,
                'tipo_ave' => $camada->tipo_ave,
                'sexaje' => $camada->sexaje,
                'tipo_estirpe' => $camada->tipo_estirpe,
                'fecha_inicio' => $camada->fecha_hora_inicio
            ],
            'dispositivo' => [
                'id' => $dispId,
                'numero_serie' => $numeroSerie
            ],
            'periodo' => [
                'fecha_inicio' => $fi,
                'fecha_fin' => $ff,
                'total_dias' => $totalDias,
                'dias_con_datos' => $diasConDatos
            ],

            // ✅ CONFIGURACIÓN DE DESCARTE
            'configuracion_descarte' => [
                'porcentaje_base' => round($porcentajeDescarte * 100, 1) . '%',
                'coeficiente_homogeneidad' => $coef,
                'ajuste_automatico_broilers_mixtos' => true,
                'ajuste_aplicado_a_camada' => ($camada->tipo_ave ?? '') === 'broilers' &&
                    ($camada->sexaje ?? '') === 'mixto'
            ],

            // ✅ ESTADÍSTICAS DE AJUSTES
            'estadisticas_ajustes' => array_merge($estadisticasAjustes, [
                'total_dias_procesados' => $totalDias,
                'porcentaje_dias_con_ajuste' => $totalDias > 0
                    ? round(($estadisticasAjustes['dias_con_ajuste'] / $totalDias) * 100, 1)
                    : 0
            ]),

            // ✅ ESTADÍSTICAS GLOBALES
            'estadisticas_globales' => [
                'total_lecturas_originales' => $totalLecturasOriginales,
                'total_lecturas_consideradas' => $totalLecturasConsideradas,
                'total_lecturas_descartadas' => $totalLecturasOriginales - $totalLecturasConsideradas,
                'porcentaje_aprovechamiento_global' => $totalLecturasOriginales > 0
                    ? round(($totalLecturasConsideradas / $totalLecturasOriginales) * 100, 1)
                    : 0,
                'impacto_ajuste_automatico' => $estadisticasAjustes['total_lecturas_descartadas_por_ajuste'],
                'rango_edades_procesadas' => [
                    'minima' => collect($result)->min('peso_referencia.edad_dias'),
                    'maxima' => collect($result)->max('peso_referencia.edad_dias')
                ]
            ],

            // ✅ DETALLE DE AJUSTES (para análisis detallado)
            'detalle_ajustes_por_dia' => $detalleAjustesPorDia,

            // ✅ DATOS PRINCIPALES (como siempre)
            'datos' => $result

        ], Response::HTTP_OK);
    }


    private function getPesosReferenciaRango(Camada $camada, int $edadMinima, int $edadMaxima): Collection
    {
        // ✅ USAR EL MÉTODO CORREGIDO
        $cacheKey = "peso_referencia_rango_{$camada->tipo_ave}_{$camada->tipo_estirpe}_{$camada->sexaje}_{$edadMinima}_{$edadMaxima}";

        return Cache::remember($cacheKey, 3600, function () use ($camada, $edadMinima, $edadMaxima) {
            $result = collect();

            for ($edad = $edadMinima; $edad <= $edadMaxima; $edad++) {
                $peso = $this->getPesoReferenciaOptimizado([
                    'tipo_ave' => $camada->tipo_ave,      // ✅ AÑADIR
                    'tipo_estirpe' => $camada->tipo_estirpe,
                    'sexaje' => $camada->sexaje
                ], $edad);

                $result->put($edad, (object)['peso' => $peso]);
            }

            return $result;
        });
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
            ->get([
                'id_camada',
                'nombre_camada',
                'alta',                    // ✅ Para distinguir activas/históricas
                'fecha_hora_inicio',       // ✅ Para referencia temporal
                'fecha_hora_final'         // ✅ Para referencia temporal
            ]);

        return response()->json($camadas, Response::HTTP_OK);
    }

    public function getDispositivosByCamada(int $camadaId): JsonResponse
    {
        $camada = Camada::findOrFail($camadaId);

        // Obtener TODOS los dispositivos (actuales + históricos)
        $dispositivos = DB::table('tb_dispositivo as d')
            ->join('tb_relacion_camada_dispositivo as rcd', 'd.id_dispositivo', '=', 'rcd.id_dispositivo')
            ->where('rcd.id_camada', $camadaId)
            ->select([
                'd.id_dispositivo',
                'd.numero_serie',
                'd.ip_address',
                'rcd.fecha_vinculacion',
                'rcd.fecha_desvinculacion',
                // Indicar si es relación actual
                DB::raw('CASE WHEN rcd.fecha_desvinculacion IS NULL THEN 1 ELSE 0 END as es_actual')
            ])
            ->orderBy('rcd.fecha_vinculacion', 'desc')
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

                //  GESTIÓN DE ALERTAS ACTIVAS - SOLO UNA A LA VEZ
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
                    //  MISMO TIPO: Solo actualizar duración y contador
                    $inicioAlerta = Carbon::parse($alertaActualActiva['inicio']['fecha'] . ' ' . $alertaActualActiva['inicio']['hora']);
                    $alertaActualActiva['duracion_minutos'] = $inicioAlerta->diffInMinutes($fechaLectura);
                    $alertaActualActiva['lecturas_alerta']++;
                } else {
                    //  TIPO DIFERENTE: Cerrar la anterior y crear nueva (REEMPLAZAR)
                    $alertaActualActiva['fin'] = [
                        'fecha' => $fechaLectura->format('Y-m-d'),
                        'hora' => $fechaLectura->format('H:i:s'),
                        'motivo' => 'cambio_tipo',
                        'nuevo_tipo' => $tipoAlertaActual
                    ];
                    $alertaActualActiva['estado'] = 'resuelta';

                    // Agregar la alerta cerrada al historial
                    $alertasActivas[] = $alertaActualActiva;

                    //  CREAR NUEVA ALERTA (REEMPLAZANDO LA ANTERIOR)
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
                //  NO HAY ALERTA: Si hay una alerta activa, cerrarla
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
                    $alertaActualActiva = null; //  LIMPIAR - No hay alerta activa
                }
            }
        }


        if ($alertaActualActiva !== null) {
            $alertaActualActiva['estado'] = 'activa';
            $alertasActivas[] = $alertaActualActiva;
        }

        //  PREPARAR RESPUESTA FINAL - SOLO UNA ALERTA ACTIVA
        $alertasActivasActuales = collect($alertasActivas)->where('estado', 'activa');
        $alertasResueltasTotal = collect($alertasActivas)->where('estado', 'resuelta');

        //  SOLO PUEDE HABER UNA ALERTA ACTIVA
        $alertaActivaActual = $alertasActivasActuales->first(); // Solo la primera (debería ser única)


        // 10. Calcular estadísticas
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
                //  SOLO UNA ESTRUCTURA - La que esté activa
                'temperatura_baja' => ($alertaActivaActual && $alertaActivaActual['tipo'] === 'baja') ? $alertaActivaActual : null,
                'temperatura_alta' => ($alertaActivaActual && $alertaActivaActual['tipo'] === 'alta') ? $alertaActivaActual : null,
            ],
            'datos_grafica' => $datosGrafica,
            'alertas' => $alertas,
            'historial_alertas_activas' => $alertasActivas
        ], Response::HTTP_OK);
    }

    /**
     * Obtiene datos de temperatura de cama (sensor 12) para gráfica y tabla de alertas
     * - Día 0–7: alerta si temp_cama ≤ temp_ambiental_media - 3°C
     * - Día >7: alerta si temp_cama < temp_ambiental_media
     *
     * @param Request $request
     * @param int     $dispId  ID del dispositivo
     * @return JsonResponse
     */
    public function getTemperaturaCamaGraficaAlertas(Request $request, int $dispId): JsonResponse
    {
        // 1. Validar parámetros
        $request->validate([
            'fecha_inicio' => 'required|date|before_or_equal:fecha_fin',
            'fecha_fin'    => 'required|date',
        ]);
        $fechaInicio = $request->query('fecha_inicio');
        $fechaFin    = $request->query('fecha_fin');

        // 2. Cargar dispositivo y camada asociada
        $dispositivo = Dispositivo::findOrFail($dispId);
        $serie       = $dispositivo->numero_serie;
        $camada = Camada::join('tb_relacion_camada_dispositivo', 'tb_camada.id_camada', '=', 'tb_relacion_camada_dispositivo.id_camada')
            ->where('tb_relacion_camada_dispositivo.id_dispositivo', $dispId)
            ->where(function ($q) use ($fechaInicio, $fechaFin) {
                $q->where('tb_camada.fecha_hora_inicio', '<=', $fechaFin)
                    ->where(function ($q2) use ($fechaInicio) {
                        $q2->whereNull('tb_camada.fecha_hora_final')
                            ->orWhere('tb_camada.fecha_hora_final', '>=', $fechaInicio);
                    });
            })
            ->select('tb_camada.*')
            ->first();
        if (! $camada) {
            return response()->json([
                'mensaje'     => 'No se encontró una camada activa en ese rango de fechas',
                'dispositivo' => ['id' => $dispId, 'numero_serie' => $serie],
            ], Response::HTTP_OK);
        }

        // 3. Sensores
        $SENSOR_AMBIENTAL = 6;  // como en el método original
        $SENSOR_CAMA      = 12; // nuevo sensor

        // 4. Obtener datos diarios ambientales para gráfica
        $datosDiarios = EntradaDato::where('id_dispositivo', $serie)
            ->where('id_sensor', $SENSOR_AMBIENTAL)
            ->whereBetween('fecha', ["{$fechaInicio} 00:00:00", "{$fechaFin} 23:59:59"])
            ->select(
                DB::raw('DATE(fecha) as dia'),
                DB::raw('ROUND(AVG(valor),2) as temp_media'),
                DB::raw('MIN(valor) as temp_min'),
                DB::raw('MAX(valor) as temp_max'),
                DB::raw('COUNT(*) as lecturas')
            )
            ->groupBy('dia')
            ->orderBy('dia')
            ->get();

        // 5. Obtener todas las lecturas de cama individuales
        $lecturasCama = EntradaDato::where('id_dispositivo', $serie)
            ->where('id_sensor', $SENSOR_CAMA)
            ->whereBetween('fecha', ["{$fechaInicio} 00:00:00", "{$fechaFin} 23:59:59"])
            ->orderBy('fecha')
            ->get(['valor', 'fecha']);

        // 6. Preparar datos para gráfica: combinar fechas ambientales y cama
        $datosGrafica = [];
        foreach ($datosDiarios as $dato) {
            $dia = $dato->dia;
            // calcular edad en días
            $edadDias = Carbon::parse($camada->fecha_hora_inicio)->diffInDays($dia);

            $datosGrafica[] = [
                'fecha'         => $dia,
                'edad_dias'     => $edadDias,
                'temp_ambiental_media' => $dato->temp_media,
                'temp_cama_ideal'      => $dato->temp_media, // límite base
                'temp_min'      => $dato->temp_min,
                'temp_max'      => $dato->temp_max,
                'lecturas_ambientales' => $dato->lecturas,
                // las camas no se agregan aquí; se muestran en 'alertas'
            ];
        }

        // 7. Procesar alertas de cama
        $alertas        = [];
        $alertasActivas = [];
        $actualActiva   = null;

        foreach ($lecturasCama as $lec) {
            $ts    = Carbon::parse($lec->fecha);
            $dia   = $ts->format('Y-m-d');
            $valor = (float)$lec->valor;
            // buscar temp ambiental media de ese día
            $ambiental = $datosDiarios->firstWhere('dia', $dia)->temp_media ?? null;
            if ($ambiental === null) {
                continue;
            }
            // edad
            $edadDias = Carbon::parse($camada->fecha_hora_inicio)->diffInDays($ts);

            // determinar si hay alerta
            $hayAlerta = false;
            if ($edadDias <= 7) {
                $hayAlerta = ($valor <= $ambiental - 3.0);
            } else {
                $hayAlerta = ($valor < $ambiental);
            }

            if ($hayAlerta) {
                $evento = [
                    'fecha'        => $ts->format('Y-m-d'),
                    'hora'         => $ts->format('H:i:s'),
                    'valor_cama'   => $valor,
                    'temp_ambiental' => $ambiental,
                    'edad_dias'    => $edadDias,
                ];
                $alertas[] = $evento;

                if (! $actualActiva) {
                    // iniciar alerta
                    $actualActiva = [
                        'inicio'           => $evento,
                        'fin'              => null,
                        'duracion_minutos' => 0,
                        'lecturas_alerta'  => 1,
                        'estado'           => 'activa',
                    ];
                } else {
                    // acumular
                    $t0 = Carbon::parse($actualActiva['inicio']['fecha'] . ' ' . $actualActiva['inicio']['hora']);
                    $actualActiva['duracion_minutos'] = $t0->diffInMinutes($ts);
                    $actualActiva['lecturas_alerta']++;
                }
            } else {
                // normalizó → cerrar alerta si existía
                if ($actualActiva) {
                    $actualActiva['fin']    = $evento ?? [
                        'fecha' => $ts->format('Y-m-d'),
                        'hora'  => $ts->format('H:i:s'),
                    ];
                    $actualActiva['estado'] = 'resuelta';
                    $alertasActivas[]       = $actualActiva;
                    $actualActiva = null;
                }
            }
        }
        // si quedó abierta al final
        if ($actualActiva) {
            $alertasActivas[] = $actualActiva;
        }

        // 8. Estadísticas
        $totalLecturas   = $lecturasCama->count();
        $totalAlertas    = count($alertas);
        $porcentajeAlertas = $totalLecturas
            ? round($totalAlertas / $totalLecturas * 100, 2)
            : 0;

        $activas  = collect($alertasActivas)->where('estado', 'activa');
        $resueltas = collect($alertasActivas)->where('estado', 'resuelta');
        $activa   = $activas->first();

        // 9. Respuesta final
        return response()->json([
            'dispositivo' => [
                'id'           => $dispId,
                'numero_serie' => $serie,
            ],
            'camada' => [
                'id'     => $camada->id_camada,
                'nombre' => $camada->nombre_camada,
            ],
            'periodo' => [
                'fecha_inicio' => $fechaInicio,
                'fecha_fin'    => $fechaFin,
            ],
            'configuracion' => [
                'reglas_alerta' => [
                    ['edad' => '0-7', 'condicion' => 'temp_cama ≤ temp_amb - 3°C'],
                    ['edad' => '≥8',  'condicion' => 'temp_cama < temp_amb'],
                ],
            ],
            'resumen' => [
                'total_lecturas_cama'    => $totalLecturas,
                'total_eventos_alerta'   => $totalAlertas,
                'porcentaje_alertas'     => $porcentajeAlertas,
            ],
            'resumen_alertas_activas' => [
                'procesadas'            => count($alertasActivas),
                'activas_actuales'      => $activas->count(),
                'resueltas'             => $resueltas->count(),
                'duracion_total_min'    => collect($alertasActivas)->sum('duracion_minutos'),
                'promedio_por_alerta'   => collect($alertasActivas)->avg('lecturas_alerta'),
                'hay_alerta_activa'     => $activa !== null,
            ],
            'alertas_activas' => $activa,
            'datos_grafica'   => $datosGrafica,
            'alertas'         => $alertas,
            'historial'       => $alertasActivas,
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
     * Obtiene datos de humedad de cama (sensor 13) para gráfica y tabla de alertas con rangos:
     *   - <20%: seco
     *   - 20–30%: normal (25% ideal)
     *   - >40%: alerta por húmedo
     *
     * @param Request $request
     * @param int     $dispId  ID del dispositivo
     * @return JsonResponse
     */
    public function getHumedadCamaGraficaAlertas(Request $request, int $dispId): JsonResponse
    {
        // 1. Validar parámetros
        $request->validate([
            'fecha_inicio' => 'required|date|before_or_equal:fecha_fin',
            'fecha_fin'    => 'required|date',
        ]);
        $fechaInicio = $request->query('fecha_inicio');
        $fechaFin    = $request->query('fecha_fin');

        // 2. Cargar dispositivo y camada asociada
        $dispositivo = Dispositivo::findOrFail($dispId);
        $serie       = $dispositivo->numero_serie;
        $camada = Camada::join('tb_relacion_camada_dispositivo', 'tb_camada.id_camada', '=', 'tb_relacion_camada_dispositivo.id_camada')
            ->where('tb_relacion_camada_dispositivo.id_dispositivo', $dispId)
            ->where(function ($q) use ($fechaInicio, $fechaFin) {
                $q->where('tb_camada.fecha_hora_inicio', '<=', $fechaFin)
                    ->where(function ($q2) use ($fechaInicio) {
                        $q2->whereNull('tb_camada.fecha_hora_final')
                            ->orWhere('tb_camada.fecha_hora_final', '>=', $fechaInicio);
                    });
            })
            ->select('tb_camada.*')
            ->first();
        if (!$camada) {
            return response()->json([
                'mensaje'     => 'No se encontró una camada activa en ese rango de fechas',
                'dispositivo' => ['id' => $dispId, 'numero_serie' => $serie],
            ], Response::HTTP_OK);
        }

        // 3. Definir sensor y umbrales fijos
        $SENSOR_HUMEDAD_CAMA = 13;
        $UMBRAL_SECO         = 20;  // <20%
        $UMBRAL_NORMAL_MIN   = 20;  // 20–30%
        $UMBRAL_NORMAL_MAX   = 30;
        $IDEAL               = 25;
        $UMBRAL_HUME_ALTA    = 40;  // >40%

        // 4. Lecturas individuales para alertas
        $todasLasLecturas = EntradaDato::where('id_dispositivo', $serie)
            ->where('id_sensor', $SENSOR_HUMEDAD_CAMA)
            ->whereBetween('fecha', ["{$fechaInicio} 00:00:00", "{$fechaFin} 23:59:59"])
            ->orderBy('fecha')
            ->get(['valor', 'fecha']);

        // 5. Datos diarios agregados para la gráfica
        $datosDiarios = EntradaDato::where('id_dispositivo', $serie)
            ->where('id_sensor', $SENSOR_HUMEDAD_CAMA)
            ->whereBetween('fecha', ["{$fechaInicio} 00:00:00", "{$fechaFin} 23:59:59"])
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

        // 6. Preparar datos para la gráfica
        $datosGrafica = [];
        foreach ($datosDiarios as $d) {
            $datosGrafica[] = [
                'fecha'          => $d->dia,
                'humedad_media'  => $d->humedad_media,
                'humedad_min'    => $d->humedad_min,
                'humedad_max'    => $d->humedad_max,
                'ideal'          => $IDEAL,
                'seco_max'       => $UMBRAL_SECO,
                'normal_min'     => $UMBRAL_NORMAL_MIN,
                'normal_max'     => $UMBRAL_NORMAL_MAX,
                'alerta_humedo'  => $UMBRAL_HUME_ALTA,
                'lecturas'       => $d->lecturas,
            ];
        }

        // 7. Procesar alertas (todas y activas)
        $alertas         = [];
        $alertasActivas  = [];
        $alertaActual    = null;
        $totalFueraRango = 0;

        foreach ($todasLasLecturas as $lectura) {
            $valor = (float)$lectura->valor;
            $tipo  = null;

            if ($valor < $UMBRAL_SECO) {
                $tipo = 'seca';
            } elseif ($valor > $UMBRAL_HUME_ALTA) {
                $tipo = 'humeda';
            }

            if ($tipo !== null) {
                $totalFueraRango++;
                $evento = [
                    'fecha'      => Carbon::parse($lectura->fecha)->format('Y-m-d'),
                    'hora'       => Carbon::parse($lectura->fecha)->format('H:i:s'),
                    'valor'      => $valor,
                    'tipo'       => $tipo,
                    'ideal'      => $IDEAL,
                    'seco_max'   => $UMBRAL_SECO,
                    'humeda_min' => $UMBRAL_HUME_ALTA,
                ];
                $alertas[] = $evento;

                if ($alertaActual === null) {
                    // iniciar alerta
                    $alertaActual = [
                        'inicio'           => $evento,
                        'fin'              => null,
                        'tipo'             => $tipo,
                        'duracion_minutos' => 0,
                        'lecturas_alerta'  => 1,
                        'estado'           => 'activa',
                    ];
                } elseif ($alertaActual['tipo'] === $tipo) {
                    // mismo tipo, acumular
                    $tsInicio = Carbon::parse($alertaActual['inicio']['fecha'] . ' ' . $alertaActual['inicio']['hora']);
                    $alertaActual['duracion_minutos'] = $tsInicio->diffInMinutes(Carbon::parse($lectura->fecha));
                    $alertaActual['lecturas_alerta']++;
                } else {
                    // cerrar anterior y abrir nueva
                    $alertaActual['fin']    = $evento;
                    $alertaActual['estado'] = 'resuelta';
                    $alertasActivas[]       = $alertaActual;

                    $alertaActual = [
                        'inicio'           => $evento,
                        'fin'              => null,
                        'tipo'             => $tipo,
                        'duracion_minutos' => 0,
                        'lecturas_alerta'  => 1,
                        'estado'           => 'activa',
                    ];
                }
            } else {
                // si volvió a rango, cerrar alerta activa
                if ($alertaActual !== null) {
                    $alertaActual['fin'] = [
                        'fecha'  => Carbon::parse($lectura->fecha)->format('Y-m-d'),
                        'hora'   => Carbon::parse($lectura->fecha)->format('H:i:s'),
                        'motivo' => 'normalizada',
                    ];
                    $alertaActual['estado'] = 'resuelta';
                    $alertasActivas[] = $alertaActual;
                    $alertaActual = null;
                }
            }
        }
        // si quedó abierta al final
        if ($alertaActual !== null) {
            $alertasActivas[] = $alertaActual;
        }

        // 8. Estadísticas de alertas
        $totalLecturas  = $todasLasLecturas->count();
        $porcentajeFuera = $totalLecturas
            ? round($totalFueraRango / $totalLecturas * 100, 2)
            : 0;

        $activasActuales = collect($alertasActivas)->where('estado', 'activa');
        $resueltas       = collect($alertasActivas)->where('estado', 'resuelta');
        $alertaActiva    = $activasActuales->first();

        // 9. Responder JSON
        return response()->json([
            'dispositivo' => [
                'id'           => $dispId,
                'numero_serie' => $serie,
            ],
            'camada' => [
                'id'     => $camada->id_camada,
                'nombre' => $camada->nombre_camada,
            ],
            'periodo' => [
                'fecha_inicio' => $fechaInicio,
                'fecha_fin'    => $fechaFin,
            ],
            'configuracion' => [
                'rangos_alerta' => [
                    ['rango' => 'seco',   'humedad_max' => '20%'],
                    ['rango' => 'normal', 'humedad_min' => '20%', 'humedad_max' => '30%', 'ideal' => '25%'],
                    ['rango' => 'humeda', 'humedad_min' => '40%'],
                ],
            ],
            'resumen' => [
                'total_lecturas'        => $totalLecturas,
                'fuera_de_rango'        => $totalFueraRango,
                'porcentaje_fuera'      => $porcentajeFuera,
            ],
            'resumen_alertas_activas' => [
                'total_alertas_procesadas'    => count($alertasActivas),
                'alertas_activas_actuales'    => $activasActuales->count(),
                'alertas_resueltas'           => $resueltas->count(),
                'duracion_total_alertas_minutos' => collect($alertasActivas)->sum('duracion_minutos'),
                'promedio_lecturas_por_alerta'   => collect($alertasActivas)->avg('lecturas_alerta'),
                'hay_alerta_activa'            => $alertaActiva !== null,
                'tipo_alerta_activa'           => $alertaActiva['tipo'] ?? null,
            ],
            'alertas_activas_actuales' => [
                'humedad_seca'  => $alertaActiva && $alertaActiva['tipo'] === 'seca'  ? $alertaActiva : null,
                'humedad_humeda' => $alertaActiva && $alertaActiva['tipo'] === 'humeda' ? $alertaActiva : null,
            ],
            'datos_grafica' => $datosGrafica,
            'alertas'       => $alertas,
            'historial'     => $alertasActivas,
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

        $temp_min           = $lecturas_temp->min('valor');
        $temp_max           = $lecturas_temp->max('valor');
        $hum_min            = $lecturas_hum->min('valor');
        $hum_max            = $lecturas_hum->max('valor');
        $temp_suelo_min     = $lecturas_temp_suelo->min('valor');
        $temp_suelo_max     = $lecturas_temp_suelo->max('valor');
        $hum_suelo_min      = $lecturas_hum_suelo->min('valor');
        $hum_suelo_max      = $lecturas_hum_suelo->max('valor');

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
                    'valor'          => $temp_media,
                    'min'            => $temp_min,
                    'max'            => $temp_max,
                    'total_lecturas' => $lecturas_temp->count(),
                    'ultima_lectura' => $lecturas_temp->count() > 0 ? $lecturas_temp->sortByDesc('fecha')->first()->fecha : null,
                    'alerta' => $alerta_temperatura
                ],
                'humedad' => [
                    'valor' => $hum_media,
                    'valor'          => $hum_media,
                    'min'            => $hum_min,
                    'max'            => $hum_max,
                    'total_lecturas' => $lecturas_hum->count(),
                    'ultima_lectura' => $lecturas_hum->count() > 0 ? $lecturas_hum->sortByDesc('fecha')->first()->fecha : null,
                    'alerta' => $alerta_humedad
                ],
                'temperatura_suelo' => [
                    'valor' => $temp_suelo_media,
                    'valor'          => $temp_suelo_media,
                    'min'            => $temp_suelo_min,
                    'max'            => $temp_suelo_max,
                    'total_lecturas' => $lecturas_temp_suelo->count(),
                    'ultima_lectura' => $lecturas_temp_suelo->count() > 0 ? $lecturas_temp_suelo->sortByDesc('fecha')->first()->fecha : null
                ],
                'humedad_suelo' => [
                    'valor' => $hum_suelo_media,
                    'valor'          => $hum_suelo_media,
                    'min'            => $hum_suelo_min,
                    'max'            => $hum_suelo_max,
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
     * Obtiene datos de IEC y THI para un dispositivo en un rango de fechas
     * 
     * @param Request $request
     * @param int $dispId ID del dispositivo
     * @return JsonResponse
     */
    public function getIndicesAmbientalesRango(Request $request, int $dispId): JsonResponse
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

        // 3. Definición de sensores
        $SENSOR_TEMPERATURA = 6;
        $SENSOR_HUMEDAD = 5;

        // 4. Obtener TODAS las lecturas individuales para calcular IEC y THI por lectura
        $lecturasIndividuales = DB::table('tb_entrada_dato')
            ->where('id_dispositivo', $serie)
            ->whereIn('id_sensor', [$SENSOR_TEMPERATURA, $SENSOR_HUMEDAD])
            ->whereBetween('fecha', [$fechaInicio . ' 00:00:00', $fechaFin . ' 23:59:59'])
            ->select('fecha', 'id_sensor', 'valor')
            ->orderBy('fecha')
            ->get();

        // 5. También obtener datos diarios agregados para eficiencia
        $datosDiarios = DB::table('tb_entrada_dato')
            ->where('id_dispositivo', $serie)
            ->whereIn('id_sensor', [$SENSOR_TEMPERATURA, $SENSOR_HUMEDAD])
            ->whereBetween('fecha', [$fechaInicio . ' 00:00:00', $fechaFin . ' 23:59:59'])
            ->select(
                DB::raw('DATE(fecha) as dia'),
                'id_sensor',
                DB::raw('ROUND(AVG(valor), 2) as valor_medio'),
                DB::raw('MIN(valor) as valor_min'),
                DB::raw('MAX(valor) as valor_max'),
                DB::raw('COUNT(*) as lecturas')
            )
            ->groupBy('dia', 'id_sensor')
            ->orderBy('dia')
            ->get();

        // 6. Organizar lecturas individuales por timestamp para calcular índices por lectura
        $lecturasPorTimestamp = [];
        foreach ($lecturasIndividuales as $lectura) {
            $timestamp = $lectura->fecha;
            if (!isset($lecturasPorTimestamp[$timestamp])) {
                $lecturasPorTimestamp[$timestamp] = [
                    'fecha' => $timestamp,
                    'temperatura' => null,
                    'humedad' => null
                ];
            }

            if ($lectura->id_sensor == $SENSOR_TEMPERATURA) {
                $lecturasPorTimestamp[$timestamp]['temperatura'] = (float)$lectura->valor;
            } elseif ($lectura->id_sensor == $SENSOR_HUMEDAD) {
                $lecturasPorTimestamp[$timestamp]['humedad'] = (float)$lectura->valor;
            }
        }

        // 7. Organizar datos diarios agregados
        $datosOrganizados = [];
        foreach ($datosDiarios as $dato) {
            $dia = $dato->dia;
            if (!isset($datosOrganizados[$dia])) {
                $datosOrganizados[$dia] = [
                    'fecha' => $dia,
                    'temperatura' => null,
                    'humedad' => null,
                    'temperatura_min' => null,
                    'temperatura_max' => null,
                    'humedad_min' => null,
                    'humedad_max' => null,
                    'lecturas_temp' => 0,
                    'lecturas_hum' => 0
                ];
            }

            if ($dato->id_sensor == $SENSOR_TEMPERATURA) {
                $datosOrganizados[$dia]['temperatura'] = $dato->valor_medio;
                $datosOrganizados[$dia]['temperatura_min'] = $dato->valor_min;
                $datosOrganizados[$dia]['temperatura_max'] = $dato->valor_max;
                $datosOrganizados[$dia]['lecturas_temp'] = $dato->lecturas;
            } elseif ($dato->id_sensor == $SENSOR_HUMEDAD) {
                $datosOrganizados[$dia]['humedad'] = $dato->valor_medio;
                $datosOrganizados[$dia]['humedad_min'] = $dato->valor_min;
                $datosOrganizados[$dia]['humedad_max'] = $dato->valor_max;
                $datosOrganizados[$dia]['lecturas_hum'] = $dato->lecturas;
            }
        }

        // 8. Funciones auxiliares para niveles de índices con rangos específicos
        $obtenerNivelIEC = function ($iec) {
            if ($iec === null) return null;

            if ($iec <= 105) {
                return [
                    'nivel' => 'normal',
                    'color' => 'green',
                    'mensaje' => 'Condiciones normales',
                    'rango' => '≤ 105'
                ];
            } elseif ($iec <= 120) {
                return [
                    'nivel' => 'moderado',
                    'color' => 'yellow',
                    'mensaje' => 'Alerta: Estrés calórico moderado',
                    'rango' => '106 - 120'
                ];
            } elseif ($iec <= 130) {
                return [
                    'nivel' => 'alto',
                    'color' => 'orange',
                    'mensaje' => 'Peligro: Estrés calórico alto',
                    'rango' => '121 - 130'
                ];
            } else {
                return [
                    'nivel' => 'critico',
                    'color' => 'red',
                    'mensaje' => 'Emergencia: Estrés calórico extremo',
                    'rango' => '> 130'
                ];
            }
        };

        $obtenerNivelTHI = function ($thi) {
            if ($thi === null) return null;

            if ($thi <= 72) {
                return [
                    'nivel' => 'normal',
                    'color' => 'green',
                    'mensaje' => 'THI normal: Condiciones óptimas',
                    'rango' => '≤ 72'
                ];
            } elseif ($thi <= 79) {
                return [
                    'nivel' => 'moderado',
                    'color' => 'yellow',
                    'mensaje' => 'THI elevado: Alerta',
                    'rango' => '73 - 79'
                ];
            } elseif ($thi <= 88) {
                return [
                    'nivel' => 'alto',
                    'color' => 'orange',
                    'mensaje' => 'THI alto: Peligro',
                    'rango' => '80 - 88'
                ];
            } else {
                return [
                    'nivel' => 'critico',
                    'color' => 'red',
                    'mensaje' => 'THI crítico: Emergencia',
                    'rango' => '> 88'
                ];
            }
        };

        // 9. Calcular índices por día con min/max/media diarios
        $datosGrafica = [];
        $alertasIEC = [];
        $alertasTHI = [];
        $resumenNiveles = [
            'iec' => ['normal' => 0, 'moderado' => 0, 'alto' => 0, 'critico' => 0],
            'thi' => ['normal' => 0, 'moderado' => 0, 'alto' => 0, 'critico' => 0]
        ];

        foreach ($datosOrganizados as $datos) {
            $fecha = $datos['fecha'];
            $temperatura = $datos['temperatura'];
            $humedad = $datos['humedad'];

            // Calcular edad de la camada para esta fecha
            $edadDias = Carbon::parse($camada->fecha_hora_inicio)->diffInDays($fecha);

            // Calcular IEC y THI para todas las lecturas individuales de este día
            $indicesDelDia = [
                'iec' => [],
                'thi' => []
            ];

            for ($hora = 0; $hora < 24; $hora++) {
                $tempsHora = [];
                $humsHora = [];

                foreach ($lecturasPorTimestamp as $ts => $lectura) {
                    if (Carbon::parse($ts)->hour === $hora && Carbon::parse($ts)->format('Y-m-d') === $fecha) {
                        if ($lectura['temperatura'] !== null) {
                            $tempsHora[] = $lectura['temperatura'];
                        }
                        if ($lectura['humedad'] !== null) {
                            $humsHora[] = $lectura['humedad'];
                        }
                    }
                }

                if (count($tempsHora) > 0 && count($humsHora) > 0) {
                    $tempHora = array_sum($tempsHora) / count($tempsHora);
                    $humHora = array_sum($humsHora) / count($humsHora);

                    $iecHora = round($tempHora + $humHora, 1);
                    $thiHora = round((0.8 * $tempHora) + (($humHora / 100) * ($tempHora - 14.4)) + 46.4, 1);

                    $indicesDelDia['iec'][] = $iecHora;
                    $indicesDelDia['thi'][] = $thiHora;
                }
            }

            // Calcular estadísticas diarias de los índices
            $iecStats = null;
            $thiStats = null;
            $nivelIECDia = null;
            $nivelTHIDia = null;

            if (count($indicesDelDia['iec']) > 0) {
                $iecStats = [
                    'media' => round(array_sum($indicesDelDia['iec']) / count($indicesDelDia['iec']), 1),
                    'minimo' => round(min($indicesDelDia['iec']), 1),
                    'maximo' => round(max($indicesDelDia['iec']), 1),
                    'total_lecturas' => count($indicesDelDia['iec'])
                ];
                $nivelIECDia = $obtenerNivelIEC($iecStats['media']);
                $resumenNiveles['iec'][$nivelIECDia['nivel']]++;

                // Agregar alerta si no es normal
                if ($nivelIECDia['nivel'] !== 'normal') {
                    $alertasIEC[] = [
                        'fecha' => $fecha,
                        'edad_dias' => $edadDias,
                        'iec_media' => $iecStats['media'],
                        'iec_minimo' => $iecStats['minimo'],
                        'iec_maximo' => $iecStats['maximo'],
                        'temperatura' => $temperatura,
                        'humedad' => $humedad,
                        'nivel' => $nivelIECDia,
                        'tipo' => 'iec'
                    ];
                }
            }

            if (count($indicesDelDia['thi']) > 0) {
                $thiStats = [
                    'media' => round(array_sum($indicesDelDia['thi']) / count($indicesDelDia['thi']), 1),
                    'minimo' => round(min($indicesDelDia['thi']), 1),
                    'maximo' => round(max($indicesDelDia['thi']), 1),
                    'total_lecturas' => count($indicesDelDia['thi'])
                ];
                $nivelTHIDia = $obtenerNivelTHI($thiStats['media']);
                $resumenNiveles['thi'][$nivelTHIDia['nivel']]++;

                // Agregar alerta si no es normal
                if ($nivelTHIDia['nivel'] !== 'normal') {
                    $alertasTHI[] = [
                        'fecha' => $fecha,
                        'edad_dias' => $edadDias,
                        'thi_media' => $thiStats['media'],
                        'thi_minimo' => $thiStats['minimo'],
                        'thi_maximo' => $thiStats['maximo'],
                        'temperatura' => $temperatura,
                        'humedad' => $humedad,
                        'nivel' => $nivelTHIDia,
                        'tipo' => 'thi'
                    ];
                }
            }

            // Función auxiliar para determinar nivel de riesgo máximo
            $determinarNivelRiesgoMaximo = function ($nivelIEC, $nivelTHI) {
                $niveles = ['normal' => 0, 'moderado' => 1, 'alto' => 2, 'critico' => 3];

                $maxNivel = 0;
                if ($nivelIEC && isset($niveles[$nivelIEC['nivel']])) {
                    $maxNivel = max($maxNivel, $niveles[$nivelIEC['nivel']]);
                }
                if ($nivelTHI && isset($niveles[$nivelTHI['nivel']])) {
                    $maxNivel = max($maxNivel, $niveles[$nivelTHI['nivel']]);
                }

                return array_search($maxNivel, $niveles);
            };

            $datosGrafica[] = [
                'fecha' => $fecha,
                'edad_dias' => $edadDias,
                'temperatura_media' => $temperatura,
                'temperatura_min' => $datos['temperatura_min'],
                'temperatura_max' => $datos['temperatura_max'],
                'humedad_media' => $humedad,
                'humedad_min' => $datos['humedad_min'],
                'humedad_max' => $datos['humedad_max'],
                // ✅ IEC con media, min, max diarios
                'iec_media' => $iecStats ? $iecStats['media'] : null,
                'iec_minimo' => $iecStats ? $iecStats['minimo'] : null,
                'iec_maximo' => $iecStats ? $iecStats['maximo'] : null,
                'iec_nivel' => $nivelIECDia,
                'iec_lecturas' => $iecStats ? $iecStats['total_lecturas'] : 0,
                // ✅ THI con media, min, max diarios
                'thi_media' => $thiStats ? $thiStats['media'] : null,
                'thi_minimo' => $thiStats ? $thiStats['minimo'] : null,
                'thi_maximo' => $thiStats ? $thiStats['maximo'] : null,
                'thi_nivel' => $nivelTHIDia,
                'thi_lecturas' => $thiStats ? $thiStats['total_lecturas'] : 0,
                'lecturas_temperatura' => $datos['lecturas_temp'],
                'lecturas_humedad' => $datos['lecturas_hum'],
                // ✅ ESTADÍSTICAS DIARIAS DETALLADAS
                'estadisticas_dia' => [
                    'calidad_datos' => [
                        'total_lecturas_posibles' => 1440, // 24h * 60min (asumiendo lectura por minuto)
                        'lecturas_temperatura' => $datos['lecturas_temp'],
                        'lecturas_humedad' => $datos['lecturas_hum'],
                        'cobertura_temperatura' => $datos['lecturas_temp'] > 0 ? round(($datos['lecturas_temp'] / 1440) * 100, 1) : 0,
                        'cobertura_humedad' => $datos['lecturas_hum'] > 0 ? round(($datos['lecturas_hum'] / 1440) * 100, 1) : 0
                    ],
                    'variabilidad' => [
                        'rango_temperatura' => $datos['temperatura_max'] && $datos['temperatura_min'] ?
                            round($datos['temperatura_max'] - $datos['temperatura_min'], 1) : null,
                        'rango_humedad' => $datos['humedad_max'] && $datos['humedad_min'] ?
                            round($datos['humedad_max'] - $datos['humedad_min'], 1) : null,
                        'rango_iec' => $iecStats ? round($iecStats['maximo'] - $iecStats['minimo'], 1) : null,
                        'rango_thi' => $thiStats ? round($thiStats['maximo'] - $thiStats['minimo'], 1) : null
                    ],
                    'indices_calculados' => [
                        'iec_calculado' => $iecStats !== null,
                        'thi_calculado' => $thiStats !== null,
                        'ambos_disponibles' => $iecStats !== null && $thiStats !== null
                    ],
                    'alertas_dia' => [
                        'iec_problema' => $nivelIECDia && $nivelIECDia['nivel'] !== 'normal',
                        'thi_problema' => $nivelTHIDia && $nivelTHIDia['nivel'] !== 'normal',
                        'nivel_riesgo_maximo' => $determinarNivelRiesgoMaximo($nivelIECDia, $nivelTHIDia)
                    ]
                ]
            ];
        }

        // 10. Calcular estadísticas globales del periodo
        $todasLasLecturasIEC = [];
        $todasLasLecturasTHI = [];

        foreach ($datosGrafica as $dia) {
            if ($dia['iec_media'] !== null) {
                $todasLasLecturasIEC[] = $dia['iec_media'];
            }
            if ($dia['thi_media'] !== null) {
                $todasLasLecturasTHI[] = $dia['thi_media'];
            }
        }

        $estadisticas = [
            'iec' => [
                'promedio' => count($todasLasLecturasIEC) > 0 ? round(array_sum($todasLasLecturasIEC) / count($todasLasLecturasIEC), 1) : null,
                'minimo' => count($todasLasLecturasIEC) > 0 ? round(min($todasLasLecturasIEC), 1) : null,
                'maximo' => count($todasLasLecturasIEC) > 0 ? round(max($todasLasLecturasIEC), 1) : null,
                'dias_con_datos' => count($todasLasLecturasIEC)
            ],
            'thi' => [
                'promedio' => count($todasLasLecturasTHI) > 0 ? round(array_sum($todasLasLecturasTHI) / count($todasLasLecturasTHI), 1) : null,
                'minimo' => count($todasLasLecturasTHI) > 0 ? round(min($todasLasLecturasTHI), 1) : null,
                'maximo' => count($todasLasLecturasTHI) > 0 ? round(max($todasLasLecturasTHI), 1) : null,
                'dias_con_datos' => count($todasLasLecturasTHI)
            ]
        ];

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
            'estadisticas' => $estadisticas,
            'resumen_niveles' => $resumenNiveles,
            'datos_grafica' => $datosGrafica,
            'alertas_iec' => $alertasIEC,
            'alertas_thi' => $alertasTHI,
            'total_alertas' => count($alertasIEC) + count($alertasTHI),
            'informacion_indices' => [
                'iec' => [
                    'nombre' => 'Índice de Estrés Calórico',
                    'formula' => 'Temperatura (°C) + Humedad (%)',
                    'rangos' => [
                        ['min' => null, 'max' => 105, 'nivel' => 'normal', 'color' => 'green', 'descripcion' => 'Condiciones normales'],
                        ['min' => 106, 'max' => 120, 'nivel' => 'moderado', 'color' => 'yellow', 'descripcion' => 'Estrés calórico moderado'],
                        ['min' => 121, 'max' => 130, 'nivel' => 'alto', 'color' => 'orange', 'descripcion' => 'Estrés calórico alto'],
                        ['min' => 131, 'max' => null, 'nivel' => 'critico', 'color' => 'red', 'descripcion' => 'Estrés calórico extremo']
                    ]
                ],
                'thi' => [
                    'nombre' => 'Índice Temperatura-Humedad',
                    'formula' => '(0.8 × T°C) + ((HR% / 100) × (T°C - 14.4)) + 46.4',
                    'rangos' => [
                        ['min' => null, 'max' => 72, 'nivel' => 'normal', 'color' => 'green', 'descripcion' => 'Condiciones óptimas'],
                        ['min' => 73, 'max' => 79, 'nivel' => 'moderado', 'color' => 'yellow', 'descripcion' => 'THI elevado'],
                        ['min' => 80, 'max' => 88, 'nivel' => 'alto', 'color' => 'orange', 'descripcion' => 'THI alto'],
                        ['min' => 89, 'max' => null, 'nivel' => 'critico', 'color' => 'red', 'descripcion' => 'THI crítico']
                    ]
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

    /**
     * Genera pronóstico de peso para un dispositivo basado en datos históricos
     * 
     * @param Request $request
     * @param int $dispId ID del dispositivo
     * @return JsonResponse
     */
    public function getPronosticoPeso(Request $request, int $dispId): JsonResponse
    {
        $request->validate([
            'fecha_inicio' => 'required|date|before_or_equal:fecha_fin',
            'fecha_fin'    => 'required|date',
            'dias_pronostico' => 'nullable|integer|min:1|max:30'
        ]);

        $fechaInicio = $request->query('fecha_inicio');
        $fechaFin = $request->query('fecha_fin');
        $diasPronostico = (int)($request->query('dias_pronostico') ?? 7);

        // Cargar dispositivo y camada asociada
        $dispositivo = Dispositivo::findOrFail($dispId);
        $serie = $dispositivo->numero_serie;

        $camada = Camada::join('tb_relacion_camada_dispositivo', 'tb_camada.id_camada', '=', 'tb_relacion_camada_dispositivo.id_camada')
            ->where('tb_relacion_camada_dispositivo.id_dispositivo', $dispId)
            ->where(function ($query) use ($fechaInicio, $fechaFin) {
                $query->where('tb_camada.fecha_hora_inicio', '<=', $fechaFin)
                    ->where(function ($q2) use ($fechaInicio) {
                        $q2->whereNull('tb_camada.fecha_hora_final')
                            ->orWhere('tb_camada.fecha_hora_final', '>=', $fechaInicio);
                    });
            })
            ->select('tb_camada.*')
            ->first();

        if (!$camada) {
            return response()->json([
                'error' => 'No se encontró camada activa para este dispositivo'
            ], Response::HTTP_NOT_FOUND);
        }

        // Obtener datos históricos de peso medio por día
        $datosHistoricos = DB::table('tb_entrada_dato')
            ->where('id_dispositivo', $serie)
            ->where('id_sensor', 2) // Sensor de peso
            ->whereBetween('fecha', [$fechaInicio . ' 00:00:00', $fechaFin . ' 23:59:59'])
            ->select(
                DB::raw('DATE(fecha) as dia'),
                DB::raw('AVG(valor) as peso_medio'),
                DB::raw('COUNT(*) as lecturas')
            )
            ->groupBy('dia')
            ->orderBy('dia')
            ->get();

        if ($datosHistoricos->count() < 3) {
            return response()->json([
                'error' => 'Se necesitan al menos 3 días de datos para generar pronóstico'
            ], Response::HTTP_BAD_REQUEST);
        }

        // Calcular regresión lineal
        $regresion = $this->calcularRegresionLineal($datosHistoricos);

        // Generar pronóstico
        $pronostico = $this->generarPronosticoHibrido($datosHistoricos, $camada, $diasPronostico, $regresion);

        return response()->json([
            'dispositivo' => [
                'id' => $dispId,
                'numero_serie' => $serie
            ],
            'camada' => [
                'id' => $camada->id_camada,
                'nombre' => $camada->nombre_camada
            ],
            'periodo_historico' => [
                'fecha_inicio' => $fechaInicio,
                'fecha_fin' => $fechaFin,
                'dias_datos' => $datosHistoricos->count()
            ],
            'regresion' => [
                'pendiente' => $regresion['pendiente'],
                'intercepto' => $regresion['intercepto'],
                'r_cuadrado' => $regresion['r_cuadrado']
            ],
            'pronostico' => $pronostico,
            'calidad_datos' => [
                'total_lecturas' => $datosHistoricos->sum('lecturas'),
                'dias_con_datos' => $datosHistoricos->count(),
                'confiabilidad' => $this->evaluarConfiabilidad($regresion, $datosHistoricos->count())
            ]
        ], Response::HTTP_OK);
    }

    /**
     * Calcula regresión lineal para datos históricos
     */
    private function calcularRegresionLineal($datos): array
    {
        $n = $datos->count();

        // Convertir fechas a números (días desde el primer punto)
        $fechaInicio = Carbon::parse($datos->first()->dia);

        $sumX = 0;
        $sumY = 0;
        $sumXY = 0;
        $sumX2 = 0;

        foreach ($datos as $i => $punto) {
            $x = Carbon::parse($punto->dia)->diffInDays($fechaInicio);
            $y = (float)$punto->peso_medio;

            $sumX += $x;
            $sumY += $y;
            $sumXY += $x * $y;
            $sumX2 += $x * $x;
        }

        // Calcular pendiente e intercepto
        $pendiente = ($n * $sumXY - $sumX * $sumY) / ($n * $sumX2 - $sumX * $sumX);
        $intercepto = ($sumY - $pendiente * $sumX) / $n;

        // Calcular R²
        $mediaY = $sumY / $n;
        $totalVariacion = 0;
        $variacionExplicada = 0;

        foreach ($datos as $i => $punto) {
            $x = Carbon::parse($punto->dia)->diffInDays($fechaInicio);
            $y = (float)$punto->peso_medio;
            $yPredicho = $pendiente * $x + $intercepto;

            $totalVariacion += pow($y - $mediaY, 2);
            $variacionExplicada += pow($yPredicho - $mediaY, 2);
        }

        $rCuadrado = $totalVariacion > 0 ? $variacionExplicada / $totalVariacion : 0;

        return [
            'pendiente' => round($pendiente, 3),
            'intercepto' => round($intercepto, 2),
            'r_cuadrado' => round($rCuadrado, 4),
            'fecha_base' => $fechaInicio->format('Y-m-d')
        ];
    }

    /**
     * Obtiene los datos de referencia según el tipo de ave y estirpe de la camada
     */
    private function obtenerDatosReferencia($camada): ?Collection
    {
        // Normalizar tipo_ave y tipo_estirpe para determinar la tabla
        $tipoAve = strtolower(trim($camada->tipo_ave));
        $tipoEstirpe = strtolower(trim($camada->tipo_estirpe));

        // Si la estirpe es cobb, tratarla como ross
        if ($tipoEstirpe === 'cobb') {
            $tipoEstirpe = 'ross';
        }

        // Determinar la tabla de referencia
        $tabla = null;

        if ($tipoAve === 'pavos' && $tipoEstirpe === 'butpremium') {
            $tabla = 'tb_peso_pavos_butpremium';
        } elseif ($tipoAve === 'pavos' && $tipoEstirpe === 'hybridconverter') {
            $tabla = 'tb_peso_pavos_hybridconverter';
        } elseif ($tipoAve === 'pavos' && $tipoEstirpe === 'nicholasselect') {
            $tabla = 'tb_peso_pavos_nicholasselect';
        } elseif ($tipoAve === 'reproductores' && $tipoEstirpe === 'ross') {
            $tabla = 'tb_peso_reproductores_ross';
        } elseif ($tipoAve === 'broilers' && $tipoEstirpe === 'ross') {
            $tabla = 'tb_peso_broilers_ross';
        } else {
            // Fallback: usar broilers ross por defecto
            $tabla = 'tb_peso_broilers_ross';
        }

        try {
            // Obtener todos los datos de referencia de la tabla correspondiente
            return DB::table($tabla)
                ->orderBy('edad')
                ->get();
        } catch (\Exception $e) {
            Log::error("Error al obtener datos de referencia de tabla {$tabla}: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Normaliza el valor del sexaje para que coincida con las columnas de la BD
     */
    private function normalizarSexaje(string $sexaje): string
    {
        $sexajeLimpio = strtolower(trim($sexaje));

        switch ($sexajeLimpio) {
            case 'machos':
            case 'macho':
                return 'machos';

            case 'hembras':
            case 'hembra':
                return 'hembras';

            case 'mixto':
            case 'mixed':
            default:
                return 'mixto';
        }
    }

    /**
     * Extrae el peso del registro según el sexaje (maneja diferentes nombres de columnas)
     */
    private function extraerPesoPorSexaje($registro, string $sexajeNormalizado): ?float
    {
        // Lista de posibles nombres de columnas para cada sexaje
        $columnasMap = [
            'machos' => ['machos', 'Machos', 'peso_machos', 'macho'],
            'hembras' => ['hembras', 'Hembras', 'peso_hembras', 'hembra'],
            'mixto' => ['mixto', 'Mixto', 'peso_mixto', 'mixed', 'promedio']
        ];

        $posiblesColumnas = $columnasMap[$sexajeNormalizado] ?? $columnasMap['mixto'];

        // Buscar la primera columna que existe y tiene valor
        foreach ($posiblesColumnas as $columna) {
            if (isset($registro->$columna) && $registro->$columna !== null) {
                return (float) $registro->$columna;
            }
        }

        // Si no encuentra ninguna columna específica, intentar obtener cualquier valor numérico
        $propiedades = get_object_vars($registro);
        foreach ($propiedades as $nombre => $valor) {
            if (is_numeric($valor) && $nombre !== 'id' && $nombre !== 'edad') {
                return (float) $valor;
            }
        }

        return null;
    }

    /**
     * Obtiene el peso de referencia para una edad específica según el sexaje
     */
    private function obtenerPesoReferencia($datosReferencia, int $edadDias, string $sexaje): ?float
    {
        if (!$datosReferencia || $datosReferencia->isEmpty()) {
            return null;
        }

        // Normalizar el sexaje
        $sexajeNormalizado = $this->normalizarSexaje($sexaje);

        // Buscar coincidencia exacta por edad
        $coincidenciaExacta = $datosReferencia->firstWhere('edad', $edadDias);
        if ($coincidenciaExacta) {
            return $this->extraerPesoPorSexaje($coincidenciaExacta, $sexajeNormalizado);
        }

        // Si no hay coincidencia exacta, buscar la edad más cercana
        $edadMasCercana = null;
        $menorDiferencia = PHP_INT_MAX;

        foreach ($datosReferencia as $registro) {
            $diferencia = abs($registro->edad - $edadDias);
            if ($diferencia < $menorDiferencia) {
                $menorDiferencia = $diferencia;
                $edadMasCercana = $registro;
            }
        }

        if ($edadMasCercana) {
            return $this->extraerPesoPorSexaje($edadMasCercana, $sexajeNormalizado);
        }

        return null;
    }

    /**
     * Genera pronóstico híbrido basado en datos históricos y referencia
     */
    private function generarPronosticoHibrido($datosHistoricos, $camada, $diasPronostico, $regresion): array
    {
        $ultimoDato = $datosHistoricos->last();
        $ultimaFecha = Carbon::parse($ultimoDato->dia);
        $ultimoPeso = (float)$ultimoDato->peso_medio;

        $pronostico = [];

        // Cargar datos de referencia según tipo de ave y estirpe
        $datosReferencia = $this->obtenerDatosReferencia($camada);

        for ($dia = 1; $dia <= $diasPronostico; $dia++) {
            $fechaPronostico = $ultimaFecha->copy()->addDays($dia);
            $edadCamada = Carbon::parse($camada->fecha_hora_inicio)->diffInDays($fechaPronostico);

            // Peso basado en regresión lineal
            $diasDesdeBase = Carbon::parse($regresion['fecha_base'])->diffInDays($fechaPronostico);
            $pesoRegresion = $regresion['pendiente'] * $diasDesdeBase + $regresion['intercepto'];

            // Peso basado en referencia
            $pesoReferencia = $this->obtenerPesoReferencia($datosReferencia, $edadCamada, $camada->sexaje);

            // Combinar ambos métodos (70% regresión, 30% referencia)
            $pesoFinal = $pesoReferencia
                ? ($pesoRegresion * 0.7 + $pesoReferencia * 0.3)
                : $pesoRegresion;

            $pronostico[] = [
                'dia_relativo' => $dia,
                'fecha' => $fechaPronostico->format('Y-m-d'),
                'edad_camada' => $edadCamada,
                'peso_proyectado' => round($pesoFinal, 1),
                'peso_referencia' => $pesoReferencia,
                'metodo' => $pesoReferencia ? 'hibrido' : 'regresion'
            ];
        }

        return $pronostico;
    }

    private function evaluarConfiabilidad($regresion, $diasDatos): string
    {
        $r2 = $regresion['r_cuadrado'];

        if ($r2 > 0.9 && $diasDatos >= 7) return 'excelente';
        if ($r2 > 0.8 && $diasDatos >= 5) return 'buena';
        if ($r2 > 0.6 && $diasDatos >= 3) return 'aceptable';

        return 'baja';
    }
}
