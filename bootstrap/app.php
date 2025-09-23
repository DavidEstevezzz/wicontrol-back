<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

use Illuminate\Support\Facades\Log;

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
        // ESTA ES LA CONFIGURACIÓN QUE FALTA
        
        // Configurar el reporte de todas las excepciones
        $exceptions->report(function (Throwable $exception) {
             // Esto hará que todas las excepciones se registren en el stack, incluyendo laravel.log
            Log::channel('stack')->error('Excepción capturada:', [
                'message' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
                'trace' => $exception->getTraceAsString(),
            ]);
        });

        // Opcional: También puedes configurar renders personalizados
        $exceptions->render(function (Throwable $exception, $request) {
            // Si quieres personalizar las respuestas de error
            // Por ahora dejamos que Laravel maneje esto automáticamente
            return null;
        });
    })->create();