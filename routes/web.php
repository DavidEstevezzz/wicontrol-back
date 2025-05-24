<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DeviceConfigurationController;
use App\Http\Controllers\DeviceDataReceiverController;
use App\Http\Controllers\CalibrationController;


Route::get('/', function () {
    return view('welcome');
});

Route::get('/configure.php', [DeviceConfigurationController::class, 'configure'])
    ->name('device.configure.legacy');
Route::get('/receive.php', [DeviceDataReceiverController::class, 'receive'])
    ->name('device.receive.legacy');
    Route::get('/calibrate', [CalibrationController::class, 'calibrate'])
     ->name('calibration.legacy');
     Route::get('/calibrate.php', [CalibrationController::class, 'calibrate'])
    ->name('calibration.legacy.php');

     Route::get('/Configure.php', [DeviceConfigurationController::class, 'configure'])
    ->name('device.configure.legacy.upper');
Route::get('/Receive.php', [DeviceDataReceiverController::class, 'receive'])
    ->name('device.receive.legacy.upper');
Route::get('/Calibrate', [CalibrationController::class, 'calibrate'])
    ->name('calibration.legacy.upper');
Route::get('/Calibrate.php', [CalibrationController::class, 'calibrate'])
    ->name('calibration.legacy.upper.php');
