<?php

namespace App\Http\Controllers;

use App\Models\Granja;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Models\EntradaDato;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use App\Models\Camada;
use App\Models\Dispositivo;

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
    $data = $request->validate([
        'fecha_inicio' => 'required|date',
        'fecha_fin'    => 'required|date|after_or_equal:fecha_inicio',
        'formato'      => 'nullable|in:diario,total',
    ]);

    $granja = Granja::where('numero_rega', $numeroRega)
                    ->firstOrFail();

    $SENSOR = 6;

    // Base query sobre hasManyThrough
    $query = $granja->entradasDatos()
                    ->where('id_sensor', $SENSOR)
                    ->whereBetween('fecha', [
                        $data['fecha_inicio'],
                        $data['fecha_fin']
                    ]);

    if ($data['formato'] === 'total') {
        $media = $query->avg('valor');
        return response()->json([
            'granja'              => $granja->nombre,
            'numero_rega'         => $numeroRega,
            'fecha_inicio'        => $data['fecha_inicio'],
            'fecha_fin'           => $data['fecha_fin'],
            'temperatura_media'   => round($media, 2),
            'unidad'              => '°C',
            'lecturas_totales'    => $query->count(),
        ]);
    }

    // -> formato diario:
    $diario = $query->select(
            DB::raw('DATE(fecha) as dia'),
            DB::raw('ROUND(AVG(valor),2) as temperatura_media'),
            DB::raw('COUNT(*) as lecturas')
        )
        ->groupBy('dia')
        ->orderBy('dia')
        ->get();

    return response()->json([
        'granja'            => $granja->nombre,
        'numero_rega'       => $numeroRega,
        'fecha_inicio'      => $data['fecha_inicio'],
        'fecha_fin'         => $data['fecha_fin'],
        'unidad'            => '°C',
        'datos_diarios'     => $diario,
        'lecturas_totales'  => $diario->sum('lecturas'),
    ]);
}

public function getByEmpresa(int $empresa): JsonResponse
    {
        $granjas = Granja::where('empresa_id', $empresa)
                    ->orderBy('nombre')
                    ->get(['id', 'nombre', 'numero_rega']);

        return response()->json($granjas, Response::HTTP_OK);
    }

/**
 * Obtiene todos los dispositivos activos vinculados a camadas activas de una granja específica.
 *
 * @param  string  $numeroRega
 * @return JsonResponse
 */
public function getDispositivosActivos(string $numeroRega): JsonResponse
{
    // Validar que la granja existe
    $granja = Granja::where('numero_rega', $numeroRega)->firstOrFail();

    // Obtener las camadas activas de la granja
    $camadasActivas = Camada::where('codigo_granja', $numeroRega)
        ->where('alta', 1)
        ->pluck('id_camada');
    
    if ($camadasActivas->isEmpty()) {
        return response()->json([
            'message' => 'No se encontraron camadas activas para esta granja.',
            'dispositivos' => []
        ]);
    }
    
    // Recuperamos los dispositivos vinculados a estas camadas
    // usando una subconsulta para evitar duplicados
    $dispositivos = Dispositivo::whereHas('camadas', function ($query) use ($camadasActivas) {
            $query->whereIn('tb_camada.id_camada', $camadasActivas);
        })
        ->select([
            'tb_dispositivo.id_dispositivo',
            'tb_dispositivo.numero_serie',
            'tb_dispositivo.ip_address',
            // Otros campos que necesites
        ])
        ->distinct() // Para evitar duplicados si un dispositivo está en varias camadas
        ->get();
    
    return response()->json([
        'total' => $dispositivos->count(),
        'dispositivos' => $dispositivos
    ]);
} 
    
}
