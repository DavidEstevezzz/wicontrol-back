<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PesoPavoNicholasSelect extends Model
{
    protected $table = 'tb_peso_pavos_nicholasselect';
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
