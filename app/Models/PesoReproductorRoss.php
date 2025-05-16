<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PesoReproductorRoss extends Model
{
    protected $table = 'tb_peso_reproductores_ross';
    public $timestamps = false;

    protected $primaryKey = 'edad';
    public $incrementing = false;
    protected $keyType = 'int';

    protected $fillable = [
        'edad',
        'macho',
        'hembra',
    ];
}
