<?php

namespace App\Http\Controllers;

use App\Models\Usuario;
use Illuminate\Http\Request;

class UsuarioController extends Controller
{
    /**
     * Mostrar listado de usuarios.
     */
    public function index()
    {
        $usuarios = Usuario::with('empresas')->paginate(15);
        return response()->json($usuarios);
    }

    /**
     * Almacenar un nuevo usuario.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'alias_usuario'   => 'required|string|max:50|unique:tb_usuario,alias_usuario',
            'contrasena'      => 'required|string|min:6',
            'nombre'          => 'required|string|max:50',
            'apellidos'       => 'required|string|max:50',
            'direccion'       => 'required|string|max:50',
            'localidad'       => 'required|string|max:50',
            'provincia'       => 'required|string|max:50',
            'codigo_postal'   => 'required|integer',
            'telefono'        => 'required|string|max:50',
            'email'           => 'required|email|max:50',
            'fecha_hora_alta' => 'required|date',
            'empresas'        => 'required|array',
            'empresas.*'      => 'exists:tb_empresa,id',
            'alta'            => 'boolean',
            'pais'            => 'nullable|string|max:50',
            'usuario_tipo'    => 'required|in:SuperMaster,Master,Responsable_Zona,Ganadero,Instalador,Demo,User',
            'dni'             => 'required|string|max:15|unique:tb_usuario,dni',
            'foto'            => 'nullable|string|max:50',
        ]);

        // Extraer el array de empresas antes de crear el usuario
        $empresasIds = $data['empresas'] ?? [];
        unset($data['empresas']);

        $usuario = Usuario::create($data);

        // Asociar las empresas al usuario
        if (!empty($empresasIds)) {
            $usuario->empresas()->attach($empresasIds);
        }

        // Cargar la relación para devolverla en la respuesta
        $usuario->load('empresas');

        return response()->json($usuario, 201);
    }

    public function show(Usuario $usuario)
    {
        $usuario->load('empresas');
        return response()->json($usuario);
    }

    public function update(Request $request, Usuario $usuario)
{
    $data = $request->validate([
        'alias_usuario'   => "sometimes|required|string|max:50|unique:tb_usuario,alias_usuario,{$usuario->id}",
        'contrasena'      => 'sometimes|required|string|min:6',
        'nombre'          => 'sometimes|required|string|max:50',
        'apellidos'       => 'sometimes|required|string|max:50',
        'direccion'       => 'sometimes|required|string|max:50',
        'localidad'       => 'sometimes|required|string|max:50',
        'provincia'       => 'sometimes|required|string|max:50',
        'codigo_postal'   => 'sometimes|required|integer',
        'telefono'        => 'sometimes|required|string|max:50',
        'email'           => "sometimes|required|email|max:50|unique:tb_usuario,email,{$usuario->id}",
        'fecha_hora_alta' => 'sometimes|required|date',
        'empresas'        => 'sometimes|required|array',
        'empresas.*'      => 'exists:tb_empresa,id',
        'alta'            => 'sometimes|boolean',
        'pais'            => 'nullable|string|max:50',
        'usuario_tipo'    => 'sometimes|required|in:SuperMaster,Master,Responsable_Zona,Ganadero,Instalador,Demo,User',
        'dni'             => "sometimes|required|string|max:15|unique:tb_usuario,dni,{$usuario->id}",
        'foto'            => 'nullable|string|max:50',
    ]);

    // Extraer el array de empresas antes de actualizar el usuario
    $empresasIds = null;
    if (isset($data['empresas'])) {
        $empresasIds = $data['empresas'];
        unset($data['empresas']);
    }

    $usuario->update($data);
    
    // Actualizar las empresas si se proporcionaron
    if ($empresasIds !== null) {
        $usuario->empresas()->sync($empresasIds);
    }

    // Cargar la relación para devolverla en la respuesta
    $usuario->load('empresas');

    return response()->json($usuario);
}
    /**
     * Eliminar (o desactivar) un usuario.
     */
    public function destroy(Usuario $usuario)
    {
        // Puedes hacer un delete real o marcarlo como baja:
        $usuario->alta = 0;
        $usuario->save();

        return response()->json(null, 204);
    }

    /**
     * Activar (dar de alta) un usuario.
     */
    public function activate(Usuario $usuario)
{
    $usuario->alta = 1;
    $usuario->save();
    
    // Cargar la relación de empresas
    $usuario->load('empresas');

    return response()->json([
        'message' => 'Usuario activado correctamente',
        'usuario' => $usuario
    ]);
}
}
