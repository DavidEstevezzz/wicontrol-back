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
Route::post   ('camadas/{camada}/dispositivos/{disp}', [CamadaController::class, 'attachDispositivo']);
Route::delete ('camadas/{camada}/dispositivos/{disp}', [CamadaController::class, 'detachDispositivo']);

// Calcular y listar pesadas con estado para una fecha concreta
// Parámetros por query string: 
//   - fecha=YYYY-MM-DD    (obligatorio)  
//   - coefHomogeneidad=0.10 (opcional)
Route::get('camadas/{camada}/pesadas', [CamadaController::class, 'calcularPesadasPorDia']);
Route::get(
    'camadas/{camada}/dispositivos/{disp}/pesadas-rango',
    [CamadaController::class, 'pesadasRango']
);
Route::get(
    'camadas/{camada}/dispositivos',
    [CamadaController::class, 'getDispositivosByCamada']
);
Route::apiResource('dispositivos',    DispositivoController::class);

Route::apiResource('empresas',        EmpresaController::class);
Route::get('empresas/{empresa}/granjas', [GranjaController::class, 'getByEmpresa'])
     ->name('empresas.granjas');

Route::apiResource('entradas-datos',  EntradaDatoController::class);

Route::apiResource('granjas',         GranjaController::class);
Route::get('granjas/{numeroRega}/camadas', [CamadaController::class, 'getByGranja'])
     ->name('granjas.camadas');
Route::post('/granjas/peso', [GranjaController::class, 'getPesoPorGranja']);

Route::apiResource('instalaciones',   InstalacionController::class);

Route::apiResource('peso-cobb',       PesoCobbController::class);

Route::apiResource('peso-ross',       PesoRossController::class);

Route::apiResource('usuarios',        UsuarioController::class);
Route::patch('usuarios/{usuario}/activate', [UsuarioController::class, 'activate']);

Route::get('/dashboard', [DashboardController::class, 'stats']);
Route::get('/granjas/{numeroRega}/dashboard', [GranjaController::class, 'dashboard']);
Route::get('/granjas/{numeroRega}/temperatura-media', [GranjaController::class, 'getTemperaturaMedia']);





