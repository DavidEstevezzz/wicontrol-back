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
        $usuarios = Usuario::with('empresa')->paginate(15);
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
            'empresa_id'      => 'required|exists:tb_empresa,id',
            'alta'            => 'boolean',
            'pais'            => 'nullable|string|max:50',
            'usuario_tipo'    => 'required|in:SuperMaster,Master,Responsable_Zona,Ganadero,Instalador,Demo,User',
            'dni'             => 'required|string|max:15|unique:tb_usuario,dni',
            'foto'            => 'nullable|string|max:50',
        ]);

        $usuario = Usuario::create($data);

        return response()->json($usuario, 201);
    }

    /**
     * Mostrar un usuario en particular.
     */
    public function show(Usuario $usuario)
    {
        $usuario->load('empresa');
        return response()->json($usuario);
    }

    /**
     * Actualizar un usuario existente.
     */
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
            'empresa_id'      => 'sometimes|required|exists:tb_empresa,id',
            'alta'            => 'sometimes|boolean',
            'pais'            => 'nullable|string|max:50',
            'usuario_tipo'    => 'sometimes|required|in:SuperMaster,Master,Responsable_Zona,Ganadero,Instalador,Demo,User',
            'dni'             => "sometimes|required|string|max:15|unique:tb_usuario,dni,{$usuario->id}",
            'foto'            => 'nullable|string|max:50',
        ]);

        $usuario->update($data);

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

        return response()->json([
            'message' => 'Usuario activado correctamente',
            'usuario' => $usuario
        ]);
    }
}
