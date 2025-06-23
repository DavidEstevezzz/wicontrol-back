<?php

namespace App\Http\Controllers;

use App\Models\Instalacion;
use Illuminate\Http\Request;
use App\Models\Dispositivo;

use Illuminate\Support\Facades\DB;


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

     public function show($id)
    {
        $instalacion = Instalacion::with('usuario')->findOrFail($id);
        
        // Verificar que la instalación esté activa
        if (!$instalacion->alta) {
            return response()->json([
                'message' => 'Esta instalación no está activa',
                'instalacion' => $instalacion
            ], 200); // No es error, pero aviso
        }
        
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
     * Crear nueva instalación y actualizar dispositivo
     */
    public function store(Request $request)
    {
        $request->validate([
            'id_dispositivo' => 'required|exists:tb_dispositivo,id_dispositivo',
            'id_usuario' => 'required|exists:tb_usuario,id',
            'numero_rega' => 'required|string|max:50',
            'fecha_hora_alta' => 'required|date',
            'id_nave' => 'required|string|max:20',
        ]);

        DB::beginTransaction();
        try {
            // Crear nueva instalación
            $instalacion = Instalacion::create([
                'id_usuario' => $request->id_usuario,
                'numero_rega' => $request->numero_rega,
                'fecha_hora_alta' => $request->fecha_hora_alta,
                'id_nave' => $request->id_nave,
                'alta' => 1
            ]);
            
            // Actualizar el dispositivo para que apunte a la nueva instalación
            $dispositivo = Dispositivo::findOrFail($request->id_dispositivo);
            
            // Opcional: Desactivar instalación anterior
            if ($dispositivo->id_instalacion) {
                $instalacionAnterior = Instalacion::find($dispositivo->id_instalacion);
                if ($instalacionAnterior) {
                    $instalacionAnterior->update([
                        'alta' => 0,
                        'fecha_hora_baja' => now()
                    ]);
                }
            }
            
            // Actualizar dispositivo con nueva instalación
            $dispositivo->update([
                'id_instalacion' => $instalacion->id_instalacion,
                'fecha_hora_alta' => $request->fecha_hora_alta
            ]);
            
            DB::commit();
            
            // Cargar relaciones para respuesta
            $instalacion->load('usuario');
            
            return response()->json($instalacion, 201);
            
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'message' => 'Error al crear la instalación',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Obtener historial de instalaciones de un dispositivo
     */
    public function getHistorialDispositivo($idDispositivo)
    {
        // Buscar todas las instalaciones que hayan estado asociadas a este dispositivo
        $instalaciones = Instalacion::with('usuario')
            ->whereHas('dispositivos', function($query) use ($idDispositivo) {
                $query->where('id_dispositivo', $idDispositivo);
            })
            ->orWhere(function($query) use ($idDispositivo) {
                // También buscar por referencia actual
                $query->whereHas('dispositivos', function($subQuery) use ($idDispositivo) {
                    $subQuery->where('id_dispositivo', $idDispositivo);
                });
            })
            ->orderBy('fecha_hora_alta', 'desc')
            ->get();
            
        return response()->json($instalaciones);
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