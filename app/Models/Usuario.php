<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable; // si vas a usar autenticación
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Laravel\Sanctum\HasApiTokens;

class Usuario extends Authenticatable
{
    use HasFactory, HasApiTokens, Notifiable;


    // Si la tabla no sigue la convención plural de Laravel:
    protected $table = 'tb_usuario';

    // Clave primaria (opcional si es 'id' y auto-incremental):
    protected $primaryKey = 'id';

    // Si no vas a usar timestamps created_at/updated_at:
    public $timestamps = false;

    // Atributos asignables masivamente:
    protected $fillable = [
        'alias_usuario',
        'contrasena',
        'nombre',
        'apellidos',
        'direccion',
        'localidad',
        'provincia',
        'codigo_postal',
        'telefono',
        'email',
        'fecha_hora_alta',
        'empresa_id',
        'alta',
        'pais',
        'usuario_tipo',
        'dni',
        'foto',
    ];

    // Si tu columna de contraseña se llama distinto a 'password':
    public function setContrasenaAttribute($value)
    {
        $this->attributes['contrasena'] = bcrypt($value);
    }

    public function empresas(): BelongsToMany
{
    return $this->belongsToMany(
        Empresa::class,                     // Modelo relacionado
        'tb_relacion_usuario_empresa',      // Tabla pivot
        'id_usuario',                       // FK en pivot hacia este modelo
        'id_empresa'                        // FK en pivot hacia el modelo Empresa
    );
}

    // (Opcional) Cambiar nombre de campo para autenticación
    public function getAuthPassword()
    {
        return $this->contrasena;
    }

    public function granjas(): BelongsToMany
    {
        return $this->belongsToMany(
            Granja::class,                   // Modelo relacionado
            'tb_relacion_usuario_granja',    // Tabla pivot
            'id_usuario',                    // FK en pivot hacia este modelo
            'id_granja'                      // FK en pivot hacia el modelo Granja
        );
    }
}
