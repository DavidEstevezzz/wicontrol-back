<?php

namespace App\Http\Controllers;

use App\Models\Granja;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Models\EntradaDato;

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
     * Calcular la temperatura media para una granja en un rango de fechas
     * 
     * @param Request $request
     * @param string $numeroRega
     * @return \Illuminate\Http\JsonResponse
     */
    public function getTemperaturaMedia(Request $request, $numeroRega)
{
    // Validar parámetros
    $validator = Validator::make($request->all(), [
        'fecha_inicio' => 'required|date',
        'fecha_fin' => 'required|date|after_or_equal:fecha_inicio',
        'formato' => 'nullable|in:diario,total',  // Formato de respuesta: media diaria o media total
    ]);

    if ($validator->fails()) {
        return response()->json(['errors' => $validator->errors()], 422);
    }

    // Obtener parámetros
    $fechaInicio = $request->input('fecha_inicio');
    $fechaFin = $request->input('fecha_fin');
    $formato = $request->input('formato', 'diario'); // Por defecto, formato diario

    // Buscar la granja
    $granja = Granja::where('numero_rega', $numeroRega)->firstOrFail();
    
    // ID constante para el sensor de temperatura ambiente
    $SENSOR_TEMP_AMBIENTE = 6;
    
    // Obtener IDs de dispositivos de la granja
    $dispositivos = $granja->dispositivos()->pluck('numero_serie')->toArray();
    
    // Si no hay dispositivos, devolver respuesta vacía
    if (empty($dispositivos)) {
        return response()->json([
            'message' => 'No se encontraron dispositivos para esta granja',
            'data' => []
        ]);
    }

        // Consulta base para las lecturas de temperatura
        $query = EntradaDato::whereIn('id_dispositivo', $dispositivos)
            ->where('id_sensor', $SENSOR_TEMP_AMBIENTE)
            ->whereBetween('fecha', [$fechaInicio, $fechaFin])
            ->where('valor', '>', -50) // Filtrar lecturas inválidas (opcional)
            ->where('valor', '<', 60); // Filtrar lecturas inválidas (opcional)

        // Formatear resultados según el parámetro 'formato'
        if ($formato === 'total') {
            // Calcular media total del período
            $mediaTotal = $query->avg('valor');
            
            $result = [
                'granja' => $granja->nombre,
                'numero_rega' => $numeroRega,
                'fecha_inicio' => $fechaInicio,
                'fecha_fin' => $fechaFin,
                'temperatura_media' => round($mediaTotal, 2),
                'unidad' => '°C',
                'lecturas_totales' => $query->count()
            ];
        } else {
            // Calcular media diaria
            $mediaDiaria = $query->select(
                DB::raw('DATE(fecha) as dia'),
                DB::raw('ROUND(AVG(valor), 2) as temperatura_media'),
                DB::raw('COUNT(*) as lecturas')
            )
            ->groupBy('dia')
            ->orderBy('dia')
            ->get();
            
            $result = [
                'granja' => $granja->nombre,
                'numero_rega' => $numeroRega,
                'fecha_inicio' => $fechaInicio,
                'fecha_fin' => $fechaFin,
                'unidad' => '°C',
                'datos_diarios' => $mediaDiaria,
                'lecturas_totales' => $mediaDiaria->sum('lecturas')
            ];
        }

        return response()->json($result);
    }

    
}
