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
                try {
                    // PRIMERO verificar el valor actual ANTES de actualizar
                    $pesoCalib = $disp->pesoCalibracion;

                    // LUEGO actualizar
                    $updated = $disp->update([
                        'calibrado'      => 1,
                        'runCalibracion' => 0,
                        'errorCalib'     => 0,
                    ]);

                    if ($updated) {
                        // Usar el valor ORIGINAL, no el actualizado
                        if ($pesoCalib != -1) {
                            $abo = 0;
                        } else {
                            $abo = 1;
                        }
                        $out = ['dev' => $dev, 'ste' => 1, 'val' => 0, 'abo' => $abo];
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
                if ($err == 0) {
                    // Igual que en el PHP original: solo loguea, no devuelvas JSON
                    $log->info("Step 1: {$dev} calibrándose sin peso, siga esperando...");
                } else {
                    $disp->update(['errorCalib' => $err]);
                    $log->error("Step 1: error calibrando sin peso (err={$err})");
                }
                // Devuelve un 200 OK sin cuerpo para que Arduino siga esperando
                return response('', 200)
                    ->header('Content-Type', 'text/plain');

            case 2:
                try {
                    // 1) Guarda el peso que ya existe en la BD
                    $peso = $disp->pesoCalibracion;

                    // 2) Actualiza sólo calibrado, runCalibracion y errorCalib
                    $updated = $disp->update([
                        'calibrado'      => 2,
                        'runCalibracion' => 0,
                        'errorCalib'     => 0,
                    ]);

                    if ($updated) {
                        // 3) Recarga el modelo para asegurarte de leer el peso original
                        $disp->refresh();

                        if ($peso != 0) {
                            $out = [
                                'dev' => $dev,
                                'ste' => 3,
                                'val' => $peso,
                                'abo' => 0,
                            ];
                            $log->info("Step 2: paso a 3 con peso de calibración {$peso}");
                        } else {
                            $out = [
                                'dev' => $dev,
                                'ste' => 2,
                                'val' => 0,
                                'abo' => 0,
                            ];
                            $log->info("Step 2: {$dev} esperando que el usuario defina el peso en web");
                        }
                    } else {
                        $out = [
                            'dev' => $dev,
                            'ste' => 2,
                            'val' => 0,
                            'abo' => 1,
                        ];
                        $log->error("Step 2: fallo al actualizar calibrado para {$dev}");
                    }
                } catch (\Exception $e) {
                    $out = [
                        'dev' => $dev,
                        'ste' => 2,
                        'val' => 0,
                        'abo' => 1,
                    ];
                    $log->error("Exception en step 2 para {$dev}: " . $e->getMessage());
                }

                return response('@' . json_encode($out) . '@', 200)
                    ->header('Content-Type', 'text/plain');


            case 3:
                if ($err == 0) {
                    $log->info("Step 3: {$dev} calibrándose con peso, siga esperando...");
                } else {
                    $disp->update(['errorCalib' => $err]);
                    $log->error("Step 3: error calibrando con peso (err={$err})");
                }
                // 200 OK vacío
                return response('', 200)
                    ->header('Content-Type', 'text/plain');

            case 4:
                // 1) Sólo lee el peso original, antes de cualquier update
                $pesoOriginal = $disp->pesoCalibracion;

                if ($err == 0) {
                    // 2) Actualiza estado igual que el PHP puro
                    $disp->update([
                        'calibrado'      => 4,
                        'runCalibracion' => 0,
                        'errorCalib'     => 0,
                    ]);

                    // 3) Recarga para estar seguros (aunque no cambiamos pesoCalibracion)
                    $disp->refresh();

                    // 4) Decide el siguiente paso según el peso que tenía el dispositivo
                    if ($pesoOriginal == 0) {
                        // Si peso era 0, salta directamente al paso 5
                        $out = [
                            'dev' => $dev,
                            'ste' => 5,
                            'val' => 0,
                            'abo' => 0,
                        ];
                        $log->info("Step 4 → 5 (no había peso): " . json_encode($out));
                    } else {
                        // Si peso > 0, espera que el usuario retire el peso
                        $out = [
                            'dev' => $dev,
                            'ste' => 4,
                            'val' => 0,
                            'abo' => 0,
                        ];
                        $log->info("Step 4: esperando que usuario retire peso: " . json_encode($out));
                    }
                } else {
                    // 5) Si hay error, lo guardas y abortas
                    $disp->update(['errorCalib' => $err]);
                    $out = [
                        'dev' => $dev,
                        'ste' => 4,
                        'val' => 0,
                        'abo' => 1,
                    ];
                    $log->error("Step 4 error calibrando con peso ({$err}), abortando: " . json_encode($out));
                }

                // 6) Devuelve la respuesta siempre envuelta en @…@
                return response('@' . json_encode($out) . '@', 200)
                    ->header('Content-Type', 'text/plain');


            case 5:
                if ($err === 0) {
                    // Igual que en el original, solo registro en log:
                    $log->info("Step 5: {$dev} Esperando a quitar peso, siga llamando hasta que el usuario quite el peso en la UI.");
                } else {
                    // Si hay error, sí actualizamos errorCalib
                    $disp->update(['errorCalib' => $err]);
                    $log->error("Step 5: {$dev} Error esperando quitar peso (err={$err}).");
                }
                // NO devolvemos JSON con @…@: retornamos un 200 OK vacío
                // para que el Arduino siga en el mismo paso 5
                return response('', 200)
                    ->header('Content-Type', 'text/plain');

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
                    $out = ['dev' => $dev, 'ste' => 6, 'val' => 0, 'abo' => 1];
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
        $arr['pesoCalibracion'] = (float) $disp->pesoCalibracion;

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
        if ($data['step'] == 5) {
            $disp->update([
                'pesoCalibracion' => 0,
                'calibrado'       => 5,
                'runCalibracion'  => 0,
            ]);
        } elseif ($data['weight'] == 0) {
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
