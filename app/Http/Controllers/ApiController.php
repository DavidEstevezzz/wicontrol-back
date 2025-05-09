<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ApiController extends Controller
{
    public function testConnection()
    {
        return response()->json([
            'status' => 'success',
            'message' => 'Conexión exitosa desde un controlador',
            'timestamp' => now()->toDateTimeString()
        ])->header('Content-Type', 'application/json');
    }
}