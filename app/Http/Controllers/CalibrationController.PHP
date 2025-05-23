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
        // Raw query string (JSON esperado)d
        $raw = $request->getQueryString();
        $log->info("Raw query: {$raw}");

        // Validar JSON crudo
        if (empty($raw) || ! $this->isValidJson($raw)) {
            $log->warning("Invalid JSON received: {$raw}");
            return response('@ERROR@', 400)
                   ->header('Content-Type', 'text/plain');
        }

        // Decodificar parámetros
        $json   = urldecode($raw);
        $params = json_decode($json);
        $dev    = $params->dev ?? null;
        $step   = $params->ste ?? null;
        $val    = $params->val ?? null;
        $err    = $params->err ?? null;
        $tim    = $params->tim ?? null;
        $log->info('Parsed params: ' . json_encode($params));

        // Buscar dispositivo
        $disp = Dispositivo::find($dev);
        if (! $disp) {
            $log->warning("Device not found: {$dev}");
            $out = ['dev'=>$dev,'ste'=>1,'val'=>0,'abo'=>1];
            return response('@'.json_encode($out).'@', 404)
                   ->header('Content-Type', 'text/plain');
        }

        // Procesar según paso
        switch ($step) {

            case 0:
                try {
                    $updated = $disp->update([
                        'calibrado'      => 1,
                        'runCalibracion' => 0,
                        'errorCalib'     => 0,
                    ]);
                    if ($updated) {
                        $abo = ($disp->pesoCalibracion != -1) ? 0 : 1;
                        $out = ['dev'=>$dev,'ste'=>1,'val'=>0,'abo'=>$abo];
                    } else {
                        $out = ['dev'=>$dev,'ste'=>1,'val'=>0,'abo'=>1];
                        $log->error("Step 0 update failed for {$dev}");
                    }
                } catch (\Exception $e) {
                    $out = ['dev'=>$dev,'ste'=>1,'val'=>0,'abo'=>1];
                    $log->error("Exception in step 0 for {$dev}: " . $e->getMessage());
                }
                $log->info("Step 0 output: " . json_encode($out));
                return response('@'.json_encode($out).'@',200)
                       ->header('Content-Type','text/plain');

            case 1:
                if ($err == 0) {
                    $log->info("Step 1: {$dev} calibrating without weight...");
                } else {
                    $disp->update(['errorCalib' => $err]);
                    $log->error("Step 1: {$dev} error calibrating without weight, code: {$err}");
                }
                return response()->noContent();

            case 2:
                try {
                    $updated = $disp->update([
                        'calibrado'      => 2,
                        'runCalibracion' => 0,
                        'errorCalib'     => 0,
                    ]);
                    if ($updated) {
                        if ($disp->pesoCalibracion != 0) {
                            $out = ['dev'=>$dev,'ste'=>3,'val'=>$disp->pesoCalibracion,'abo'=>0];
                        } else {
                            $out = ['dev'=>$dev,'ste'=>2,'val'=>0,'abo'=>0];
                        }
                    } else {
                        $out = ['dev'=>$dev,'ste'=>2,'val'=>0,'abo'=>1];
                        $log->error("Step 2 update failed for {$dev}");
                    }
                } catch (\Exception $e) {
                    $out = ['dev'=>$dev,'ste'=>2,'val'=>0,'abo'=>1];
                    $log->error("Exception in step 2 for {$dev}: " . $e->getMessage());
                }
                $log->info("Step 2 output: " . json_encode($out));
                return response('@'.json_encode($out).'@',200)
                       ->header('Content-Type','text/plain');

            case 3:
                if ($err == 0) {
                    $log->info("Step 3: {$dev} calibrating with weight...");
                } else {
                    $disp->update(['errorCalib' => $err]);
                    $log->error("Step 3: {$dev} error calibrating with weight, code: {$err}");
                }
                return response()->noContent();

            case 4:
                if ($err == 0) {
                    try {
                        $updated = $disp->update([
                            'calibrado'      => 4,
                            'runCalibracion' => 0,
                            'errorCalib'     => 0,
                        ]);
                        if ($updated) {
                            if ($disp->pesoCalibracion == 0) {
                                $out = ['dev'=>$dev,'ste'=>5,'val'=>0,'abo'=>0];
                            } else {
                                $out = ['dev'=>$dev,'ste'=>4,'val'=>0,'abo'=>0];
                            }
                        } else {
                            $out = ['dev'=>$dev,'ste'=>4,'val'=>0,'abo'=>1];
                            $log->error("Step 4 update failed for {$dev}");
                        }
                    } catch (\Exception $e) {
                        $out = ['dev'=>$dev,'ste'=>4,'val'=>0,'abo'=>1];
                        $log->error("Exception in step 4 for {$dev}: " . $e->getMessage());
                    }
                } else {
                    $disp->update(['errorCalib' => $err]);
                    $out = ['dev'=>$dev,'ste'=>2,'val'=>0,'abo'=>1];
                    $log->error("Step 4: {$dev} error calibrating with weight, aborting, code: {$err}");
                }
                $log->info("Step 4 output: " . json_encode($out));
                return response('@'.json_encode($out).'@',200)
                       ->header('Content-Type','text/plain');

            case 5:
                if ($err == 0) {
                    $log->info("Step 5: {$dev} waiting weight removal...");
                } else {
                    $disp->update(['errorCalib' => $err]);
                    $log->error("Step 5: {$dev} error waiting for weight removal, code: {$err}");
                }
                return response()->noContent();

            case 6:
                if ($err == 0) {
                    try {
                        $updated = $disp->update([
                            'calibrado'               => 6,
                            'runCalibracion'          => 0,
                            'errorCalib'              => 0,
                            'fecha_ultima_calibracion'=> Carbon::now('Europe/Paris'),
                        ]);
                        if ($updated) {
                            $out = ['dev'=>$dev,'ste'=>6,'val'=>0,'abo'=>0];
                        } else {
                            $out = ['dev'=>$dev,'ste'=>6,'val'=>0,'abo'=>1];
                            $log->error("Step 6 update failed for {$dev}");
                        }
                    } catch (\Exception $e) {
                        $out = ['dev'=>$dev,'ste'=>6,'val'=>0,'abo'=>1];
                        $log->error("Exception in step 6 for {$dev}: " . $e->getMessage());
                    }
                } else {
                    $disp->update(['errorCalib' => $err]);
                    $out = ['dev'=>$dev,'ste'=>2,'val'=>0,'abo'=>1];
                    $log->error("Step 6: {$dev} error finalizing calibration, code: {$err}");
                }
                $log->info("Step 6 output: " . json_encode($out));
                return response('@'.json_encode($out).'@',200)
                       ->header('Content-Type','text/plain');

            default:
                $log->warning("Unknown step: {$step} for {$dev}, aborting.");
                $out = ['dev'=>$dev,'ste'=>$step,'val'=>0,'abo'=>1];
                return response('@'.json_encode($out).'@',200)
                       ->header('Content-Type','text/plain');
        }
    }

    /**
     * Obtiene el estado de calibración para el front-end
     */
    public function getStep(Request $request)
    {
        $data = $request->validate([
            'device' => 'required|string',
        ]);
        $disp = Dispositivo::find($data['device']);
        if (! $disp) {
            return response()->json(['success'=>false,'messages'=>'Device not found'],404);
        }
        return response()->json(['success'=>true,'messages'=> $disp]);
    }

    /**
     * Recibe desde la UI el peso marcado por el usuario
     */
    public function sendStep(Request $request)
    {
        $data = $request->validate([
            'device' => 'required|string',
            'weight' => 'required|numeric',
            'step'   => 'required|integer',
        ]);
        $disp = Dispositivo::find($data['device']);
        if (! $disp) {
            return response()->json(['success'=>false,'messages'=>'Device not found'],404);
        }
        if ($data['weight'] == 0) {
            $disp->update([
                'pesoCalibracion'        => 0,
                'calibrado'              => 0,
                'errorCalib'             => 0,
                'fecha_ultima_calibracion'=> null,
                'runCalibracion'         => 1,
            ]);
        } else {
            $disp->update(['pesoCalibracion'=>$data['weight'],'runCalibracion'=>1]);
        }
        if ($data['step'] == 5) {
            $disp->update([
                'pesoCalibracion' => 0,
                'calibrado'       => 5,
                'runCalibracion'  => 0,
            ]);
        }
        return response()->json(['success'=>true,'messages'=>'actualizada Ok.']);
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