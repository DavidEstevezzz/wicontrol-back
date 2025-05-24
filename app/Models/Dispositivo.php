<?php
// app/Models/Dispositivo.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Dispositivo extends Model
{
    protected $table = 'tb_dispositivo';
    protected $primaryKey = 'id_dispositivo';
    public $incrementing = true;
    protected $keyType = 'int';
    public $timestamps = false;

    protected $fillable = [
        'id_instalacion',
        'numero_serie',
        'ip_address',
        'bateria',
        'fecha_hora_last_msg',
        'fecha_hora_alta',
        'alta',
        'calibrado',
        'pesoCalibracion',
        'runCalibracion',
        'sensoresConfig',
        'Lat',
        'Lon',
        'fw_version',
        'hw_version',
        'count',
        'sensorMovimiento',
        'sensorCarga',
        'sensorLuminosidad',
        'sensorHumSuelo',
        'sensorTempAmbiente',
        'sensorHumAmbiente',
        'sensorPresion',
        'tiempoEnvio',
        'fecha_hora_baja',
        'sensorTempYacija',
        'errorCalib',
        'reset',
        'fecha_ultima_calibracion',
        'sensorCalidadAireCO2',
        'sensorCalidadAireTVOC',
        'sensorSHT20_temp',
        'sensorSHT20_humedad',
    ];

    protected $casts = [
        'id_instalacion'            => 'integer',
        'alta'                      => 'boolean',
        'calibrado'                 => 'integer',
        'runCalibracion'            => 'boolean',
        'count'                     => 'integer',
        'sensorMovimiento'          => 'integer',
        'sensorCarga'               => 'integer',
        'sensorLuminosidad'         => 'integer',
        'sensorHumSuelo'            => 'integer',
        'sensorTempAmbiente'        => 'integer',
        'sensorHumAmbiente'         => 'integer',
        'sensorPresion'             => 'integer',
        'tiempoEnvio'               => 'integer',
        'sensorTempYacija'          => 'integer',
        'errorCalib'                => 'integer',
        'reset'                     => 'boolean',
        'sensorCalidadAireCO2'      => 'integer',
        'sensorCalidadAireTVOC'     => 'integer',
        'sensorSHT20_temp'          => 'integer',
        'sensorSHT20_humedad'       => 'integer',
        'pesoCalibracion'           => 'float',
    ];

    protected $dates = [
        'fecha_hora_last_msg',
        'fecha_hora_alta',
        'fecha_hora_baja',
        'fecha_ultima_calibracion',
    ];

    public function instalacion()
    {
        return $this->belongsTo(Instalacion::class, 'id_instalacion');
    }

    public function entradasDatos()
    {
        return $this->hasMany(EntradaDato::class, 'id_dispositivo', 'numero_serie');
    }


    public function camadas()
    {
        return $this->belongsToMany(
            Camada::class,
            'tb_relacion_camada_dispositivo',
            'id_dispositivo',
            'id_camada'
        );
    }
}
