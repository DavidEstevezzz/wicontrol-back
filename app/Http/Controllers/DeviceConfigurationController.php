<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Dispositivo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class DeviceConfigurationController extends Controller
{
    /**
     * Configurar dispositivo IoT cuando se conecta
     * Equivalente al archivo PHP original que escucha dispositivos
     * 
     * @param Request $request
     * @return \Illuminate\Http\Response
     */
    public function configure(Request $request)
    {
        // Validar parámetros requeridos
        try {
            $validated = $request->validate([
                'dispositivo' => 'required|string',
                'fw_ver' => 'required|string',
                'ip_address' => 'required|ip',
                'tension' => 'required|numeric',
                'hw_ver' => 'required|string'
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::channel('device_configuration')->warning('Parámetros inválidos: ' . json_encode($request->all()));
            return response('@ERROR@', 400);
        }

        // Log de la petición recibida
        Log::channel('device_configuration')->info('Nuevo Get: ', $request->all());

        try {
            // Buscar el dispositivo usando Eloquent
            $dispositivo = Dispositivo::where('numero_serie', $validated['dispositivo'])->first();

            if (!$dispositivo) {
                Log::channel('device_configuration')->warning('Dispositivo no encontrado en bbdd: ' . $validated['dispositivo']);
                return response('@ERROR@', 404);
            }

            // Actualizar información del dispositivo
            $dispositivo->pesoCalibracion = 0;
            $dispositivo->runCalibracion = false;
            $dispositivo->calibrado = false;
            $dispositivo->ip_address = $validated['ip_address'];
            $dispositivo->bateria = $validated['tension'];
            $dispositivo->fw_version = $validated['fw_ver'];
            $dispositivo->hw_version = $validated['hw_ver'];
            $dispositivo->fecha_hora_last_msg = now();
            
            if ($dispositivo->save()) {
                Log::channel('device_configuration')->info('Query update -> OK');
                
                // Construir mensaje de configuración
                $msg = $this->buildConfigurationMessage($dispositivo);
                
                Log::channel('device_configuration')->info('echo ' . $msg);
                
                return response($msg, 200)
                    ->header('Content-Type', 'text/plain');
            } else {
                Log::channel('device_configuration')->error('Falla la Query update para dispositivo: ' . $validated['dispositivo']);
                return response('@ERROR@', 500);
            }

        } catch (\Exception $e) {
            Log::channel('device_configuration')->error('Error al configurar dispositivo: ' . $e->getMessage());
            return response('@ERROR@', 500);
        }
    }

    /**
     * Construir mensaje de configuración para el dispositivo
     * 
     * @param Dispositivo $dispositivo
     * @return string
     */
    private function buildConfigurationMessage(Dispositivo $dispositivo): string
    {
        $msg = "@sensores";
        
        // Sensor de carga (ID: 2)
        if ($dispositivo->sensorCarga != -1) {
            $msg .= ">2,1,0";
        }
        
        // Sensor de movimiento (ID: 3)
        if ($dispositivo->sensorMovimiento != -1) {
            $msg .= ">3,1,0";
        }
        
        // Sensor de luminosidad (ID: 4)
        if ($dispositivo->sensorLuminosidad != -1) {
            $msg .= ">4,2," . $dispositivo->sensorLuminosidad;
        }
        
        // Sensor de humedad ambiente (ID: 5)
        if ($dispositivo->sensorHumAmbiente != -1) {
            $msg .= ">5,2," . $dispositivo->sensorHumAmbiente;
        }
        
        // Sensor de temperatura ambiente (ID: 6)
        if ($dispositivo->sensorTempAmbiente != -1) {
            $msg .= ">6,2," . $dispositivo->sensorTempAmbiente;
        }
        
        // Sensor de presión (ID: 9)
        if ($dispositivo->sensorPresion != -1) {
            $msg .= ">9,2," . $dispositivo->sensorPresion;
        }
        
        // Sensor de calidad de aire CO2 (ID: 10)
        if ($dispositivo->sensorCalidadAireCO2 != -1) {
            $msg .= ">10,2," . $dispositivo->sensorCalidadAireCO2;
        }
        
        // Sensor de calidad de aire TVOC (ID: 11)
        if ($dispositivo->sensorCalidadAireTVOC != -1) {
            $msg .= ">11,2," . $dispositivo->sensorCalidadAireTVOC;
        }
        
        // Sensor SHT20 temperatura (ID: 12)
        if ($dispositivo->sensorSHT20_temp != -1) {
            $msg .= ">12,2," . $dispositivo->sensorSHT20_temp;
        }
        
        // Sensor SHT20 humedad (ID: 13)
        if ($dispositivo->sensorSHT20_humedad != -1) {
            $msg .= ">13,2," . $dispositivo->sensorSHT20_humedad;
        }
        
        $freq = $dispositivo->tiempoEnvio ?? 30;
        
        // Agregar hora y frecuencia
        // Usar timezone Europe/Paris como en el archivo original
        $msg .= ";hora>" . Carbon::now('Europe/Paris')->format('d/m/Y-H:i:s');
        $msg .= ";freq>" . $freq . "@";
        
        return $msg;
    }
}