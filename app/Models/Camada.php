<?php
// app/Models/Camada.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Camada extends Model
{
    // Nombre de la tabla si no sigue el plural standard
    protected $table = 'tb_camada';

    // Clave primaria personalizada
    protected $primaryKey = 'id_camada';

    // Usamos columnas personalizadas para created_at / updated_at
    const CREATED_AT = 'fecha_hora_alta';
    const UPDATED_AT = 'fecha_hora_last';

    // Si no quieres que Eloquent maneje timestamps automáticos:
    // public $timestamps = false;

    // Mass-assignment
    protected $fillable = [
        'nombre_camada',
        'sexaje',
        'tipo_ave',
        'tipo_estirpe',
        'fecha_hora_inicio',
        'fecha_hora_final',
        'alta',
        'alta_user',
        'cierre_user',
        'codigo_granja',
        'id_naves',
    ];

    // Castings de tipo
    protected $casts = [
        'id_camada'            => 'integer',
        'fecha_hora_inicio'    => 'datetime',
        'fecha_hora_final'     => 'datetime',
        'fecha_hora_alta'      => 'datetime',
        'fecha_hora_last'      => 'datetime',
        'alta'                 => 'integer',
    ];


    public function dispositivos()
    {
        return $this->belongsToMany(
            Dispositivo::class,
            'tb_relacion_camada_dispositivo',
            'id_camada',
            'id_dispositivo'
        );
    }


    
}
