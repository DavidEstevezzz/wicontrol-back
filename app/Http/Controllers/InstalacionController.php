<?php

namespace App\Http\Controllers;

use App\Models\Instalacion;
use Illuminate\Http\Request;

class InstalacionController extends Controller
{
    /**
     * Obtener todas las instalaciones con datos del usuario
     */
    public function index()
    {
        $instalaciones = Instalacion::with('usuario')->get();
        
        // Transformar los datos para incluir información del usuario
        $instalaciones = $instalaciones->map(function($instalacion) {
            return [
                'id_instalacion' => $instalacion->id_instalacion,
                'id_usuario' => $instalacion->id_usuario,
                'numero_rega' => $instalacion->numero_rega,
                'fecha_hora_alta' => $instalacion->fecha_hora_alta,
                'alta' => $instalacion->alta,
                'id_nave' => $instalacion->id_nave,
                
                // Datos del usuario/instalador
                'usuario' => $instalacion->usuario ? [
                    'id' => $instalacion->usuario->id,
                    'nombre' => $instalacion->usuario->nombre,
                    'apellidos' => $instalacion->usuario->apellidos,
                    'alias_usuario' => $instalacion->usuario->alias_usuario,
                    'nombre_completo' => $instalacion->usuario->nombre . ' ' . $instalacion->usuario->apellidos
                ] : null
            ];
        });
        
        return response()->json($instalaciones);
    }

    /**
     * Obtener una instalación específica con datos del usuario
     */
    public function show($id)
    {
        $instalacion = Instalacion::with('usuario')->findOrFail($id);
        
        $response = [
            'id_instalacion' => $instalacion->id_instalacion,
            'id_usuario' => $instalacion->id_usuario,
            'numero_rega' => $instalacion->numero_rega,
            'fecha_hora_alta' => $instalacion->fecha_hora_alta,
            'alta' => $instalacion->alta,
            'id_nave' => $instalacion->id_nave,
            
            // Datos del usuario/instalador
            'usuario' => $instalacion->usuario ? [
                'id' => $instalacion->usuario->id,
                'nombre' => $instalacion->usuario->nombre,
                'apellidos' => $instalacion->usuario->apellidos,
                'alias_usuario' => $instalacion->usuario->alias_usuario,
                'nombre_completo' => $instalacion->usuario->nombre . ' ' . $instalacion->usuario->apellidos
            ] : null
        ];
        
        return response()->json($response);
    }

    /**
     * Crear nueva instalación
     */
    public function store(Request $request)
    {
        $request->validate([
            'id_usuario' => 'required|exists:tb_usuario,id',
            'numero_rega' => 'required|string|max:50',
            'fecha_hora_alta' => 'required|date',
            'id_nave' => 'required|string|max:20',
        ]);

        $instalacion = Instalacion::create($request->all());
        
        // Retornar con datos del usuario
        $instalacion->load('usuario');
        
        return response()->json($instalacion, 201);
    }

    /**
     * Actualizar instalación existente
     */
    public function update(Request $request, $id)
    {
        $instalacion = Instalacion::findOrFail($id);
        
        $request->validate([
            'id_usuario' => 'sometimes|exists:tb_usuario,id',
            'numero_rega' => 'sometimes|string|max:50',
            'fecha_hora_alta' => 'sometimes|date',
            'id_nave' => 'sometimes|string|max:20',
        ]);

        $instalacion->update($request->all());
        
        // Retornar con datos del usuario
        $instalacion->load('usuario');
        
        return response()->json($instalacion);
    }

    /**
     * Eliminar instalación
     */
    public function destroy($id)
    {
        $instalacion = Instalacion::findOrFail($id);
        $instalacion->delete();
        
        return response()->json(['message' => 'Instalación eliminada correctamente']);
    }
}