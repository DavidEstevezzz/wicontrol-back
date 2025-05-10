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
        $edadDias = Carbon::parse($camada->fecha_hora_inicio)
            ->diffInDays(Carbon::parse($fecha));
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

    public function pesadasRango(Request $request, int $camadaId, int $dispId): JsonResponse
    {
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

        // 2. Cargar camada y validar dispositivo asociado
        $camada = Camada::findOrFail($camadaId);
        if (! $camada->dispositivos()
            ->wherePivot('id_dispositivo', $dispId)
            ->exists()) {
            return response()->json([
                'message' => "El dispositivo {$dispId} no pertenece a la camada {$camadaId}."
            ], Response::HTTP_BAD_REQUEST);
        }

        // 3. Preparar iteración diaria
        $inicio = Carbon::parse($fi);
        $fin    = Carbon::parse($ff);
        $period = CarbonPeriod::create($inicio, $fin);

        $result = [];
        foreach ($period as $dia) {
            $d = $dia->format('Y-m-d');

            // 4. Edad de la camada ese día
            $edadDias = Carbon::parse($camada->fecha_hora_inicio)
                ->diffInDays($dia);

            // 5. Peso ideal de referencia
            $pesoRef = $this->getPesoReferencia($camada, $edadDias);

            // 6. Lecturas del dispositivo ese día
            $lecturas = EntradaDato::where('id_dispositivo', $dispId)
                ->whereDate('fecha', $d)
                ->where('id_sensor', 2)
                ->get()
                ->map(fn($e) => (float)$e->valor);

            // 7. Filtrar por ±20% del peso ideal
            $consideradas = $lecturas
                ->filter(fn($v) => abs($v - $pesoRef) / $pesoRef <= 0.20)
                ->values();

            // 8. Media global de no descartadas
            $mediaGlobal = $consideradas->count()
                ? round($consideradas->avg(), 2)
                : 0.0;

            // 9. Aceptadas tras coeficiente
            $aceptadas = $consideradas
                ->filter(fn($v) => is_null($coef) || ($mediaGlobal > 0
                    && abs($v - $mediaGlobal) / $mediaGlobal <= $coef))
                ->values();

            // 10. Peso medio aceptadas
            $pesoMedio = $aceptadas->count()
                ? round($aceptadas->avg(), 2)
                : 0.0;

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

            // 12. Reconstruir lecturas con fecha/hora originales (solo aceptadas)
            $pesadas = EntradaDato::where('id_dispositivo', $dispId)
                ->whereDate('fecha', $d)
                ->where('id_sensor', 2)
                ->get(['valor', 'fecha'])
                ->filter(function ($e) use ($pesoRef, $mediaGlobal, $coef) {
                    $v = (float)$e->valor;
                    return abs($v - $pesoRef) / $pesoRef <= 0.20
                        && (is_null($coef)
                            || abs($v - $mediaGlobal) / ($mediaGlobal ?: 1) <= $coef);
                })
                ->map(function ($e) {
                    return [
                        'valor' => (float)$e->valor,
                        'fecha' => $e->fecha,
                        'hora'  => Carbon::parse($e->fecha)->format('H:i:s'),
                    ];
                })
                ->values();

            // 12.b) Contar aceptadas por hora (00–23)
            $conteoPorHora = collect(range(0, 23))
                ->mapWithKeys(fn($h) => [
                    str_pad($h, 2, '0', STR_PAD_LEFT) => 0
                ])
                ->merge(
                    $pesadas
                        ->groupBy(fn($e) => Carbon::parse($e->fecha)->format('H'))
                        ->map(fn($col) => $col->count())
                )
                ->all();

            // 13) Añadir al resultado
            $result[] = [
                'fecha'                 => $d,
                'peso_medio_aceptadas'  => $pesoMedio,
                'coef_variacion'        => $cv,
                'pesadas'               => $pesadas,
                'pesadas_horarias'      => $conteoPorHora,
            ];
        }

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
}
