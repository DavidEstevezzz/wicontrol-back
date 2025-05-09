<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Dispositivo;
use App\Models\Granja;
use App\Models\Camada;
use App\Models\Empresa; // Añadimos el modelo Empresa
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class DashboardController extends Controller
{
    /**
     * Devuelve las métricas para el dashboard.
     */
    public function stats(Request $request)
    {
        // Dispositivos "alta = 1" (disponibles)
        $devicesAvailable = Dispositivo::where('alta', 1)->count();

        // Opcional: dispositivos online (últimos 30 minutos)
        $threshold = Carbon::now()->subMinutes(30);
        $devicesOnline = Dispositivo::where('alta', 1)
            ->where('fecha_hora_last_msg', '>=', $threshold)
            ->count();

        // Granjas "alta = 1"
        $granjas = Granja::where('alta', 1)->count();

        // Camadas "alta = 1"
        $camadas = Camada::where('alta', 1)->count();
        
        // Empresas "alta = 1"
        $empresas = Empresa::where('alta', 1)->count();

        return response()->json([
            'devicesAvailable' => $devicesAvailable,
            'devicesOnline'    => $devicesOnline,
            'granjas'          => $granjas,
            'camadas'          => $camadas,
            'empresas'         => $empresas, // Añadimos el conteo de empresas
        ]);
    }
}