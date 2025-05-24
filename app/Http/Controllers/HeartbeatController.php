<?php
namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Dispositivo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class HeartbeatController extends Controller
{
    public function heartbeat(Request $request)
    {
        Log::channel('heartbeat')->info('=== MÉTODO HEARTBEAT EJECUTADO ===');

        // 1) Leer raw query string (JSON crudo)
        $raw = $_SERVER['QUERY_STRING'] ?? '';
        if (empty($raw)) {
            $raw = $request->getQueryString() ?? '';
        }
        if (empty($raw) && ($uri = $request->server('REQUEST_URI'))) {
            if (false !== $pos = strpos($uri, '?')) {
                $raw = substr($uri, $pos + 1);
            }
        }
        $raw = urldecode($raw);
        Log::channel('heartbeat')->info('Raw QUERY_STRING: ' . $raw);

        // 2) Validar JSON
        json_decode($raw);
        if (! $raw || json_last_error() !== JSON_ERROR_NONE) {
            Log::channel('heartbeat')->warning("Invalid JSON: {$raw}");
            return response('@ERROR@', 400)->header('Content-Type', 'text/plain');
        }

        $data = json_decode($raw);
        $dev  = $data->dev ?? null;
        if (! $dev) {
            Log::channel('heartbeat')->warning("No dev in payload");
            return response('@ERROR@', 400)->header('Content-Type', 'text/plain');
        }

        // 3) Buscar dispositivo
        $disp = Dispositivo::where('numero_serie', $dev)->first();
        if (! $disp) {
            Log::channel('heartbeat')->warning("Device not found: {$dev}");
            return response('@'.json_encode([
                'dev' => $dev,
                'abo' => true,
                'ste' => 0,
                'val' => -1
            ]).'@', 200)->header('Content-Type', 'text/plain');
        }
        if ($disp->alta == 0) {
            return response('@'.json_encode([
                'dev' => $dev,
                'abo' => true,
                'ste' => 0,
                'val' => -2
            ]).'@', 200)
            ->header('Content-Type', 'text/plain');
        }

        // 4) Actualizar último mensaje
        $disp->fecha_hora_last_msg = Carbon::now('Europe/Paris');
        $disp->save();
        Log::channel('heartbeat')->info("Heartbeat actualizado para {$dev}");

        // 5) Construir la respuesta según flags
        if ($disp->runCalibracion) {
            $out = ['dev' => $dev, 'cal' => 1, 'sen' => 2];
            Log::channel('heartbeat')->info("Calibración pendiente: ".json_encode($out));
            return response('@'.json_encode($out).'@', 200)
                   ->header('Content-Type', 'text/plain');
        }

        if ($disp->reset) {
            // lo ponemos a 0 y avisamos
            $disp->reset = false;
            $disp->save();
            $out = ['dev' => $dev, 'rst' => 1];
            Log::channel('heartbeat')->info("Reset enviado: ".json_encode($out));
            return response('@'.json_encode($out).'@', 200)
                   ->header('Content-Type', 'text/plain');
        }

        // 6) Ninguna acción pendiente
        $out = ['dev' => $dev, 'err' => 0];
        return response('@'.json_encode($out).'@', 200)
               ->header('Content-Type', 'text/plain');
    }
}
