<?php
// app/Http/Controllers/DispositivoController.php

namespace App\Http\Controllers;

use App\Models\Dispositivo;
use Illuminate\Http\Request;

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
            'id_instalacion'            => ['required','integer','exists:tb_instalacion,id_instalacion'],
            'numero_serie'              => ['required','string','max:50'],
            'ip_address'                => ['nullable','string','max:30'],
            'bateria'                   => ['nullable','string','max:11'],
            'fecha_hora_last_msg'       => ['nullable','date'],
            'fecha_hora_alta'           => ['required','date'],
            'alta'                      => ['boolean'],
            'calibrado'                 => ['boolean'],
            'pesoCalibracion'           => ['nullable','numeric'],
            'runCalibracion'            => ['boolean'],
            'sensoresConfig'            => ['nullable','integer'],
            'Lat'                       => ['nullable','string','max:10'],
            'Lon'                       => ['nullable','string','max:10'],
            'fw_version'                => ['required','string','max:20'],
            'hw_version'                => ['required','string','max:20'],
            'count'                     => ['integer'],
            'sensorMovimiento'          => ['integer'],
            'sensorCarga'               => ['integer'],
            'sensorLuminosidad'         => ['nullable','integer'],
            'sensorHumSuelo'            => ['nullable','integer'],
            'sensorTempAmbiente'        => ['nullable','integer'],
            'sensorHumAmbiente'         => ['nullable','integer'],
            'sensorPresion'             => ['nullable','integer'],
            'tiempoEnvio'               => ['integer'],
            'fecha_hora_baja'           => ['nullable','date'],
            'sensorTempYacija'          => ['integer'],
            'errorCalib'                => ['integer'],
            'reset'                     => ['boolean'],
            'fecha_ultima_calibracion'  => ['nullable','date'],
            'sensorCalidadAireCO2'      => ['nullable','integer'],
            'sensorCalidadAireTVOC'     => ['nullable','integer'],
            'sensorSHT20_temp'          => ['nullable','integer'],
            'sensorSHT20_humedad'       => ['nullable','integer'],
        ]);

        $disp = Dispositivo::create($data);
        return response()->json($disp, 201);
    }

    public function update(Request $request, $id)
    {
        $disp = Dispositivo::findOrFail($id);

        $data = $request->validate([
            'id_instalacion'   => ['sometimes','integer','exists:tb_instalacion,id_instalacion'],
            'numero_serie'     => ['sometimes','string','max:50'],
            ]);

        $disp->update($data);
        return response()->json($disp);
    }

    public function destroy($id)
    {
        Dispositivo::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
