<?php
// app/Models/EntradaDato.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EntradaDato extends Model
{
    // Se indica el nombre real de la tabla
    protected $table = 'tb_entrada_dato';

    // Clave primaria personalizada
    protected $primaryKey = 'id_entrada_dato';

    // Desactivar timestamps si no existen columnas created_at/updated_at
    public $timestamps = false;

    // Campos asignables masivamente
    protected $fillable = [
        'id_sensor',
        'valor',
        'fecha',
        'id_dispositivo',
        'alta',
    ];

    /**
     * Relación con Dispositivo
     */
    public function dispositivo()
    {
        return $this->belongsTo(Dispositivo::class, 'id_dispositivo', 'id_dispositivo');
    }
}

