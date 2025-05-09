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
Route::apiResource('dispositivos',    DispositivoController::class);
Route::apiResource('empresas',        EmpresaController::class);
Route::apiResource('entradas-datos',  EntradaDatoController::class);
Route::apiResource('granjas',         GranjaController::class);
Route::apiResource('instalaciones',   InstalacionController::class);
Route::apiResource('peso-cobb',       PesoCobbController::class);
Route::apiResource('peso-ross',       PesoRossController::class);
Route::apiResource('usuarios',        UsuarioController::class);
Route::patch('usuarios/{usuario}/activate', [UsuarioController::class, 'activate']);
Route::get('/dashboard', [DashboardController::class, 'stats']);
