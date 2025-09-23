<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\ApiController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CamadaController;
use App\Http\Controllers\DispositivoController;
use App\Http\Controllers\EmpresaController;
use App\Http\Controllers\EntradaDatoController;
use App\Http\Controllers\GranjaController;
use App\Http\Controllers\InstalacionController;
use App\Http\Controllers\PesoCobbController;
use App\Http\Controllers\PesoRossController;
use App\Http\Controllers\UsuarioController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PesoPavoButPremiumController;
use App\Http\Controllers\PesoPavoNicholasSelectController;
use App\Http\Controllers\PesoPavoHybridConverterController;
use App\Http\Controllers\PesoReproductorRossController;
use App\Http\Controllers\DeviceConfigurationController;
use App\Http\Controllers\DeviceDataReceiverController;
use App\Http\Controllers\CalibrationController;
use App\Http\Controllers\HeartbeatController;
use App\Http\Controllers\DeviceLogsController;
use Illuminate\Support\Facades\Log;
use Throwable;
use Illuminate\Support\Facades\DB;



/*
| Test de conexión
*/

Route::get('/controller-test', [ApiController::class, 'testConnection']);

/*
| Autenticación
*/
Route::post('/login',  [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])
    ->middleware('auth:sanctum');

/*
| Usuario autenticado
*/
Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

/*
| Recursos RESTful
*/
Route::apiResource('camadas',         CamadaController::class);
// Vincular / desvincular dispositivos a una camada
Route::post('camadas/{camada}/dispositivos/{disp}', [CamadaController::class, 'attachDispositivo']);
Route::delete('camadas/{camada}/dispositivos/{disp}', [CamadaController::class, 'detachDispositivo']);
Route::get('dispositivos/{dispId}/peso-medio', [CamadaController::class, 'calcularPesoMedioPorRango']);
Route::get('granjas/{codigoGranja}/dispositivos', [CamadaController::class, 'getDispositivosByGranja']);


// Calcular y listar pesadas con estado para una fecha concreta
// Parámetros por query string: 
//   - fecha=YYYY-MM-DD    (obligatorio)  
//   - coefHomogeneidad=0.10 (opcional)
Route::get('camadas/{camada}/pesadas', [CamadaController::class, 'calcularPesadasPorDia']);
Route::get('camadas/{camada}/dispositivos/{disp}/pesadas-rango', [CamadaController::class, 'pesadasRango']);
Route::get('dispositivos/{dispId}/pronostico-peso', [CamadaController::class, 'getPronosticoPeso']);
Route::get('camadas/{camada}/dispositivos', [CamadaController::class, 'getDispositivosByCamada']);
Route::get('dispositivos/{dispId}/temperatura-grafica-alertas', [CamadaController::class, 'getTemperaturaGraficaAlertas']);
Route::get('dispositivos/{dispId}/humedad-grafica-alertas', [CamadaController::class, 'getHumedadGraficaAlertas']);
Route::get('/dispositivos/{dispId}/datos-ambientales-diarios', [CamadaController::class, 'getDatosAmbientalesDiarios']);
Route::get('/dispositivos/{dispId}/medidas/{tipoSensor}', [CamadaController::class, 'getMedidasIndividuales']);
Route::get('dispositivos/{dispId}/actividad', [CamadaController::class, 'monitorearActividad']);
Route::get('dispositivos/{dispId}/luz', [CamadaController::class, 'monitorearLuz']);
Route::get('/dispositivos/{dispId}/indices-ambientales-rango', [CamadaController::class, 'getIndicesAmbientalesRango'])
    ->name('dispositivos.indices-ambientales-rango');
Route::get('dispositivos/{dispId}/humedad-cama-grafica-alertas', [CamadaController::class, 'getHumedadCamaGraficaAlertas']);
Route::get('dispositivos/{dispId}/temperatura-cama-grafica-alertas', [CamadaController::class, 'getTemperaturaCamaGraficaAlertas']);


Route::get('/configure.php', [DeviceConfigurationController::class, 'configure']);
Route::get('/receive.php', [DeviceDataReceiverController::class, 'receive']);
Route::get('/Receive.php', [DeviceDataReceiverController::class, 'receive']);
Route::get('calibrate',           [CalibrationController::class, 'calibrate']);
Route::post('calibrate/get-step', [CalibrationController::class, 'getStep']);
Route::post('calibrate/send-step', [CalibrationController::class, 'sendStep']);
Route::get('/heartbeat.php', [HeartbeatController::class, 'heartbeat']);
Route::get('/Heartbeat.php', [HeartbeatController::class, 'heartbeat']);

