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
            'configure.php',              // Configuración de dispositivos
            'receive.php',                // Recepción de datos
            'api/configure.php',          
            'api/receive.php',       // Ruta API moderna
            'calibrate',
            'api/calibrate',       // Ruta API moderna
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
