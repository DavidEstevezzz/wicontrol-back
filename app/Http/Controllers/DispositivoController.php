<?php
// app/Http/Controllers/DispositivoController.php

namespace App\Http\Controllers;

use App\Models\Dispositivo;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class DispositivoController extends Controller
{
    public function index()
    {
        return Dispositivo::with('instalacion')->get();
    }

    public function show($id)
    {
        $disp = Dispositivo::with('instalacion')->findOrFail($id);
        return response()->json($disp);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'id_instalacion' => ['nullable', 'integer'],
            'numero_serie'              => ['required', 'string', 'max:50'],
            'ip_address'                => ['nullable', 'string', 'max:30'],
            'bateria'                   => ['nullable', 'string', 'max:11'],
            'fecha_hora_last_msg'       => ['nullable', 'date'],
            'fecha_hora_alta'           => ['required', 'date'],
            'alta'                      => ['boolean'],
            'calibrado'                 => ['boolean'],
            'pesoCalibracion'           => ['nullable', 'numeric'],
            'runCalibracion'            => ['boolean'],
            'sensoresConfig'            => ['nullable', 'integer'],
            'Lat'                       => ['nullable', 'string', 'max:10'],
            'Lon'                       => ['nullable', 'string', 'max:10'],
            'fw_version'                => ['nullable', 'string', 'max:20'],
            'hw_version'                => ['nullable', 'string', 'max:20'],
            'count'                     => ['nullable', 'integer'],
            'sensorMovimiento'          => ['integer'],
            'sensorCarga'               => ['integer'],
            'sensorLuminosidad'         => ['nullable', 'integer'],
            'sensorHumSuelo'            => ['nullable', 'integer'],
            'sensorTempAmbiente'        => ['nullable', 'integer'],
            'sensorHumAmbiente'         => ['nullable', 'integer'],
            'sensorPresion'             => ['nullable', 'integer'],
            'tiempoEnvio'               => ['integer'],
            'fecha_hora_baja'           => ['nullable', 'date'],
            'sensorTempYacija'          => ['integer'],
            'errorCalib'                => ['nullable', 'integer'],
            'reset'                     => ['nullable', 'boolean'],
            'fecha_ultima_calibracion'  => ['nullable', 'date'],
            'sensorCalidadAireCO2'      => ['nullable', 'integer'],
            'sensorCalidadAireTVOC'     => ['nullable', 'integer'],
            'sensorSHT20_temp'          => ['nullable', 'integer'],
            'sensorSHT20_humedad'       => ['nullable', 'integer'],
        ]);

        $disp = Dispositivo::create($data);
        return response()->json($disp, 201);
    }

    public function update(Request $request, $id)
    {
        $disp = Dispositivo::findOrFail($id);

        // ✅ AGREGADAS TODAS LAS REGLAS DE VALIDACIÓN PARA UPDATE
        $data = $request->validate([
            // Campos básicos
            'id_instalacion'            => ['sometimes', 'integer', 'exists:tb_instalacion,id_instalacion'],
            'numero_serie'              => ['sometimes', 'string', 'max:50'],
            'ip_address'                => ['sometimes', 'nullable', 'string', 'max:30'],
            'bateria'                   => ['sometimes', 'nullable', 'string', 'max:11'],
            'fecha_hora_last_msg'       => ['sometimes', 'nullable', 'date'],
            'fecha_hora_alta'           => ['sometimes', 'date'],
            'alta'                      => ['sometimes', 'boolean'],
            'calibrado'                 => ['sometimes', 'boolean'],
            'pesoCalibracion'           => ['sometimes', 'nullable', 'numeric'],
            'runCalibracion'            => ['sometimes', 'boolean'],
            'sensoresConfig'            => ['sometimes', 'nullable', 'integer'],
            'Lat'                       => ['sometimes', 'nullable', 'string', 'max:10'],
            'Lon'                       => ['sometimes', 'nullable', 'string', 'max:10'],
            'fw_version'                => ['sometimes', 'string', 'max:20'],
            'hw_version'                => ['sometimes', 'string', 'max:20'],
            'count'                     => ['sometimes', 'integer'],
            'fecha_hora_baja'           => ['sometimes', 'nullable', 'date'],
            'errorCalib'                => ['sometimes', 'integer'],
            'reset'                     => ['sometimes', 'boolean'],
            'fecha_ultima_calibracion'  => ['sometimes', 'nullable', 'date'],

            // ✅ CAMPOS DE SENSORES - ESTOS FALTABAN
            'sensorMovimiento'          => ['sometimes', 'integer'],
            'sensorCarga'               => ['sometimes', 'integer'],
            'sensorLuminosidad'         => ['sometimes', 'nullable', 'integer'],
            'sensorHumSuelo'            => ['sometimes', 'nullable', 'integer'],
            'sensorTempAmbiente'        => ['sometimes', 'nullable', 'integer'],
            'sensorHumAmbiente'         => ['sometimes', 'nullable', 'integer'],
            'sensorPresion'             => ['sometimes', 'nullable', 'integer'],
            'sensorTempYacija'          => ['sometimes', 'integer'],
            'sensorCalidadAireCO2'      => ['sometimes', 'nullable', 'integer'],
            'sensorCalidadAireTVOC'     => ['sometimes', 'nullable', 'integer'],
            'sensorSHT20_temp'          => ['sometimes', 'nullable', 'integer'],
            'sensorSHT20_humedad'       => ['sometimes', 'nullable', 'integer'],
            'tiempoEnvio'               => ['sometimes', 'integer'],
        ]);

        $disp->update($data);

        // Recargar el modelo para obtener los datos actualizados
        $disp->refresh();

        return response()->json($disp);
    }

    public function destroy($id)
    {
        Dispositivo::findOrFail($id)->delete();
        return response()->json(null, 204);
    }

    /**
     * Devuelve la información de la granja y nave vinculadas a un dispositivo.
     *
     * @param  int  $id  ID del dispositivo
     * @return \Illuminate\Http\JsonResponse
     */
    public function getGranjaYNave($id)
    {
        // Buscamos el dispositivo con sus relaciones
        $dispositivo = Dispositivo::with(['instalacion', 'instalacion.granja'])
            ->findOrFail($id);

        // Si no tiene instalación asignada
        if (!$dispositivo->instalacion) {
            return response()->json([
                'error' => 'El dispositivo no tiene instalación asignada',
            ], 404);
        }

        // Si tiene instalación pero no tiene granja asociada
        if (!$dispositivo->instalacion->granja) {
            return response()->json([
                'error' => 'La instalación del dispositivo no tiene granja asociada',
                'instalacion_id' => $dispositivo->instalacion->id_instalacion,
                'numero_rega' => $dispositivo->instalacion->numero_rega,
            ], 404);
        }

        // Obtenemos la información de la nave
        $idNave = $dispositivo->instalacion->id_nave;

        // Construimos la respuesta
        $respuesta = [
            'dispositivo' => [
                'id' => $dispositivo->id_dispositivo,
                'numero_serie' => $dispositivo->numero_serie,
            ],
            'instalacion' => [
                'id' => $dispositivo->instalacion->id_instalacion,
            ],
            'granja' => [
                'numero_rega' => $dispositivo->instalacion->numero_rega,
                'nombre' => $dispositivo->instalacion->granja->nombre,
                'direccion' => $dispositivo->instalacion->granja->direccion,
                'localidad' => $dispositivo->instalacion->granja->localidad,
                'provincia' => $dispositivo->instalacion->granja->provincia,
            ],
            'nave' => [
                'id' => $idNave,
                // Si necesitas más información sobre la nave, deberías 
                // agregar una relación en el modelo Instalacion y cargarla aquí
            ]
        ];

        return response()->json($respuesta);
    }

    /**
     * Obtiene todas las camadas vinculadas a un dispositivo.
     *
     * @param  int  $id
     * @return JsonResponse
     */
    public function getCamadas(int $id): JsonResponse
    {
        $dispositivo = Dispositivo::findOrFail($id);

        $camadas = $dispositivo->camadas()->get();

        return response()->json($camadas);
    }

    /**
     * Programa un reset para el dispositivo
     * @param int $id
     * @return JsonResponse
     */
    public function programarReset($id)
    {
        try {
            $dispositivo = Dispositivo::findOrFail($id);

            // Verificar que el dispositivo esté activo
            if (!$dispositivo->alta) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se puede resetear un dispositivo inactivo'
                ], 400);
            }

            // Activar el flag de reset
            $dispositivo->reset = true;
            $dispositivo->save();

            return response()->json([
                'success' => true,
                'message' => 'Reset programado correctamente. Se ejecutará en el próximo heartbeat.',
                'dispositivo' => [
                    'id' => $dispositivo->id_dispositivo,
                    'numero_serie' => $dispositivo->numero_serie,
                    'reset' => $dispositivo->reset
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al programar el reset: ' . $e->getMessage()
            ], 500);
        }
    }
}
