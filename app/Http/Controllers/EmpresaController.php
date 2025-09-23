<?php

namespace App\Http\Controllers;

use App\Models\Empresa;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Symfony\Component\HttpFoundation\Response;
use Exception;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;


class EmpresaController extends Controller
{
    /**
     * Listado de todas las empresas.
     */
    public function index(): JsonResponse
    {
        $empresas = Empresa::all();
        return response()->json($empresas);
    }

    /**
     * Crear una nueva empresa.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cif'              => 'required|string|max:50|unique:tb_empresa,cif',
            'nombre_empresa'   => 'required|string|max:50',
            'direccion'        => 'required|string|max:50',
            'email'            => 'nullable|email|max:50',
            'telefono'         => 'nullable|string|max:50',
            'pagina_web'       => 'nullable|url|max:50',
            'pais'             => 'required|string|max:50',
            'provincia'        => 'required|string|max:50',
            'localidad'        => 'required|string|max:50',
            'codigo_postal'    => 'required|integer',
            'fecha_hora_alta'  => 'required|date',
            'alta'             => 'boolean',
            'fecha_hora_baja'  => 'nullable|date',
            'lat'              => 'nullable|string|max:10',
            'lon'              => 'nullable|string|max:10',
            'usuario_contacto' => 'nullable|integer|exists:tb_usuario,id',
            'foto'             => 'nullable|string|max:50',
        ]);

        $empresa = Empresa::create($validated);

        return response()->json($empresa, 201);
    }

    /**
     * Mostrar una empresa concreta.
     */
    public function show(int $id): JsonResponse
    {
        $empresa = Empresa::findOrFail($id);
        return response()->json($empresa);
    }

    /**
     * Actualizar datos de una empresa.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $empresa = Empresa::findOrFail($id);

        $validated = $request->validate([
            'cif'              => "required|string|max:50|unique:tb_empresa,cif,{$id},id",
            'nombre_empresa'   => 'required|string|max:50',
            'direccion'        => 'required|string|max:50',
            'email'            => 'nullable|email|max:50',
            'telefono'         => 'nullable|string|max:50',
            'pagina_web'       => 'nullable|url|max:50',
            'pais'             => 'required|string|max:50',
            'provincia'        => 'required|string|max:50',
            'localidad'        => 'required|string|max:50',
            'codigo_postal'    => 'required|integer',
            'fecha_hora_alta'  => 'required|date',
            'alta'             => 'boolean',
            'fecha_hora_baja'  => 'nullable|date',
            'lat'              => 'nullable|string|max:10',
            'lon'              => 'nullable|string|max:10',
            'usuario_contacto' => 'nullable|integer|exists:tb_usuario,id',
            'foto'             => 'nullable|string|max:50',
        ]);

        $empresa->update($validated);

        return response()->json($empresa);
    }

    /**
     * Eliminar una empresa.
     */
    public function destroy(int $id): JsonResponse
    {
        Empresa::findOrFail($id)->delete();
        return response()->json(null, 204);
    }

    public function getUsuarios(int $empresaId): JsonResponse
{
    try {
        // Verificar que la empresa existe
        $empresa = Empresa::findOrFail($empresaId);
        
        // 🔍 DEBUGGING: Log información básica
        Log::info("=== DEBUG getUsuarios ===");
        Log::info("Empresa ID: " . $empresaId);
        Log::info("Empresa encontrada: " . $empresa->nombre_empresa);
        
        // 🔍 DEBUGGING: Verificar datos en la tabla pivot directamente
        $pivotData = DB::table('tb_relacion_usuario_empresa')
            ->where('id_empresa', $empresaId)
            ->get();
        
        Log::info("Registros en pivot para empresa {$empresaId}: " . $pivotData->count());
        Log::info("Datos pivot: " . json_encode($pivotData->toArray()));
        
        // 🔍 DEBUGGING: Verificar usuarios sin filtro de 'alta'
        $usuariosSinFiltro = $empresa->usuarios()
            ->select(['id', 'nombre', 'apellidos', 'alias_usuario', 'email', 'dni', 'usuario_tipo', 'alta'])
            ->get();
        
        Log::info("Usuarios SIN filtro 'alta': " . $usuariosSinFiltro->count());
        Log::info("Usuarios data SIN filtro: " . json_encode($usuariosSinFiltro->toArray()));
        
        // 🔍 DEBUGGING: Verificar usuarios CON filtro de 'alta'
        $usuariosConFiltro = $empresa->usuarios()
            ->select(['id', 'nombre', 'apellidos', 'alias_usuario', 'email', 'dni', 'usuario_tipo', 'alta'])
            ->where('alta', 1)
            ->get();
        
        Log::info("Usuarios CON filtro 'alta=1': " . $usuariosConFiltro->count());
        
        // 🔍 DEBUGGING: Verificar la query SQL generada
        $query = $empresa->usuarios()
            ->select(['id', 'nombre', 'apellidos', 'alias_usuario', 'email', 'dni', 'usuario_tipo', 'alta'])
            ->where('alta', 1)
            ->orderBy('nombre')
            ->orderBy('apellidos');
            
        Log::info("SQL Query: " . $query->toSql());
        Log::info("Query Bindings: " . json_encode($query->getBindings()));
        
        // Usar la consulta con filtro 'alta' = 1 (como estaba originalmente)
        $usuarios = $usuariosConFiltro;

        // 🔍 DEBUGGING: Verificar si hay usuarios con alta = 0
        $usuariosInactivos = $empresa->usuarios()
            ->where('alta', 0)
            ->get();
       Log::info("Usuarios INACTIVOS (alta=0): " . $usuariosInactivos->count());

        return response()->json([
            'empresa_id' => $empresaId,
            'empresa_nombre' => $empresa->nombre_empresa,
            'total_usuarios' => $usuarios->count(),
            'usuarios' => $usuarios,
            // 🔍 DEBUGGING: Agregar info extra para depuración
            'debug_info' => [
                'pivot_records' => $pivotData->count(),
                'usuarios_sin_filtro' => $usuariosSinFiltro->count(),
                'usuarios_con_filtro' => $usuariosConFiltro->count(),
                'usuarios_inactivos' => $usuariosInactivos->count()
            ]
        ], Response::HTTP_OK);
        
    } catch (ModelNotFoundException $e) {
        Log::error("Empresa no encontrada: " . $empresaId);
        return response()->json([
            'error' => 'Empresa no encontrada'
        ], Response::HTTP_NOT_FOUND);
    } catch (Exception $e) {
        Log::error("Error en getUsuarios: " . $e->getMessage());
        Log::error("Stack trace: " . $e->getTraceAsString());
        return response()->json([
            'error' => 'Error al obtener usuarios de la empresa',
            'message' => $e->getMessage()
        ], Response::HTTP_INTERNAL_SERVER_ERROR);
    }
}


    
}
