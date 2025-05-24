<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Dispositivo;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class CalibrationController extends Controller
{
    /**
     * Endpoint que invoca el dispositivo para cada paso de calibración
     */
    public function calibrate(Request $request)
    {
        $log = Log::channel('calibration');

        $log->info('=== PETICIÓN RECIBIDA ===');
        $log->info('IP: ' . $request->ip());
        $log->info('URL: ' . $request->fullUrl());
        $log->info('Method: ' . $request->method());
        $log->info('Headers: ' . json_encode($request->headers->all()));

        // Log para confirmar que el método se ejecuta
        $log->info('=== MÉTODO CALIBRATE EJECUTADO ===');

        // Configurar timezone
        config(['app.timezone' => 'Europe/Paris']);

        // Debugging completo de la petición
        $log->info('Nuevo Get: ' . Carbon::now('Europe/Paris')->format('Y-m-d H:i:s'));

        // Obtener la query string como en el PHP original - EXACTAMENTE IGUAL
        $finalQueryString = $_SERVER['QUERY_STRING'] ?? '';

        // Si está vacío, intentar otros métodos
        if (empty($finalQueryString)) {
            $finalQueryString = $request->getQueryString() ?? '';
        }

        // Si aún está vacío, intentar desde REQUEST_URI
        if (empty($finalQueryString)) {
            $requestUri = $request->server('REQUEST_URI') ?? '';
            if (strpos($requestUri, '?') !== false) {
                $finalQueryString = substr($requestUri, strpos($requestUri, '?') + 1);
            }
        }

        $log->info('Query String RAW: ' . $finalQueryString);

        // IMPORTANTE: Decodificar URL encoding (navegadores lo encodean automáticamente)
        $finalQueryString = urldecode($finalQueryString);

        $log->info('Query String decoded: ' . $finalQueryString);

        // Validar JSON crudo
        if (empty($finalQueryString) || ! $this->isValidJson($finalQueryString)) {
            $log->warning("Invalid JSON received: {$finalQueryString}");
            return response('@ERROR@', 400)
                ->header('Content-Type', 'text/plain');
        }

        $log->info('Query string procesada correctamente, longitud: ' . strlen($finalQueryString));

        // Decodificar parámetros
        $params = json_decode($finalQueryString);
        $dev    = $params->dev ?? null;
        $step   = $params->ste ?? null;
        $val    = $params->val ?? null;
        $err    = $params->err ?? null;
        $tim    = $params->tim ?? null;
        $log->info('Parsed params: ' . json_encode($params));

        // CORREGIDO: Buscar dispositivo por numero_serie, no por id
        $disp = Dispositivo::where('numero_serie', $dev)->first();
        if (! $disp) {
            $log->warning("Device not found: {$dev}");
            $out = ['dev' => $dev, 'ste' => 1, 'val' => 0, 'abo' => 1];
            return response('@' . json_encode($out) . '@', 404)
                ->header('Content-Type', 'text/plain');
        }

        $log->info("Device found - ID: {$disp->id_dispositivo}, Serial: {$disp->numero_serie}");

        // Procesar según paso
        switch ($step) {

            case 0:
                // ready para calibrar peso muerto
                try {
                    $updated = $disp->update([
                        'calibrado'      => 1,
                        'runCalibracion' => 0,
                        'errorCalib'     => 0,
                    ]);
                    if ($updated) {
                        if ($disp->pesoCalibracion != -1) {
                            $out = ['dev' => $dev, 'ste' => 1, 'val' => 0, 'abo' => 0];
                        } else {
                            $out = ['dev' => $dev, 'ste' => 1, 'val' => 0, 'abo' => 1];
                        }
                    } else {
                        $out = ['dev' => $dev, 'ste' => 1, 'val' => 0, 'abo' => 1];
                        $log->error("Step 0 update failed for {$dev}");
                    }
                } catch (\Exception $e) {
                    $out = ['dev' => $dev, 'ste' => 1, 'val' => 0, 'abo' => 1];
                    $log->error("Exception in step 0 for {$dev}: " . $e->getMessage());
                }
                $log->info("Step 0 output: " . json_encode($out));
                return response('@' . json_encode($out) . '@', 200)
                    ->header('Content-Type', 'text/plain');

            case 1:
                // Calibración peso muerto ok/nok
                if ($err == 0) {
                    // esperando a calibrarse con peso
                    $log->info("Step 1: {$dev} Calibrandose sin peso, espere...");
                } else {
                    $disp->update(['errorCalib' => $err]);
                    $log->error("Step 1: {$dev} Error calibrando sin peso, calibracion abortada, error: {$err}");
                }
                // No response, solo log
                return response()->noContent();

            case 2:
                // Esperando calibración con peso ok
                try {
                    $updated = $disp->update([
                        'calibrado'      => 2,
                        'runCalibracion' => 0,
                        'errorCalib'     => 0,
                    ]);
                    if ($updated) {
                        // Recargar el modelo para obtener valores actualizados
                        $disp->refresh();

                        if ($disp->pesoCalibracion != 0) {
                            $out = ['dev' => $dev, 'ste' => 3, 'val' => $disp->pesoCalibracion, 'abo' => 0];
                            $log->info("Step 2: Transiciona al paso 3 calibracion con peso " . json_encode($out));
                        } else {
                            $out = ['dev' => $dev, 'ste' => 2, 'val' => 0, 'abo' => 0];
                            $log->info("Step 2: {$dev} Esperando al usuario en la web a añadir el peso...");
                        }
                    } else {
                        $out = ['dev' => $dev, 'ste' => 2, 'val' => 0, 'abo' => 1];
                        $log->error("Step 2 update failed for {$dev}");
                    }
                } catch (\Exception $e) {
                    $out = ['dev' => $dev, 'ste' => 2, 'val' => 0, 'abo' => 1];
                    $log->error("Exception in step 2 for {$dev}: " . $e->getMessage());
                }
                return response('@' . json_encode($out) . '@', 200)
                    ->header('Content-Type', 'text/plain');

            case 3:
                // Esperando calibración con peso
                if ($err == 0) {
                    // esperando a calibrarse con peso
                    $log->info("Step 3: {$dev} Calibrandose con peso, espere...");
                } else {
                    $disp->update(['errorCalib' => $err]);
                    $log->error("Step 3: {$dev} Error calibrando con peso, calibracion abortada, error: {$err}");
                }
                // No response, solo log
                return response()->noContent();

            case 4:
                // Calibración con peso OK/NOK
                if ($err == 0) {
                    try {
                        $updated = $disp->update([
                            'calibrado'      => 4,
                            'runCalibracion' => 0,
                            'errorCalib'     => 0,
                        ]);
                        if ($updated) {
                            $log->info("Step 4: Calibracion con peso OK!");

                            // Recargar el modelo para obtener valores actualizados
                            $disp->refresh();

                            if ($disp->pesoCalibracion == 0) {
                                $out = ['dev' => $dev, 'ste' => 5, 'val' => 0, 'abo' => 0];
                                $log->info("Step 4: Transiciona al paso 5 quitar peso " . json_encode($out));
                            } else {
                                $out = ['dev' => $dev, 'ste' => 4, 'val' => 0, 'abo' => 0];
                                $log->info("Step 4: {$dev} Esperando al usuario en la web a quitar el peso...");
                            }
                        } else {
                            $out = ['dev' => $dev, 'ste' => 4, 'val' => 0, 'abo' => 1];
                            $log->error("Step 4 update failed for {$dev}");
                        }
                    } catch (\Exception $e) {
                        $out = ['dev' => $dev, 'ste' => 4, 'val' => 0, 'abo' => 1];
                        $log->error("Exception in step 4 for {$dev}: " . $e->getMessage());
                    }
                } else {
                    $disp->update(['errorCalib' => $err]);
                    $out = ['dev' => $dev, 'ste' => 2, 'val' => 0, 'abo' => 1];
                    $log->error("Step 4: {$dev} Error calibrando con peso, aborting, code: {$err}");
                }
                return response('@' . json_encode($out) . '@', 200)
                    ->header('Content-Type', 'text/plain');

            case 5:
                // Volver a peso muerto por parte del usuario
                if ($err == 0) {
                    // esperando a quitar peso
                    $log->info("Step 5: {$dev} Esperando a quitar peso, espere...");
                } else {
                    $disp->update(['errorCalib' => $err]);
                    $log->error("Step 5: {$dev} Error esperando a quitar peso, calibracion abortada, error: {$err}");
                }
                // No response, solo log
                return response()->noContent();

            case 6:
                if ($err == 0) {
                    try {
                        $updated = $disp->update([
                            'calibrado'               => 6,
                            'runCalibracion'          => 0,
                            'errorCalib'              => 0,
                            'fecha_ultima_calibracion' => Carbon::now('Europe/Paris'),
                        ]);
                        if ($updated) {
                            $out = ['dev' => $dev, 'ste' => 6, 'val' => 0, 'abo' => 0];
                            $log->info("Step 6: Calibracion completada OK! " . json_encode($out));
                        } else {
                            $out = ['dev' => $dev, 'ste' => 6, 'val' => 0, 'abo' => 1];
                            $log->error("Step 6 update failed for {$dev}");
                        }
                    } catch (\Exception $e) {
                        $out = ['dev' => $dev, 'ste' => 6, 'val' => 0, 'abo' => 1];
                        $log->error("Exception in step 6 for {$dev}: " . $e->getMessage());
                    }
                } else {
                    $disp->update(['errorCalib' => $err]);
                    $out = ['dev' => $dev, 'ste' => 2, 'val' => 0, 'abo' => 1];
                    $log->error("Step 6: {$dev} Error finalizando calibracion, code: {$err}");
                }
                return response('@' . json_encode($out) . '@', 200)
                    ->header('Content-Type', 'text/plain');

            default:
                $log->warning("Step desconocido: {$step} for {$dev}, aborting.");
                $out = ['dev' => $dev, 'ste' => $step, 'val' => 0, 'abo' => 1];
                return response('@' . json_encode($out) . '@', 200)
                    ->header('Content-Type', 'text/plain');
        }
    }

    /**
     * Obtiene el estado de calibración para el front-end
     */
    /**
     * Obtiene el estado de calibración para el front-end
     */
    public function getStep(Request $request)
{
    $data = $request->validate([
        'device' => 'required|string',
    ]);

    $disp = Dispositivo::where('numero_serie', $data['device'])->first();
    if (! $disp) {
        return response()->json([
            'success' => false,
            'messages' => 'Device not found'
        ], 404);
    }

    // Convertimos a array y forzamos los tipos correctos
    $arr = $disp->toArray();
    $arr['calibrado']      = (int) $disp->calibrado;
    $arr['runCalibracion'] = (int) $disp->runCalibracion;
    $arr['errorCalib']     = (int) $disp->errorCalib;
    $arr['pesoCalibracion']= (float) $disp->pesoCalibracion;

    return response()->json([
        'success' => true,
        'messages' => json_encode([$arr]),
    ]);
}


    /**
     * Recibe desde la UI el peso marcado por el usuario
     */
    public function sendStep(Request $request)
    {
        $data = $request->validate([
            'device' => 'required|string', // Cambiar a string
            'weight' => 'required|numeric',
            'step'   => 'required|integer',
        ]);

        // Buscar por numero_serie como el PHP original
        $disp = Dispositivo::where('numero_serie', $data['device'])->first();

        if (! $disp) {
            return response()->json([
                'success' => false,
                'messages' => 'Device not found'
            ], 404);
        }

        // Lógica exacta del PHP original
        if ($data['weight'] == 0) {
            $disp->update([
                'pesoCalibracion'          => 0,
                'calibrado'                => 0,
                'errorCalib'               => 0,
                'fecha_ultima_calibracion' => null,
                'runCalibracion'           => 1,
            ]);
        } else {
            $disp->update([
                'pesoCalibracion' => $data['weight'],
                'runCalibracion'  => 1
            ]);
        }

        if ($data['step'] == 5) {
            $disp->update([
                'pesoCalibracion' => 0,
                'calibrado'       => 5,
                'runCalibracion'  => 0,
            ]);
        }

        return response()->json([
            'success' => true,
            'messages' => 'actualizada Ok.'
        ]);
    }

    /**
     * Valida que una cadena sea JSON válido
     */
    private function isValidJson(string $str): bool
    {
        json_decode($str);
        return json_last_error() === JSON_ERROR_NONE;
    }
}
