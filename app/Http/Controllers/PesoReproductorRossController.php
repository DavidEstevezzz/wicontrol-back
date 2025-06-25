<?php

namespace App\Http\Controllers;

use App\Models\PesoReproductorRoss;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PesoReproductorRossController extends Controller
{
    /**
     * Obtiene todos los registros de peso para Reproductores Ross, opcionalmente filtrados por rango de edad
     */
    public function index(Request $request)
    {
        // Si se proporciona un rango de edad, filtrar por ese rango
        if ($request->has('edad_inicio') && $request->has('edad_fin')) {
            $edadInicio = $request->query('edad_inicio');
            $edadFin = $request->query('edad_fin');
            
            return response()->json(
                PesoReproductorRoss::whereBetween('edad', [$edadInicio, $edadFin])
                    ->orderBy('edad')
                    ->get()
            );
        }
        
        // Si solo se quiere un rango hacia arriba o hacia abajo
        if ($request->has('edad_inicio')) {
            $edadInicio = $request->query('edad_inicio');
            
            return response()->json(
                PesoReproductorRoss::where('edad', '>=', $edadInicio)
                    ->orderBy('edad')
                    ->get()
            );
        }
        
        if ($request->has('edad_fin')) {
            $edadFin = $request->query('edad_fin');
            
            return response()->json(
                PesoReproductorRoss::where('edad', '<=', $edadFin)
                    ->orderBy('edad')
                    ->get()
            );
        }
        
        // Si no hay filtros, devolver todos ordenados por edad
        return response()->json(
            PesoReproductorRoss::orderBy('edad')->get()
        );
    }

    /**
     * Muestra un registro específico.
     * 
     * @param mixed $id - Puede ser el ID del registro o la edad
     */
    public function show($id)
    {
        // Intentar encontrar por ID primero
        $item = PesoReproductorRoss::find($id);
        
        // Si no se encuentra por ID, intentar encontrar por edad
        if (!$item && is_numeric($id)) {
            $item = PesoReproductorRoss::where('edad', $id)->first();
        }
        
        // Si aún no se encuentra, devolver 404
        if (!$item) {
            return response()->json(['message' => 'Registro no encontrado'], Response::HTTP_NOT_FOUND);
        }
        
        return response()->json($item);
    }

    /**
     * Guarda un nuevo registro.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'edad'   => 'required|integer|unique:tb_peso_reproductores_ross,edad', // Asegurar que no haya duplicados
            'macho'  => 'required|numeric',
            'hembra' => 'required|numeric',
        ]);

        $item = PesoReproductorRoss::create($validated);
        return response()->json($item, Response::HTTP_CREATED);
    }

    /**
     * Actualiza un registro existente.
     */
    public function update(Request $request, $id)
    {
        // Buscar por ID o por edad
        $item = PesoReproductorRoss::find($id);
        
        if (!$item && is_numeric($id)) {
            $item = PesoReproductorRoss::where('edad', $id)->first();
        }
        
        if (!$item) {
            return response()->json(['message' => 'Registro no encontrado'], Response::HTTP_NOT_FOUND);
        }

        $validated = $request->validate([
            'edad'   => 'sometimes|required|integer|unique:tb_peso_reproductores_ross,edad,' . $item->id,
            'macho'  => 'sometimes|required|numeric',
            'hembra' => 'sometimes|required|numeric',
        ]);

        $item->update($validated);
        return response()->json($item);
    }

    /**
     * Elimina un registro.
     */
    public function destroy($id)
    {
        // Buscar por ID o por edad
        $item = PesoReproductorRoss::find($id);
        
        if (!$item && is_numeric($id)) {
            $item = PesoReproductorRoss::where('edad', $id)->first();
        }
        
        if (!$item) {
            return response()->json(['message' => 'Registro no encontrado'], Response::HTTP_NOT_FOUND);
        }
        
        $item->delete();
        return response()->json(null, Response::HTTP_NO_CONTENT);
    }
    
    /**
     * Obtiene el peso de referencia para una edad específica.
     * 
     * @param int $edad
     * @return \Illuminate\Http\JsonResponse
     */
    public function getPesoByEdad($edad)
    {
        $item = PesoReproductorRoss::where('edad', $edad)->first();
        
        if (!$item) {
            return response()->json(['message' => 'No se encontró peso de referencia para la edad especificada'], Response::HTTP_NOT_FOUND);
        }
        
        return response()->json($item);
    }
    
    /**
     * Obtiene los pesos de referencia para un rango de edades.
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getPesosByRangoEdad(Request $request)
    {
        $request->validate([
            'edad_inicio' => 'required|integer|min:0',
            'edad_fin' => 'required|integer|min:0'
        ]);
        
        $edadInicio = $request->input('edad_inicio');
        $edadFin = $request->input('edad_fin');
        
        $items = PesoReproductorRoss::whereBetween('edad', [$edadInicio, $edadFin])
            ->orderBy('edad')
            ->get();
            
        return response()->json($items);
    }
}