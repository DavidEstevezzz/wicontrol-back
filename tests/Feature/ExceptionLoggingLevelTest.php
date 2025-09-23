<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class ExceptionLoggingLevelTest extends TestCase
{
    public function test_server_errors_are_logged_even_when_log_level_is_restrictive(): void
    {
        $logPath = storage_path('logs/laravel.log');

        if (File::exists($logPath)) {
            File::delete($logPath);
        }

        Config::set('logging.channels.stack.channels', ['single']);
        Config::set('logging.channels.single.level', 'critical');

        Route::middleware('web')->get('/test-log-level', function () {
            throw new \RuntimeException('Exception for restrictive log level');
        });

        try {
            $this->get('/test-log-level');
        } catch (\Throwable $exception) {
            // Ignore to inspect the log file.
        }

        $this->assertFileExists($logPath);
        $this->assertStringContainsString('Exception for restrictive log level', File::get($logPath));
    }
}