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
        // Log para confirmar que el método se ejecuta
        Log::channel('device_receiver')->info('=== MÉTODO RECEIVE EJECUTADO ===');
        
        // Configurar timezone
        config(['app.timezone' => 'Europe/Paris']);
        
        // Obtener la query string completa
        $queryString = $request->getQueryString();
        
        // Log inicial
        Log::channel('device_receiver')->info('Nuevo Get: ' . Carbon::now('Europe/Paris')->format('Y-m-d H:i:s'));
        Log::channel('device_receiver')->info('Query String: ' . $queryString);
        
        // Validar que no esté vacío
        if (empty($finalQueryString)) {
            Log::channel('device_receiver')->warning('Query string vacío en todos los métodos');
            Log::channel('device_receiver')->info('$_GET: ' . json_encode($_GET));
            Log::channel('device_receiver')->info('$_POST: ' . json_encode($_POST));
            Log::channel('device_receiver')->info('Raw input: ' . file_get_contents('php://input'));
            Log::channel('device_receiver')->info('HTTP method: ' . $request->method());
            return response('@ERROR@', 400)->header('Content-Type', 'text/plain');
        }
        
        Log::channel('device_receiver')->info('Query string final usado, longitud: ' . strlen($finalQueryString));
        
        // Separar por @ para múltiples registros
        $array = explode('@', $finalQueryString);
        $fallo = false;
        
        // No usar transacciones para replicar el comportamiento original
        try {
            foreach ($array as $valor) {
                // Saltar elementos vacíos
                if (empty(trim($valor))) {
                    continue;
                }
                
                Log::channel('device_receiver')->info('Procesando valor: ' . $valor);
                
                if ($this->isValidJSON($valor)) {
                    $decodedParams = json_decode($valor);
                    
                    // Obtener dispositivo
                    $dispositivo = $decodedParams->dev ?? null;
                    
                    Log::channel('device_receiver')->info('Procesando dispositivo: ' . $dispositivo);
                    
                    // En el código original no valida la existencia del dispositivo
                    // Solo lo usa directamente, así que replicamos ese comportamiento
                    if (!$dispositivo) {
                        Log::channel('device_receiver')->warning('Dispositivo no especificado');
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
                        
                        Log::channel('device_receiver')->info("tim: {$timestamp}");
                        Log::channel('device_receiver')->info("sen: {$sensores}");
                        
                        // Procesar cada sensor
                        $sensoresArray = explode(';', $sensores);
                        
                        foreach ($sensoresArray as $sensorData) {
                            $partes = explode('=', $sensorData);
                            
                            if (count($partes) == 2) {
                                $idSensor = $partes[0];
                                $valor = $partes[1];
                                
                                // Crear la query SQL directamente como en el original
                                $fechaFormateada = str_replace('-', ' ', $timestamp);
                                
                                try {
                                    // Usar query directa para replicar exactamente el comportamiento original
                                    $sql = "INSERT INTO `tb_entrada_dato`(`id_sensor`,`valor`,`fecha`,`id_dispositivo`,`alta`) VALUES (?,?,STR_TO_DATE(?,'%d/%m/%Y %H:%i:%s'),?,1)";
                                    
                                    $result = DB::insert($sql, [
                                        $idSensor,
                                        $valor,
                                        $fechaFormateada,
                                        $dispositivo
                                    ]);
                                    
                                    if ($result) {
                                        $mensaje = Carbon::now('Europe/Paris')->format('Y-m-d H:i:s') . 
                                                  " Query insert device:{$dispositivo}, id_sensor:{$idSensor}, valor:{$valor} -> OK";
                                        Log::channel('device_receiver')->info($mensaje);
                                    } else {
                                        Log::channel('device_receiver')->error('Falla la Query insert');
                                        $fallo = true;
                                    }
                                    
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
                Log::channel('device_receiver')->info('echo @ERROR@');
                return response('@ERROR@', 400)->header('Content-Type', 'text/plain');
            } else {
                Log::channel('device_receiver')->info('echo @OK@');
                return response('@OK@', 200)->header('Content-Type', 'text/plain');
            }
            
        } catch (\Exception $e) {
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