<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Instalacion extends Model
{
    protected $table = 'tb_instalacion';
    protected $primaryKey = 'id_instalacion';
    public $timestamps = false;
    protected $fillable = [
        'id_usuario',
        'numero_rega',
        'fecha_hora_alta',
        'alta',
        'id_nave'
    ];
}
