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

    public function granja()
    {
        return $this->belongsTo(Granja::class, 'numero_rega', 'numero_rega');
    }

    // Relación con Usuario (instalador)
    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'id_usuario', 'id');
    }
}
