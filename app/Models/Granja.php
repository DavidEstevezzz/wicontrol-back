<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;


class Granja extends Model
{
    protected $table = 'tb_granja';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $fillable = [
        'codigo',
        'nombre',
        'direccion',
        'email',
        'telefono',
        'pais',
        'provincia',
        'localidad',
        'codigo_postal',
        'empresa_id',
        'fecha_hora_alta',
        'alta',
        'fecha_hora_baja',
        'lat',
        'lon',
        'usuario_contacto',
        'ganadero',
        'clonado_de',
        'numero_rega',
        'numero_naves',
        'disp_naves',
        'foto',
        'responsable',
    ];

    // Relaciones
    public function empresa()
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function usuarioContacto()
    {
        return $this->belongsTo(Usuario::class, 'usuario_contacto');
    }

    public function ganadero()
    {
        return $this->belongsTo(Usuario::class, 'ganadero');
    }

    // Si tb_entrada_dato tiene granja_id
    public function entradas()
    {
        return $this->hasMany(EntradaDato::class, 'granja_id');
    }

    public function usuarios(): BelongsToMany
    {
        return $this->belongsToMany(
            Usuario::class,                  // Modelo relacionado
            'tb_relacion_usuario_granja',    // Tabla pivot
            'id_granja',                     // FK en pivot hacia este modelo
            'id_usuario'                     // FK en pivot hacia el modelo Usuario
        );
    }
    public function camadas()
    {
        return $this->hasMany(Camada::class, 'codigo_granja', 'numero_rega');
    }

    public function instalaciones()
    {
        return $this->hasMany(Instalacion::class, 'numero_rega', 'numero_rega');
    }

    public function dispositivos()
    {
        // a través de instalaciones
        return $this->hasManyThrough(
            Dispositivo::class,
            Instalacion::class,
            'numero_rega',     // FK en tb_instalacion
            'id_instalacion',    // FK en tb_dispositivo
            'numero_rega',       // PK local
            'id_instalacion'     // PK en Instalacion
        );
    }

    public function entradasDatos()
{
    // Usar una subconsulta para obtener los números de serie de los dispositivos de esta granja
    return EntradaDato::whereIn('id_dispositivo', function($query) {
        $query->select('d.numero_serie')
              ->from('tb_dispositivo as d')
              ->join('tb_instalacion as i', 'd.id_instalacion', '=', 'i.id_instalacion')
              ->where('i.numero_rega', $this->numero_rega);
    });
}
}
