<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PesoRoss extends Model
{
    use HasFactory;

    protected $table = 'tb_peso_ross';
    protected $primaryKey = 'id';
    public $timestamps = false;
    protected $fillable = [
        'edad',
        'Mixto',
        'Machos',
        'Hembras',
    ];
}
