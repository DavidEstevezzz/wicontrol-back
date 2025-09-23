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
        // Log ALL exceptions explicitly
        $exceptions->report(function (Throwable $exception) {
            \Illuminate\Support\Facades\Log::error('Exception occurred: ' . $exception->getMessage(), [
                'exception' => get_class($exception),
                'message' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
                'trace' => $exception->getTraceAsString(),
                'url' => request()->fullUrl() ?? 'N/A',
                'method' => request()->method() ?? 'N/A',
                'ip' => request()->ip() ?? 'N/A',
                'user_agent' => request()->userAgent() ?? 'N/A',
                'timestamp' => now()->toDateTimeString()
            ]);
        });

        // Custom rendering for API errors
        $exceptions->render(function (Throwable $exception, $request) {
            // Log the render attempt
            \Illuminate\Support\Facades\Log::info('Rendering exception response', [
                'is_api' => $request->is('api/*'),
                'expects_json' => $request->expectsJson(),
                'exception' => get_class($exception)
            ]);

            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error interno del servidor',
                    'error' => config('app.debug') ? $exception->getMessage() : 'Internal Server Error',
                    'timestamp' => now()->toDateTimeString()
                ], 500);
            }
        });
    })->create();