<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class ExceptionLoggingFallbackTest extends TestCase
{
    public function test_exception_logging_survives_stack_channel_misconfiguration(): void
    {
        $logPath = storage_path('logs/laravel.log');

        if (File::exists($logPath)) {
            File::delete($logPath);
        }

        Config::set('logging.channels.stack.channels', ['missing-channel']);

        Route::middleware('web')->get('/test-misconfigured-log', function () {
            throw new \RuntimeException('Exception when stack channel broken');
        });

        try {
            $this->get('/test-misconfigured-log');
        } catch (\Throwable $exception) {
            // The exception should still be logged even if the stack channel is misconfigured.
        }

        $this->assertFileExists($logPath);
        $this->assertStringContainsString('Exception when stack channel broken', File::get($logPath));
    }
}