<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class DeviceLogsController extends Controller
{
    /**
     * Obtener logs de dispositivos con paginación
     */
    public function index(Request $request)
    {
        $perPage = $request->get('limit', 50);
        $page = $request->get('page', 1);

        try {
            $query = DB::table('tb_entrada_dato')
                ->select([
                    'id_entrada_dato',
                    'id_dispositivo',
                    'id_sensor',
                    'valor',
                    'fecha',
                    'alta'
                ])
                ->where('alta', 1)
                ->orderBy('fecha', 'desc')
                ->orderBy('id_entrada_dato', 'desc');

            $total = $query->count();
            $logs = $query->paginate($perPage, ['*'], 'page', $page);

            return response()->json([
                'success' => true,
                'data' => $logs->items(),
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
                'from' => $logs->firstItem(),
                'to' => $logs->lastItem()
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching device logs: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los logs de dispositivos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener las últimas mediciones de cada sensor
     */
    public function getLatestMeasurements()
    {
        try {
            $latestMeasurements = DB::table('tb_entrada_dato as ed1')
                ->select([
                    'ed1.id_dispositivo',
                    'ed1.id_sensor',
                    'ed1.valor',
                    'ed1.fecha'
                ])
                ->join(DB::raw('(
                    SELECT id_dispositivo, id_sensor, MAX(fecha) as max_fecha
                    FROM tb_entrada_dato 
                    WHERE alta = 1 
                    GROUP BY id_dispositivo, id_sensor
                ) as ed2'), function($join) {
                    $join->on('ed1.id_dispositivo', '=', 'ed2.id_dispositivo')
                         ->on('ed1.id_sensor', '=', 'ed2.id_sensor')
                         ->on('ed1.fecha', '=', 'ed2.max_fecha');
                })
                ->where('ed1.alta', 1)
                ->orderBy('ed1.id_sensor')
                ->orderBy('ed1.id_dispositivo')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $latestMeasurements
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching latest measurements: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener las últimas mediciones',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener logs filtrados por dispositivo
     */
    public function getLogsByDevice(Request $request, $deviceId)
    {
        $perPage = $request->get('limit', 50);
        $page = $request->get('page', 1);

        try {
            $logs = DB::table('tb_entrada_dato')
                ->select([
                    'id_entrada_dato',
                    'id_dispositivo',
                    'id_sensor',
                    'valor',
                    'fecha',
                    'alta'
                ])
                ->where('id_dispositivo', $deviceId)
                ->where('alta', 1)
                ->orderBy('fecha', 'desc')
                ->orderBy('id_entrada_dato', 'desc')
                ->paginate($perPage, ['*'], 'page', $page);

            return response()->json([
                'success' => true,
                'data' => $logs->items(),
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total()
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching logs by device: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los logs del dispositivo',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener logs filtrados por sensor
     */
    public function getLogsBySensor(Request $request, $sensorId)
    {
        $perPage = $request->get('limit', 50);
        $page = $request->get('page', 1);

        try {
            $logs = DB::table('tb_entrada_dato')
                ->select([
                    'id_entrada_dato',
                    'id_dispositivo',
                    'id_sensor',
                    'valor',
                    'fecha',
                    'alta'
                ])
                ->where('id_sensor', $sensorId)
                ->where('alta', 1)
                ->orderBy('fecha', 'desc')
                ->orderBy('id_entrada_dato', 'desc')
                ->paginate($perPage, ['*'], 'page', $page);

            return response()->json([
                'success' => true,
                'data' => $logs->items(),
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total()
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching logs by sensor: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los logs del sensor',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener logs en un rango de tiempo
     */
    public function getLogsByTimeRange(Request $request)
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date'
        ]);

        $perPage = $request->get('limit', 50);
        $page = $request->get('page', 1);
        $startDate = $request->get('start_date');
        $endDate = $request->get('end_date');

        try {
            $logs = DB::table('tb_entrada_dato')
                ->select([
                    'id_entrada_dato',
                    'id_dispositivo',
                    'id_sensor',
                    'valor',
                    'fecha',
                    'alta'
                ])
                ->whereBetween('fecha', [$startDate, $endDate])
                ->where('alta', 1)
                ->orderBy('fecha', 'desc')
                ->orderBy('id_entrada_dato', 'desc')
                ->paginate($perPage, ['*'], 'page', $page);

            return response()->json([
                'success' => true,
                'data' => $logs->items(),
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total()
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching logs by time range: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los logs por rango de tiempo',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener estadísticas de logs
     */
    public function getStats()
    {
        try {
            // Total de logs
            $totalLogs = DB::table('tb_entrada_dato')
                ->where('alta', 1)
                ->count();

            // Dispositivos activos (que han enviado datos en las últimas 24 horas)
            $activeDevices = DB::table('tb_entrada_dato')
                ->where('alta', 1)
                ->where('fecha', '>=', Carbon::now()->subDay())
                ->distinct('id_dispositivo')
                ->count('id_dispositivo');

            // Sensores online (sensores diferentes que han enviado datos en las últimas 24 horas)
            $sensorsOnline = DB::table('tb_entrada_dato')
                ->where('alta', 1)
                ->where('fecha', '>=', Carbon::now()->subDay())
                ->distinct()
                ->count(DB::raw('CONCAT(id_dispositivo, "-", id_sensor)'));

            // Última actualización
            $lastUpdate = DB::table('tb_entrada_dato')
                ->where('alta', 1)
                ->max('fecha');

            // Logs por hora en las últimas 24 horas
            $logsPerHour = DB::table('tb_entrada_dato')
                ->select(DB::raw('HOUR(fecha) as hour, COUNT(*) as count'))
                ->where('alta', 1)
                ->where('fecha', '>=', Carbon::now()->subDay())
                ->groupBy(DB::raw('HOUR(fecha)'))
                ->orderBy('hour')
                ->get();

            // Top dispositivos por cantidad de logs
            $topDevices = DB::table('tb_entrada_dato')
                ->select('id_dispositivo', DB::raw('COUNT(*) as logs_count'))
                ->where('alta', 1)
                ->where('fecha', '>=', Carbon::now()->subDay())
                ->groupBy('id_dispositivo')
                ->orderBy('logs_count', 'desc')
                ->limit(10)
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'total_logs' => $totalLogs,
                    'active_devices' => $activeDevices,
                    'sensors_online' => $sensorsOnline,
                    'last_update' => $lastUpdate,
                    'logs_per_hour' => $logsPerHour,
                    'top_devices' => $topDevices
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching logs stats: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener las estadísticas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener lista de dispositivos únicos
     */
    public function getUniqueDevices()
    {
        try {
            $devices = DB::table('tb_entrada_dato')
                ->select('id_dispositivo')
                ->where('alta', 1)
                ->distinct()
                ->orderBy('id_dispositivo')
                ->get()
                ->pluck('id_dispositivo');

            return response()->json([
                'success' => true,
                'data' => $devices
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching unique devices: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener la lista de dispositivos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener lista de sensores únicos
     */
    public function getUniqueSensors()
    {
        try {
            $sensors = DB::table('tb_entrada_dato')
                ->select('id_sensor')
                ->where('alta', 1)
                ->distinct()
                ->orderBy('id_sensor')
                ->get()
                ->pluck('id_sensor');

            return response()->json([
                'success' => true,
                'data' => $sensors
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching unique sensors: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener la lista de sensores',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener resumen de actividad reciente
     */
    public function getRecentActivity()
    {
        try {
            // Logs de los últimos 30 minutos
            $recentLogs = DB::table('tb_entrada_dato')
                ->select([
                    'id_dispositivo',
                    'id_sensor',
                    'valor',
                    'fecha'
                ])
                ->where('alta', 1)
                ->where('fecha', '>=', Carbon::now()->subMinutes(30))
                ->orderBy('fecha', 'desc')
                ->limit(100)
                ->get();

            // Dispositivos que han enviado datos recientemente
            $activeDevicesRecent = $recentLogs->unique('id_dispositivo')->count();

            // Promedio de logs por minuto en la última media hora
            $logsPerMinute = round($recentLogs->count() / 30, 2);

            return response()->json([
                'success' => true,
                'data' => [
                    'recent_logs' => $recentLogs,
                    'recent_logs_count' => $recentLogs->count(),
                    'active_devices_recent' => $activeDevicesRecent,
                    'logs_per_minute' => $logsPerMinute,
                    'period_minutes' => 30
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching recent activity: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener la actividad reciente',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}