Route::prefix('device-logs')->group(function () {
    Route::get('/', [DeviceLogsController::class, 'index']);
    Route::get('/latest-measurements', [DeviceLogsController::class, 'getLatestMeasurements']);
    Route::get('/stats', [DeviceLogsController::class, 'getStats']);
    Route::get('/recent-activity', [DeviceLogsController::class, 'getRecentActivity']);
    Route::get('/unique-devices', [DeviceLogsController::class, 'getUniqueDevices']);
    Route::get('/unique-sensors', [DeviceLogsController::class, 'getUniqueSensors']);
    Route::get('/device/{deviceId}', [DeviceLogsController::class, 'getLogsByDevice']);
    Route::get('/sensor/{sensorId}', [DeviceLogsController::class, 'getLogsBySensor']);
    Route::get('/range', [DeviceLogsController::class, 'getLogsByTimeRange']);
});

Route::apiResource('dispositivos',    DispositivoController::class);
Route::get('dispositivos/{id}/ubicacion', [DispositivoController::class, 'getGranjaYNave']);
Route::get('dispositivos/{id}/camadas', [DispositivoController::class, 'getCamadas']);
Route::patch('dispositivos/{id}/reset', [DispositivoController::class, 'programarReset']);


Route::apiResource('empresas',        EmpresaController::class);
Route::get('empresas/{empresa}/usuarios', [EmpresaController::class, 'getUsuarios'])
        ->name('empresas.usuarios');
    
    Route::get('empresas/{empresa}/granjas', [GranjaController::class, 'getByEmpresa'])
        ->name('empresas.granjas');

Route::apiResource('entradas-datos',  EntradaDatoController::class);

Route::apiResource('granjas',         GranjaController::class);
Route::get('granjas/{numeroRega}/camadas', [CamadaController::class, 'getByGranja'])
    ->name('granjas.camadas');
Route::post('/granjas/peso', [GranjaController::class, 'getPesoPorGranja']);
Route::get('granjas/{numeroRega}/dispositivos-activos', [GranjaController::class, 'getDispositivosActivos'])
    ->name('granjas.dispositivos-activos');
Route::apiResource('instalaciones',   InstalacionController::class);


Route::get('granjas/{codigoGranja}/dispositivos-disponibles', [CamadaController::class, 'getDispositivosDisponiblesByGranja'])
    ->name('granjas.dispositivos-disponibles');

Route::get('camadas/{camadaId}/dispositivos-vinculados', [CamadaController::class, 'getDispositivosVinculadosByCamada'])
    ->name('camadas.dispositivos-vinculados');

Route::post('camadas/{camadaId}/dispositivos/{dispId}/attach', [CamadaController::class, 'attachDispositivo'])
    ->name('camadas.attach-dispositivo');

Route::post('camadas/{camadaId}/dispositivos/{dispId}/detach', [CamadaController::class, 'detachDispositivo'])
    ->name('camadas.detach-dispositivo');


Route::apiResource('peso-cobb',       PesoCobbController::class);
Route::get('peso-cobb/edad/{edad}', [PesoCobbController::class, 'getPesoByEdad']);
Route::post('peso-cobb/rango', [PesoCobbController::class, 'getPesosByRangoEdad']);
Route::apiResource('peso-reproductores-ross', PesoReproductorRossController::class);
Route::apiResource('pavos-hybridconverter', PesoPavoHybridConverterController::class);
Route::apiResource('pavos-nicholasselect', PesoPavoNicholasSelectController::class);
Route::apiResource('pavos-butpremium', PesoPavoButPremiumController::class);

Route::apiResource('peso-ross',       PesoRossController::class);
Route::get('peso-ross/edad/{edad}', [PesoRossController::class, 'getPesoByEdad']);
Route::post('peso-ross/rango', [PesoRossController::class, 'getPesosByRangoEdad']);

Route::apiResource('usuarios',        UsuarioController::class);
Route::patch('usuarios/{usuario}/activate', [UsuarioController::class, 'activate']);
Route::get('/usuarios/{usuario}/empresas', [UsuarioController::class, 'getEmpresas']);

Route::get('/dashboard', [DashboardController::class, 'stats']);
Route::get('/granjas/{numeroRega}/dashboard', [GranjaController::class, 'dashboard']);
Route::get('/granjas/{numeroRega}/temperatura-media', [GranjaController::class, 'getTemperaturaMedia']);

Route::get('/debug/test-logging', function() {
    Log::info('TEST: Log de info directo');
    Log::error('TEST: Log de error directo');
    Log::debug('TEST: Log de debug directo');
    Log::warning('TEST: Log de warning directo');
    
    Log::channel('single')->info('TEST: Log directo al canal single');
    
    return response()->json([
        'message' => 'Logs enviados - revisa storage/logs/laravel.log',
        'timestamp' => now(),
        'log_channel_config' => config('logging.default'),
        'log_level' => config('logging.channels.single.level'),
        'storage_path' => storage_path('logs/laravel.log'),
        'file_exists' => file_exists(storage_path('logs/laravel.log')),
        'file_writable' => is_writable(storage_path('logs/')),
        'file_size' => file_exists(storage_path('logs/laravel.log')) ? filesize(storage_path('logs/laravel.log')) : 'No existe'
    ]);
});

