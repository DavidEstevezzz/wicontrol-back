<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Empresa extends Model
{
    // Nombre de la tabla
    protected $table = 'tb_empresa';

    // Clave primaria
    protected $primaryKey = 'id';

    // No usa timestamps created_at/updated_at
    public $timestamps = false;

    // Atributos asignables en masa
    protected $fillable = [
        'cif',
        'nombre_empresa',
        'direccion',
        'email',
        'telefono',
        'pagina_web',
        'pais',
        'provincia',
        'localidad',
        'codigo_postal',
        'fecha_hora_alta',
        'alta',
        'fecha_hora_baja',
        'lat',
        'lon',
        'usuario_contacto',
        'foto',
    ];

    // Casteos
    protected $casts = [
        'fecha_hora_alta'  => 'datetime',
        'fecha_hora_baja'  => 'datetime',
        'alta'             => 'boolean',
        'codigo_postal'    => 'integer',
    ];

    public function usuarios(): BelongsToMany
{
    return $this->belongsToMany(
        Usuario::class,
        'tb_relacion_usuario_empresa',
        'id_empresa',
        'id_usuario'
    );
}

    /**
     * Usuario de contacto (si aplica).
     */
    public function usuarioContacto(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'usuario_contacto');
    }
}
