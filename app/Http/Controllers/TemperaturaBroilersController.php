<?php
// app/Http/Controllers/TemperaturaBroilersController.php

namespace App\Http\Controllers;

use App\Models\TemperaturaBroilers;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;

class TemperaturaBroilersController extends Controller
{
    /**
     * Mostrar listado de temperaturas de referencia.
     *
     * @return JsonResponse
     */
    public function index(): JsonResponse
    {
        $temperaturas = TemperaturaBroilers::orderBy('edad')->get();
        return response()->json($temperaturas, Response::HTTP_OK);
    }

    /**
     * Crear un nuevo registro de temperatura de referencia.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'edad' => 'required|integer|unique:temperatura_broilers,edad',
            'temperatura' => 'required|numeric',
            'humedad_min' => 'required|integer|min:0|max:100',
            'humedad_max' => 'required|integer|min:0|max:100|gte:humedad_min',
        ]);

        $temperatura = TemperaturaBroilers::create($data);
        return response()->json($temperatura, Response::HTTP_CREATED);
    }

    /**
     * Mostrar un registro específico de temperatura de referencia.
     *
     * @param int $edad
     * @return JsonResponse
     */
    public function show(int $edad): JsonResponse
    {
        $temperatura = TemperaturaBroilers::findOrFail($edad);
        return response()->json($temperatura, Response::HTTP_OK);
    }

    /**
     * Actualizar un registro específico de temperatura de referencia.
     *
     * @param Request $request
     * @param int $edad
     * @return JsonResponse
     */
    public function update(Request $request, int $edad): JsonResponse
    {
        $temperatura = TemperaturaBroilers::findOrFail($edad);

        $data = $request->validate([
            'temperatura' => 'sometimes|required|numeric',
            'humedad_min' => 'sometimes|required|integer|min:0|max:100',
            'humedad_max' => 'sometimes|required|integer|min:0|max:100|gte:humedad_min',
        ]);

        $temperatura->update($data);
        return response()->json($temperatura, Response::HTTP_OK);
    }

    /**
     * Eliminar un registro específico de temperatura de referencia.
     *
     * @param int $edad
     * @return JsonResponse
     */
    public function destroy(int $edad): JsonResponse
    {
        TemperaturaBroilers::destroy($edad);
        return response()->json(null, Response::HTTP_NO_CONTENT);
    }

    /**
     * Obtener la temperatura de referencia para una edad específica.
     *
     * @param int $edad
     * @return JsonResponse
     */
    public function getReferenciaByEdad(int $edad): JsonResponse
    {
        $temperatura = TemperaturaBroilers::find($edad);
        
        // Si no existe un registro exacto para esa edad, buscar el más cercano
        if (!$temperatura) {
            $temperatura = TemperaturaBroilers::orderByRaw("ABS(edad - {$edad})")
                ->first();
        }
        
        if (!$temperatura) {
            return response()->json([
                'mensaje' => 'No se encontraron datos de referencia para esa edad'
            ], Response::HTTP_NOT_FOUND);
        }
        
        return response()->json($temperatura, Response::HTTP_OK);
    }

    /**
     * Obtener todas las temperaturas de referencia en un rango de edades.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getReferenciaPorRango(Request $request): JsonResponse
    {
        $request->validate([
            'edad_min' => 'required|integer|min:-1',
            'edad_max' => 'required|integer|gte:edad_min',
        ]);
        
        $edadMin = $request->query('edad_min');
        $edadMax = $request->query('edad_max');
        
        $temperaturas = TemperaturaBroilers::whereBetween('edad', [$edadMin, $edadMax])
            ->orderBy('edad')
            ->get();
        
        return response()->json([
            'rango' => [
                'edad_min' => $edadMin,
                'edad_max' => $edadMax
            ],
            'total' => $temperaturas->count(),
            'datos' => $temperaturas
        ], Response::HTTP_OK);
    }

    /**
     * Importar datos de temperatura de referencia en lote.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function importar(Request $request): JsonResponse
    {
        $request->validate([
            'datos' => 'required|array',
            'datos.*.edad' => 'required|integer|distinct',
            'datos.*.temperatura' => 'required|numeric',
            'datos.*.humedad_min' => 'required|integer|min:0|max:100',
            'datos.*.humedad_max' => 'required|integer|min:0|max:100|gte:datos.*.humedad_min',
        ]);
        
        $datosImportados = 0;
        $datosActualizados = 0;
        
        foreach ($request->datos as $dato) {
            $temperatura = TemperaturaBroilers::find($dato['edad']);
            
            if ($temperatura) {
                $temperatura->update([
                    'temperatura' => $dato['temperatura'],
                    'humedad_min' => $dato['humedad_min'],
                    'humedad_max' => $dato['humedad_max'],
                ]);
                $datosActualizados++;
            } else {
                TemperaturaBroilers::create([
                    'edad' => $dato['edad'],
                    'temperatura' => $dato['temperatura'],
                    'humedad_min' => $dato['humedad_min'],
                    'humedad_max' => $dato['humedad_max'],
                ]);
                $datosImportados++;
            }
        }
        
        return response()->json([
            'mensaje' => 'Importación completada',
            'creados' => $datosImportados,
            'actualizados' => $datosActualizados,
            'total' => $datosImportados + $datosActualizados
        ], Response::HTTP_OK);
    }
}