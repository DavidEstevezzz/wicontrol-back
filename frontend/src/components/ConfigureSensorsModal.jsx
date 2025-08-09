import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faMicrochip,
  faSave,
  faClock,
  faLightbulb,
  faWater,
  faTemperatureHigh,
  faGauge,
  faLeaf,
  faFlask,
  faWind,
  faWeight
} from '@fortawesome/free-solid-svg-icons';
import DispositivoApiService from '../services/DispositivoApiService';
import { useDarkMode } from '../contexts/DarkModeContext';

export default function ConfigureSensorsModal({ isOpen, onClose, onSensorsConfigured, device }) {
  const { darkMode } = useDarkMode();

  // Estados
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [autoReset, setAutoReset] = useState(true); // Por defecto activado

  const [sensorConfig, setSensorConfig] = useState({
    // Sensores periódicos
    sensorLuminosidad: { activo: false, valor: 30 },
    sensorHumAmbiente: { activo: false, valor: 30 },
    sensorTempAmbiente: { activo: false, valor: 30 },
    sensorPresion: { activo: false, valor: 30 },
    sensorTempYacija: { activo: false, valor: 30 },
    sensorCalidadAireCO2: { activo: false, valor: 0 },
    sensorCalidadAireTVOC: { activo: false, valor: 0 },
    // ✅ CORREGIDO: Usar nombres reales de BD
    sensorSHT20_temp: { activo: false, valor: 30 },
    sensorSHT20_humedad: { activo: false, valor: 30 },

    // Sensores por eventos
    sensorMovimiento: { activo: false },
    sensorCarga: { activo: false },

    tiempoEnvio: 30,
    useRecommendedValues: false
  });

  // Cargar la configuración actual del dispositivo
  useEffect(() => {
    if (device && isOpen) {
      loadDeviceConfiguration();
    }
  }, [device, isOpen]);
  const loadDeviceConfiguration = () => {
    console.log('=== DEBUG: Configuración real del dispositivo ===');
    console.log('Device completo:', device);

    // ✅ Función helper que prioriza valores de BD
    const getSensorConfiguration = (dbValue, defaultValue) => {
      console.log(`Evaluando sensor con valor BD: ${dbValue}, default: ${defaultValue}`);

      // Si el sensor está deshabilitado (-1), no está activo
      if (dbValue === -1) {
        return { activo: false, valor: defaultValue };
      }

      // Si el sensor tiene un valor válido en la BD, usarlo
      if (dbValue && dbValue > 0) {
        return { activo: true, valor: dbValue };
      }

      // Si el valor es null/undefined/0, sensor inactivo con valor por defecto
      return { activo: false, valor: defaultValue };
    };

    console.log('=== Valores desde la BD ===');
    console.log('sensorLuminosidad BD:', device.sensorLuminosidad);
    console.log('sensorHumAmbiente BD:', device.sensorHumAmbiente);
    console.log('sensorTempAmbiente BD:', device.sensorTempAmbiente);
    console.log('sensorPresion BD:', device.sensorPresion);
    console.log('sensorTempYacija BD:', device.sensorTempYacija);
    console.log('sensorMovimiento BD:', device.sensorMovimiento);
    console.log('sensorCarga BD:', device.sensorCarga);
    console.log('sensorCalidadAireCO2 BD:', device.sensorCalidadAireCO2);
    console.log('sensorCalidadAireTVOC BD:', device.sensorCalidadAireTVOC);
    console.log('sensorSHT20_temp BD:', device.sensorSHT20_temp);
    console.log('sensorSHT20_humedad BD:', device.sensorSHT20_humedad);
    console.log('tiempoEnvio BD:', device.tiempoEnvio);

    setSensorConfig({
      // ✅ Todos los sensores obtienen su configuración de la BD
      sensorLuminosidad: getSensorConfiguration(device.sensorLuminosidad, 30),
      sensorHumAmbiente: getSensorConfiguration(device.sensorHumAmbiente, 30),
      sensorTempAmbiente: getSensorConfiguration(device.sensorTempAmbiente, 30),
      sensorPresion: getSensorConfiguration(device.sensorPresion, 30),
      sensorTempYacija: getSensorConfiguration(device.sensorTempYacija, 30),
      sensorCalidadAireCO2: getSensorConfiguration(device.sensorCalidadAireCO2, 0),
      sensorCalidadAireTVOC: getSensorConfiguration(device.sensorCalidadAireTVOC, 0),
      // ✅ CORREGIDO: Usar nombres exactos de BD
      sensorSHT20_temp: getSensorConfiguration(device.sensorSHT20_temp, 30),
      sensorSHT20_humedad: getSensorConfiguration(device.sensorSHT20_humedad, 55),

      // Sensores por eventos
      sensorMovimiento: { activo: device.sensorMovimiento === 1 },
      sensorCarga: { activo: device.sensorCarga === 1 },

      // Tiempo de envío desde BD
      tiempoEnvio: device.tiempoEnvio || 10,
      useRecommendedValues: false
    });
  };

  // Manejar cambios en los checkboxes
  const handleCheckboxChange = (sensorName) => {
    setSensorConfig(prevState => {
      const newState = { ...prevState };

      if (sensorName === 'sensorMovimiento' || sensorName === 'sensorCarga') {
        newState[sensorName] = {
          ...prevState[sensorName],
          activo: !prevState[sensorName].activo
        };
      } else {
        newState[sensorName] = {
          ...prevState[sensorName],
          activo: !prevState[sensorName].activo
        };

        if (!prevState[sensorName].activo && (prevState[sensorName].valor <= 0 || prevState[sensorName].valor === -1)) {
          const defaultValues = {
            sensorLuminosidad: 30,
            sensorHumAmbiente: 30,
            sensorTempAmbiente: 30,
            sensorPresion: 30,
            sensorTempYacija: 30,
            sensorCalidadAireCO2: 0,
            sensorCalidadAireTVOC: 0,
            sensorSHT20_temp: 30,      // ✅ CORREGIDO
            sensorSHT20_humedad: 55    // ✅ CORREGIDO
          };
          newState[sensorName].valor = defaultValues[sensorName] || 30;
        }
      }

      return newState;
    });
  };

  // Manejar cambios en los valores de tiempo
  const handleValueChange = (sensorName, value) => {
    setSensorConfig(prevState => ({
      ...prevState,
      [sensorName]: {
        ...prevState[sensorName],
        valor: value
      }
    }));
  };

  // Manejar cambio en tiempo de envío
  const handleTiempoEnvioChange = (value) => {
    setSensorConfig(prevState => ({
      ...prevState,
      tiempoEnvio: value
    }));
  };

  // Manejar aplicar valores recomendados
  const handleRecommendedValues = (checked) => {
    setSensorConfig(prevState => {
      if (checked) {
        return {
          ...prevState,
          sensorLuminosidad: { ...prevState.sensorLuminosidad, valor: 30 },
          sensorHumAmbiente: { ...prevState.sensorHumAmbiente, valor: 30 },
          sensorTempAmbiente: { ...prevState.sensorTempAmbiente, valor: 30 },
          sensorPresion: { ...prevState.sensorPresion, valor: 30 },
          sensorTempYacija: { ...prevState.sensorTempYacija, valor: 30 },
          sensorSHT20_temp: { ...prevState.sensorSHT20_temp, valor: 30 },        // ✅ CORREGIDO
          sensorSHT20_humedad: { ...prevState.sensorSHT20_humedad, valor: 55 },  // ✅ CORREGIDO
          tiempoEnvio: 30,
          useRecommendedValues: checked
        };
      }

      return {
        ...prevState,
        useRecommendedValues: checked
      };
    });
  };

  // Función handleSubmit corregida con mapeo final
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const updatedData = {
        // Sensores periódicos
        sensorLuminosidad: sensorConfig.sensorLuminosidad.activo ? sensorConfig.sensorLuminosidad.valor : -1,
        sensorHumAmbiente: sensorConfig.sensorHumAmbiente.activo ? sensorConfig.sensorHumAmbiente.valor : -1,
        sensorTempAmbiente: sensorConfig.sensorTempAmbiente.activo ? sensorConfig.sensorTempAmbiente.valor : -1,
        sensorPresion: sensorConfig.sensorPresion.activo ? sensorConfig.sensorPresion.valor : -1,
        sensorTempYacija: sensorConfig.sensorTempYacija.activo ? sensorConfig.sensorTempYacija.valor : -1,
        sensorCalidadAireCO2: sensorConfig.sensorCalidadAireCO2.activo ? sensorConfig.sensorCalidadAireCO2.valor : -1,
        sensorCalidadAireTVOC: sensorConfig.sensorCalidadAireTVOC.activo ? sensorConfig.sensorCalidadAireTVOC.valor : -1,
        sensorSHT20_temp: sensorConfig.sensorSHT20_temp.activo ? sensorConfig.sensorSHT20_temp.valor : -1,
        sensorSHT20_humedad: sensorConfig.sensorSHT20_humedad.activo ? sensorConfig.sensorSHT20_humedad.valor : -1,

        // Sensores por eventos
        sensorMovimiento: sensorConfig.sensorMovimiento.activo ? 1 : -1,
        sensorCarga: sensorConfig.sensorCarga.activo ? 1 : -1,

        // Tiempo de envío (en minutos)
        tiempoEnvio: sensorConfig.tiempoEnvio,

        // Contador corregido
        sensoresConfig: (
          (sensorConfig.sensorLuminosidad.activo ? 1 : 0) +
          (sensorConfig.sensorHumAmbiente.activo ? 1 : 0) +
          (sensorConfig.sensorTempAmbiente.activo ? 1 : 0) +
          (sensorConfig.sensorPresion.activo ? 1 : 0) +
          (sensorConfig.sensorTempYacija.activo ? 1 : 0) +
          (sensorConfig.sensorCalidadAireCO2.activo ? 1 : 0) +
          (sensorConfig.sensorCalidadAireTVOC.activo ? 1 : 0) +
          (sensorConfig.sensorSHT20_temp.activo ? 1 : 0) +
          (sensorConfig.sensorSHT20_humedad.activo ? 1 : 0) +
          (sensorConfig.sensorMovimiento.activo ? 1 : 0) +
          (sensorConfig.sensorCarga.activo ? 1 : 0)
        )
      };

      console.log('=== Guardando configuración de sensores ===');
      console.log(updatedData);

      // 1. Guardar la configuración de sensores
      const response = await DispositivoApiService.update(device.id_dispositivo, updatedData);

      // 2. Si está habilitado el reset automático, programar reset
      if (autoReset && device.alta) {
        try {
          console.log('=== Programando reset automático ===');
          const resetResponse = await DispositivoApiService.resetDevice(device.id_dispositivo);

          if (resetResponse.success) {
            setSuccess(true);
            console.log('Reset programado exitosamente:', resetResponse.message);
          } else {
            console.warn('No se pudo programar el reset:', resetResponse.message);
            setSuccess(true); // La configuración se guardó, solo falló el reset
          }
        } catch (resetError) {
          console.error('Error al programar reset automático:', resetError);
          // No fallar toda la operación por el reset
          setSuccess(true);
        }
      } else {
        setSuccess(true);
      }

      onSensorsConfigured(response);
      setTimeout(() => { onClose(); }, 2000); // Dar más tiempo para ver el mensaje

    } catch (err) {
      console.error('Error updating sensor configuration:', err);
      setError('Error al guardar la configuración de sensores. Por favor, inténtelo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Si el modal no está abierto o no hay dispositivo, no renderizar nada
  if (!isOpen || !device) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center">
      {/* Fondo oscurecido */}
      <div
        className="fixed inset-0 bg-black opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto ${darkMode ? 'dark' : ''}`}>
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
            <FontAwesomeIcon icon={faMicrochip} className="mr-2 text-blue-600 dark:text-blue-400" />
            Configurar sensores: {device.numero_serie || `#${device.id_dispositivo}`}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FontAwesomeIcon icon={faTimes} className="text-xl" />
          </button>
        </div>

        {/* Contenido */}
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {/* Mensaje de error */}
            {error && (
              <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900 dark:text-red-200 dark:border-red-700">
                <p className="font-medium">{error}</p>
              </div>
            )}

            {/* Mensaje de éxito */}
            {success && (
              <div className="mb-6 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 dark:bg-green-900 dark:text-green-200 dark:border-green-700">
                <p className="font-medium">Configuración guardada correctamente.</p>
                {autoReset && device.alta && (
                  <p className="text-sm mt-1">
                    ✓ Reset automático programado. El dispositivo se reiniciará en el próximo heartbeat para aplicar los cambios.
                  </p>
                )}
                {autoReset && !device.alta && (
                  <p className="text-sm mt-1 text-yellow-600 dark:text-yellow-400">
                    ⚠ No se programó reset automático porque el dispositivo está inactivo.
                  </p>
                )}
              </div>
            )}

            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                Valores actuales desde la BD:
              </h3>
              <div className="text-xs text-blue-600 dark:text-blue-300 grid grid-cols-2 gap-2">
                <div>Luminosidad (id4): {device.sensorLuminosidad ?? 'No definido'}</div>
                <div>Humedad Ambiente (id5): {device.sensorHumAmbiente ?? 'No definido'}</div>
                <div>Temp. Ambiente (id6): {device.sensorTempAmbiente ?? 'No definido'}</div>
                <div>Presión (id9): {device.sensorPresion ?? 'No definido'}</div>
                <div>Temp. Yacija: {device.sensorTempYacija ?? 'No definido'}</div>
                <div>Movimiento (id3): {device.sensorMovimiento ?? 'No definido'}</div>
                <div>Carga (id2): {device.sensorCarga ?? 'No definido'}</div>
                <div>CO2 (id10): {device.sensorCalidadAireCO2 ?? 'No definido'}</div>
                <div>TVOC (id11): {device.sensorCalidadAireTVOC ?? 'No definido'}</div>
                <div>SHT20 Temp. Suelo (id12): {device.sensorSHT20_temp ?? 'No definido'}</div>
                <div>SHT20 Hum. Suelo (id13): {device.sensorSHT20_humedad ?? 'No definido'}</div>
                <div>Tiempo Envío: {device.tiempoEnvio ?? 'No definido'} min</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Columna de sensores periódicos */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
                  Sensores periódicos
                </h3>

                {/* Sensor de luminosidad */}
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <FontAwesomeIcon icon={faLightbulb} className="text-yellow-500 mr-2" />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Sensor de luminosidad
                    </label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="sensorLuminosidad"
                      checked={sensorConfig.sensorLuminosidad.activo}
                      onChange={() => handleCheckboxChange('sensorLuminosidad')}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="sensorLuminosidad" className="text-sm text-gray-600 dark:text-gray-400">
                      Disponible
                    </label>
                    <input
                      type="number"
                      value={sensorConfig.sensorLuminosidad.valor}
                      onChange={(e) => handleValueChange('sensorLuminosidad', parseInt(e.target.value) || 0)}
                      disabled={!sensorConfig.sensorLuminosidad.activo || sensorConfig.useRecommendedValues}
                      min="1"
                      className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                    />
                    <span className="text-xs text-gray-500">seg</span>
                  </div>
                </div>

                {/* Sensor de Humedad ambiente */}
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <FontAwesomeIcon icon={faWater} className="text-blue-500 mr-2" />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Sensor de Humedad ambiente
                    </label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="sensorHumAmbiente"
                      checked={sensorConfig.sensorHumAmbiente.activo}
                      onChange={() => handleCheckboxChange('sensorHumAmbiente')}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="sensorHumAmbiente" className="text-sm text-gray-600 dark:text-gray-400">
                      Disponible
                    </label>
                    <input
                      type="number"
                      value={sensorConfig.sensorHumAmbiente.valor}
                      onChange={(e) => handleValueChange('sensorHumAmbiente', parseInt(e.target.value) || 0)}
                      disabled={!sensorConfig.sensorHumAmbiente.activo || sensorConfig.useRecommendedValues}
                      min="1"
                      className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                    />
                    <span className="text-xs text-gray-500">seg</span>
                  </div>
                </div>

                {/* Sensor de temperatura ambiente */}
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <FontAwesomeIcon icon={faTemperatureHigh} className="text-red-500 mr-2" />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Sensor de temperatura ambiente
                    </label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="sensorTempAmbiente"
                      checked={sensorConfig.sensorTempAmbiente.activo}
                      onChange={() => handleCheckboxChange('sensorTempAmbiente')}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="sensorTempAmbiente" className="text-sm text-gray-600 dark:text-gray-400">
                      Disponible
                    </label>
                    <input
                      type="number"
                      value={sensorConfig.sensorTempAmbiente.valor}
                      onChange={(e) => handleValueChange('sensorTempAmbiente', parseInt(e.target.value) || 0)}
                      disabled={!sensorConfig.sensorTempAmbiente.activo || sensorConfig.useRecommendedValues}
                      min="1"
                      className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                    />
                    <span className="text-xs text-gray-500">seg</span>
                  </div>
                </div>

                {/* Sensor de Presión atmosférica */}
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <FontAwesomeIcon icon={faGauge} className="text-purple-500 mr-2" />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Sensor de Presión atmosférica
                    </label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="sensorPresion"
                      checked={sensorConfig.sensorPresion.activo}
                      onChange={() => handleCheckboxChange('sensorPresion')}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="sensorPresion" className="text-sm text-gray-600 dark:text-gray-400">
                      Disponible
                    </label>
                    <input
                      type="number"
                      value={sensorConfig.sensorPresion.valor}
                      onChange={(e) => handleValueChange('sensorPresion', parseInt(e.target.value) || 0)}
                      disabled={!sensorConfig.sensorPresion.activo || sensorConfig.useRecommendedValues}
                      min="1"
                      className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                    />
                    <span className="text-xs text-gray-500">seg</span>
                  </div>
                </div>

                {/* Sensor de calidad del aire CO2 */}
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <FontAwesomeIcon icon={faLeaf} className="text-green-500 mr-2" />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Sensor de calidad del aire CO2
                    </label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="sensorCalidadAireCO2"
                      checked={sensorConfig.sensorCalidadAireCO2.activo}
                      onChange={() => handleCheckboxChange('sensorCalidadAireCO2')}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="sensorCalidadAireCO2" className="text-sm text-gray-600 dark:text-gray-400">
                      Disponible
                    </label>
                    <input
                      type="text"
                      value="No disponible"
                      disabled
                      className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Sensor de calidad del aire TVOC */}
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <FontAwesomeIcon icon={faFlask} className="text-indigo-500 mr-2" />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Sensor de calidad del aire TVOC
                    </label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="sensorCalidadAireTVOC"
                      checked={sensorConfig.sensorCalidadAireTVOC.activo}
                      onChange={() => handleCheckboxChange('sensorCalidadAireTVOC')}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="sensorCalidadAireTVOC" className="text-sm text-gray-600 dark:text-gray-400">
                      Disponible
                    </label>
                    <input
                      type="text"
                      value="No disponible"
                      disabled
                      className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <FontAwesomeIcon icon={faTemperatureHigh} className="text-red-500 mr-2" />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Sensor SHT20 - Temperatura del suelo (°C)
                    </label>
                    <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">id 12</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="sensorSHT20_temp"
                      checked={sensorConfig.sensorSHT20_temp.activo}
                      onChange={() => handleCheckboxChange('sensorSHT20_temp')}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="sensorSHT20_temp" className="text-sm text-gray-600 dark:text-gray-400">
                      Disponible
                    </label>
                    <input
                      type="number"
                      value={sensorConfig.sensorSHT20_temp.valor}
                      onChange={(e) => handleValueChange('sensorSHT20_temp', parseInt(e.target.value) || 0)}
                      disabled={!sensorConfig.sensorSHT20_temp.activo || sensorConfig.useRecommendedValues}
                      min="1"
                      className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                    />
                    <span className="text-xs text-gray-500">seg</span>
                  </div>
                </div>

                {/* Sensor de humedad del suelo */}
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <FontAwesomeIcon icon={faWater} className="text-teal-500 mr-2" />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Sensor SHT20 - Humedad del suelo (%)
                    </label>
                    <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">id 13</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="sensorSHT20_humedad"
                      checked={sensorConfig.sensorSHT20_humedad.activo}
                      onChange={() => handleCheckboxChange('sensorSHT20_humedad')}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="sensorSHT20_humedad" className="text-sm text-gray-600 dark:text-gray-400">
                      Disponible
                    </label>
                    <input
                      type="number"
                      value={sensorConfig.sensorSHT20_humedad.valor}
                      onChange={(e) => handleValueChange('sensorSHT20_humedad', parseInt(e.target.value) || 0)}
                      disabled={!sensorConfig.sensorSHT20_humedad.activo || sensorConfig.useRecommendedValues}
                      min="1"
                      className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                    />
                    <span className="text-xs text-gray-500">seg</span>
                  </div>
                </div>

                <p className="text-xs text-red-600 dark:text-red-400 mt-2 mb-4">
                  *Todos los valores se establecen en segundos.
                </p>
              </div>

              {/* Columna de sensores por eventos y tiempo de envío */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
                  Sensores por eventos
                </h3>

                {/* Sensor de movimiento */}
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <FontAwesomeIcon icon={faWind} className="text-blue-500 mr-2" />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Sensor de movimiento
                    </label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="sensorMovimiento"
                      checked={sensorConfig.sensorMovimiento.activo}
                      onChange={() => handleCheckboxChange('sensorMovimiento')}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="sensorMovimiento" className="text-sm text-gray-600 dark:text-gray-400">
                      Disponible
                    </label>
                    <span className="text-xs text-gray-500 ml-2">
                      (Sensor por eventos)
                    </span>
                  </div>
                </div>

                {/* Sensor célula de carga */}
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <FontAwesomeIcon icon={faWeight} className="text-green-500 mr-2" />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Sensor célula de carga
                    </label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="sensorCarga"
                      checked={sensorConfig.sensorCarga.activo}
                      onChange={() => handleCheckboxChange('sensorCarga')}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="sensorCarga" className="text-sm text-gray-600 dark:text-gray-400">
                      Disponible
                    </label>
                    <span className="text-xs text-gray-500 ml-2">
                      (Sensor por eventos)
                    </span>
                  </div>
                </div>

                {/* Valores recomendados */}
                <div className="mt-6 mb-8">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="useRecommendedValues"
                      checked={sensorConfig.useRecommendedValues}
                      onChange={(e) => handleRecommendedValues(e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="useRecommendedValues" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Todos los sensores con valores recomendados
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-7">
                    Aplicará valores óptimos para todos los sensores periódicos
                  </p>
                </div>

                {/* Tiempo de envío */}
                <div className="mt-8">
                  <div className="flex items-center mb-3">
                    <FontAwesomeIcon icon={faClock} className="text-blue-500 mr-2" />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Tiempo de envío
                    </label>
                    <span className="ml-1 text-gray-500 dark:text-gray-400 text-xs">
                      (Frecuencia de comunicación)
                    </span>
                  </div>
                  <select
                    value={sensorConfig.tiempoEnvio}
                    onChange={(e) => handleTiempoEnvioChange(parseInt(e.target.value))}
                    disabled={sensorConfig.useRecommendedValues}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                  >
                    <option value="1">1 segundo</option>
                    <option value="10">10 segundos</option>
                    <option value="30">30 segundos</option>
                    <option value="60">1 minuto</option>
                    <option value="120">2 minutos</option>
                    <option value="180">3 minutos</option>
                    <option value="240">4 minutos</option>
                    <option value="300">5 minutos</option>
                    <option value="360">6 minutos</option>
                    <option value="420">7 minutos</option>
                    <option value="480">8 minutos</option>
                    <option value="540">9 minutos</option>
                    <option value="600">10 minutos</option>
                  </select>
                </div>

                {/* Resumen de configuración */}
                <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-800 dark:text-white mb-2">
                    Resumen de configuración
                  </h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p>
                      Sensores activos: {
                        (sensorConfig.sensorLuminosidad.activo ? 1 : 0) +
                        (sensorConfig.sensorHumAmbiente.activo ? 1 : 0) +
                        (sensorConfig.sensorTempAmbiente.activo ? 1 : 0) +
                        (sensorConfig.sensorPresion.activo ? 1 : 0) +
                        (sensorConfig.sensorTempYacija.activo ? 1 : 0) +
                        (sensorConfig.sensorCalidadAireCO2.activo ? 1 : 0) +
                        (sensorConfig.sensorCalidadAireTVOC.activo ? 1 : 0) +
                        (sensorConfig.sensorSHT20_temp.activo ? 1 : 0) +
                        (sensorConfig.sensorSHT20_humedad.activo ? 1 : 0) +
                        (sensorConfig.sensorMovimiento.activo ? 1 : 0) +
                        (sensorConfig.sensorCarga.activo ? 1 : 0)
                      }
                    </p>
                    <p>Tiempo de envío: {
                      sensorConfig.tiempoEnvio < 60
                        ? `${sensorConfig.tiempoEnvio} segundos`
                        : `${Math.floor(sensorConfig.tiempoEnvio / 60)} ${Math.floor(sensorConfig.tiempoEnvio / 60) === 1 ? 'minuto' : 'minutos'}`
                    }</p>
                    <p>
                      Valores recomendados: {sensorConfig.useRecommendedValues ? 'Sí' : 'No'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="autoReset"
                checked={autoReset}
                onChange={(e) => setAutoReset(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
              />
              <div>
                <label htmlFor="autoReset" className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Resetear dispositivo automáticamente
                </label>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  {device.alta
                    ? "Al guardar la configuración, se programará un reset automático del dispositivo para aplicar los cambios. El reset se ejecutará en el próximo heartbeat."
                    : "El dispositivo está inactivo. No se puede programar reset automático."
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Pie del modal */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900/30 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSave} className="mr-2" />
                  Guardar Configuración
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}