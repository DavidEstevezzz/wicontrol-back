<?php

namespace App\Http\Controllers;

use App\Models\Usuario;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    // Login y token
    public function login(Request $request)
    {
        // 1) Validar la petición
        $credentials = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        Log::info('Attempting login', [
            'email' => $credentials['email'],
            // ¡Nunca loguees la contraseña en texto plano en producción!
            'input_password_length' => strlen($credentials['password']),
        ]);

        // 2) Buscar usuario por email
        $user = Usuario::where('email', $credentials['email'])->first();

        if (! $user) {
            Log::warning('Login failed: user not found', ['email' => $credentials['email']]);
            return response()->json([
                'message' => 'Credenciales incorrectas'
            ], 401);
        }

        Log::debug('User found, checking password', [
            'user_id' => $user->id,
            'hashed_password' => $user->contrasena, // en dev solo
        ]);

        // 3) Verificar contraseña
        if (! Hash::check($credentials['password'], $user->contrasena)) {
            Log::warning('Login failed: invalid password', [
                'user_id' => $user->id,
            ]);
            return response()->json([
                'message' => 'Credenciales incorrectas'
            ], 401);
        }

        Log::info('Password valid, creating token', ['user_id' => $user->id]);

        // 4) Generar nuevo token de acceso
        $token = $user->createToken('api_token')->plainTextToken;

        Log::info('Login successful', ['user_id' => $user->id, 'token' => $token]);

        // 5) Devolver JSON con el token
        return response()->json([
            'access_token' => $token,
            'token_type'   => 'Bearer',
            'user'         => [
                'id'    => $user->id,
                'email' => $user->email,
                'alias' => $user->alias_usuario,
            ],
        ], 200);
    }

    // Logout (revocar token)
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Sesión cerrada correctamente'
        ]);
    }
}
