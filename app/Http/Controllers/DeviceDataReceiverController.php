<?php
// app/Http/Controllers/DeviceDataReceiverController.php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\EntradaDato;
use App\Models\Dispositivo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DeviceDataReceiverController extends Controller
{
    /**
     * Recibir datos de dispositivos IoT
     * Equivalente al archivo receive.php original
     * 
     * @param Request $request
     * @return \Illuminate\Http\Response
     */
    public function receive(Request $request)
    {
        // Obtener la query string completa
        $queryString = $request->getQueryString();
        
        // Log inicial
        Log::channel('device_receiver')->info('Nuevo Get: ' . Carbon::now('Europe/Paris')->format('Y-m-d H:i:s'));
        
        // Validar que no esté vacío
        if (empty($queryString)) {
            Log::channel('device_receiver')->warning('Query string vacío: ' . $queryString);
            return response('@ERROR@', 400)->header('Content-Type', 'text/plain');
        }
        
        // Separar por @ para múltiples registros
        $array = explode('@', $queryString);
        $fallo = false;
        
        DB::beginTransaction();
        
        try {
            foreach ($array as $valor) {
                if ($this->isValidJSON($valor)) {
                    $decodedParams = json_decode($valor);
                    
                    // Obtener dispositivo
                    $dispositivo = $decodedParams->dev ?? null;
                    
                    Log::channel('device_receiver')->info('Procesando dispositivo: ' . $dispositivo);
                    
                    // Verificar que el dispositivo existe
                    if (!$dispositivo || !Dispositivo::where('numero_serie', $dispositivo)->exists()) {
                        Log::channel('device_receiver')->warning('Dispositivo no encontrado: ' . $dispositivo);
                        $fallo = true;
                        continue;
                    }
                    
                    // Procesar registros
                    $registros = $decodedParams->reg ?? [];
                    
                    foreach ($registros as $registro) {
                        $timestamp = $registro->tim ?? null;
                        $sensores = $registro->sen ?? null;
                        
                        if (!$timestamp || !$sensores) {
                            Log::channel('device_receiver')->warning('Registro sin timestamp o sensores');
                            $fallo = true;
                            continue;
                        }
                        
                        // Convertir timestamp del formato d/m/Y-H:i:s a Carbon
                        try {
                            $fecha = Carbon::createFromFormat('d/m/Y-H:i:s', str_replace('-', ' ', $timestamp), 'Europe/Paris');
                        } catch (\Exception $e) {
                            Log::channel('device_receiver')->error('Error al parsear fecha: ' . $timestamp);
                            $fallo = true;
                            continue;
                        }
                        
                        // Procesar cada sensor
                        $sensoresArray = explode(';', $sensores);
                        
                        foreach ($sensoresArray as $sensorData) {
                            $partes = explode('=', $sensorData);
                            
                            if (count($partes) == 2) {
                                $idSensor = $partes[0];
                                $valor = $partes[1];
                                
                                // Crear entrada de dato
                                try {
                                    EntradaDato::create([
                                        'id_sensor' => $idSensor,
                                        'valor' => $valor,
                                        'fecha' => $fecha,
                                        'id_dispositivo' => $dispositivo,
                                        'alta' => 1
                                    ]);
                                    
                                    Log::channel('device_receiver')->info(
                                        "Query insert device:{$dispositivo}, id_sensor:{$idSensor}, valor:{$valor} -> OK"
                                    );
                                    
                                } catch (\Exception $e) {
                                    Log::channel('device_receiver')->error('Falla la Query insert: ' . $e->getMessage());
                                    $fallo = true;
                                }
                            } else {
                                Log::channel('device_receiver')->warning('Falla el formato id: ' . $sensorData);
                                $fallo = true;
                            }
                        }
                    }
                } else {
                    Log::channel('device_receiver')->warning('JSON inválido: ' . $valor);
                    $fallo = true;
                }
            }
            
            if ($fallo) {
                DB::rollBack();
                Log::channel('device_receiver')->info('echo @ERROR@');
                return response('@ERROR@', 400)->header('Content-Type', 'text/plain');
            } else {
                DB::commit();
                Log::channel('device_receiver')->info('echo @OK@');
                return response('@OK@', 200)->header('Content-Type', 'text/plain');
            }
            
        } catch (\Exception $e) {
            DB::rollBack();
            Log::channel('device_receiver')->error('Error general: ' . $e->getMessage());
            return response('@ERROR@', 500)->header('Content-Type', 'text/plain');
        }
    }
    
    /**
     * Validar si una cadena es JSON válido
     * 
     * @param string $str
     * @return bool
     */
    private function isValidJSON($str)
    {
        json_decode($str);
        return json_last_error() == JSON_ERROR_NONE;
    }
}