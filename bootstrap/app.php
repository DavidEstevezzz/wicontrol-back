<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->validateCsrfTokens(except: [
            // Versiones con minúscula
            'configure.php',              // Configuración de dispositivos
            'receive.php',                // Recepción de datos
            'api/configure.php',          
            'api/receive.php',            // Ruta API moderna
            'calibrate',
            'api/calibrate',              // Ruta API moderna
            'heartbeat.php',
            'api/heartbeat.php',          // Ruta API moderna

            // Versiones con mayúscula (para compatibilidad)
            'Configure.php',              // Configuración de dispositivos
            'Receive.php',                // Recepción de datos
            'api/Configure.php',          
            'api/Receive.php',            // Ruta API moderna
            'Calibrate',
            'api/Calibrate',              // Ruta API moderna
            'Heartbeat.php',
            'api/Heartbeat.php',          // Ruta API moderna
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
