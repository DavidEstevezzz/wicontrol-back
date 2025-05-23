<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DeviceConfigurationController;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/configure.php', [DeviceConfigurationController::class, 'configure'])
    ->name('device.configure.legacy');
