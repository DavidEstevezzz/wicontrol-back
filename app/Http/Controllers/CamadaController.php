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
        if (! $camada->dispositivos()->where('dispositivo_id', $dispId)->exists()) {
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
        if ($camada->dispositivos()->where('dispositivo_id', $dispId)->exists()) {
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
    $pesoRef  = $this->getPesoReferencia($camada, $edadDias);

    // 3. Traer TODAS lecturas de peso del día
    $lecturas = $this->fetchPesos($seriales, $fecha)
                     ->sortBy('fecha');

    // 4. Pre-filtrado ±20% del peso ideal
    $consideradas = $this->filterByDesviacion($lecturas, $pesoRef, 0.20);

    // 5. Calcular media GLOBAL de las consideradas
    $valores      = $consideradas->pluck('valor')->map(fn($v) => (float)$v);
    $mediaGlobal  = $valores->count()
        ? round($valores->avg(), 2)
        : 0;

    // 5b. Calcular tramo de aceptación según coeficiente
    $tramoMin = null;
    $tramoMax = null;
    if (! is_null($coefHomogeneidad) && $mediaGlobal > 0) {
        $tramoMin = round($mediaGlobal * (1 - $coefHomogeneidad), 2);
        $tramoMax = round($mediaGlobal * (1 + $coefHomogeneidad), 2);
    }
    // 6. Clasificar cada lectura (incluye también las descartadas)
    $listado = $lecturas->map(function($e) use ($pesoRef, $mediaGlobal, $coefHomogeneidad) {
        $v     = (float) $e->valor;
        $fecha = $e->fecha;

        // 6.1 Si sale de ±20%, es descartada
        if (abs($v - $pesoRef) / $pesoRef > 0.20) {
            $estado = 'descartado';
        }
        else {
            // 6.2 Si no hay coeficiente, todo lo que pasa el ±20% es aceptado
            if (is_null($coefHomogeneidad)) {
                $estado = 'aceptada';
            }
            else {
                // 6.3 Con coeficiente: comparar contra mediaGlobal
                $diff = $mediaGlobal > 0
                    ? abs($v - $mediaGlobal) / $mediaGlobal
                    : 0;
                $estado = ($diff <= $coefHomogeneidad)
                    ? 'aceptada'
                    : 'rechazada';
            }
        }

        return [
            'id_dispositivo' => $e->id_dispositivo,
            'valor'          => $v,
            'fecha'          => $fecha,
            'estado'         => $estado,
        ];
    });

    // 7. Resumen
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

    // 8. Responder
    return response()->json([
        'total_pesadas'            => $totalConsideradas,
        'aceptadas'                => $aceptadasCount,
        'rechazadas_homogeneidad'  => $rechazadasCount,
        'peso_medio_global'        => $mediaGlobal,
        'peso_medio_aceptadas'     => $pesoMedioAceptadas,
        'tramo_aceptado'           => [
            'min' => $tramoMin,
            'max' => $tramoMax,
        ],
        'listado_pesos'            => $listado->values(),
    ], Response::HTTP_OK);
}


public function getByGranja(string $numeroRega): JsonResponse
    {
        $camadas = Camada::where('codigo_granja', $numeroRega)
                    ->orderBy('fecha_hora_inicio', 'desc')
                    ->get(['id_camada', 'nombre_camada']);

        return response()->json($camadas, Response::HTTP_OK);
    }
}
