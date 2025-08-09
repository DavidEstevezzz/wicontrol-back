import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faWifi,
  faBatteryHalf,
  faMapMarkerAlt,
  faCalendarAlt,
  faBuilding,
  faNetworkWired,
  faTools,
  faCheckCircle,
  faTimesCircle,
  faWarehouse,
  faUser,
  faInfoCircle,
  faMicrochip,
  faTemperatureHigh,
  faWater,
  faLightbulb,
  faGauge,
  faWind,
  faLeaf,
  faFlask
} from '@fortawesome/free-solid-svg-icons';
import DispositivoApiService from '../services/DispositivoApiService';
import { useDarkMode } from '../contexts/DarkModeContext';

export default function ViewDeviceModal({ isOpen, onClose, device }) {
  const { darkMode } = useDarkMode();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deviceDetails, setDeviceDetails] = useState(null);
  const [granjaInfo, setGranjaInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('general'); // 'general' o 'sensors'
  
  // Cargar detalles adicionales del dispositivo
  useEffect(() => {
    const fetchDeviceDetails = async () => {
      if (!device || !isOpen) return;
      
      setLoading(true);
      try {
        // Obtener información detallada del dispositivo
        const details = await DispositivoApiService.getById(device.id_dispositivo);
        setDeviceDetails(details);
        
        // Intentar obtener información de la granja y nave
        try {
          const granjaData = await DispositivoApiService.getGranjaYNave(device.id_dispositivo);
          setGranjaInfo(granjaData);
        } catch (granjaErr) {
          console.log('No se pudo obtener información de la granja:', granjaErr);
          // No mostramos error, simplemente no tendremos esa información
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching device details:', err);
        setError('Error al cargar los detalles del dispositivo.');
        setLoading(false);
      }
    };
    
    fetchDeviceDetails();
  }, [device, isOpen]);
  
  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };
  
  // Función para obtener el icono del sensor
  const getSensorIcon = (sensorName) => {
    switch(sensorName) {
      case 'sensorMovimiento': return faWind;
      case 'sensorCarga': return faGauge;
      case 'sensorLuminosidad': return faLightbulb;
      case 'sensorHumAmbiente': return faWater;
      case 'sensorTempAmbiente': return faTemperatureHigh;
      case 'sensorPresion': return faGauge;
      case 'sensorTempYacija': return faTemperatureHigh;
      case 'sensorCalidadAireCO2': return faLeaf;
      case 'sensorCalidadAireTVOC': return faFlask;
      case 'sensorSHT20_temp': return faTemperatureHigh;
      case 'sensorSHT20_humedad': return faWater;
      default: return faMicrochip;
    }
  };
  
  // Obtener el nombre legible del sensor
  const getSensorName = (sensorKey) => {
    const sensorNames = {
      sensorMovimiento: 'Sensor de Movimiento (id 3)',
      sensorCarga: 'Sensor de Carga (id 2)',
      sensorLuminosidad: 'Sensor de Luminosidad (id 4)',
      sensorHumAmbiente: 'Sensor de Humedad Ambiente (id 5)',
      sensorTempAmbiente: 'Sensor de Temperatura Ambiente (id 6)',
      sensorPresion: 'Sensor de Presión (id 9)',
      sensorTempYacija: 'Sensor de Temperatura Yacija',
      sensorCalidadAireCO2: 'Sensor de CO2 - ppm (id 10)',
      sensorCalidadAireTVOC: 'Sensor de TVOC - ppb (id 11)',
      sensorSHT20_temp: 'Sensor SHT20 - Temperatura del Suelo °C (id 12)',
      sensorSHT20_humedad: 'Sensor SHT20 - Humedad del Suelo % (id 13)'
    };
    
    return sensorNames[sensorKey] || sensorKey;
  };
  
  // Si el modal no está abierto o no hay dispositivo, no renderizar nada
  if (!isOpen || !device) return null;
  
  // Usar device o deviceDetails según disponibilidad
  const displayDevice = deviceDetails || device;
  
  // Determinar el estado del dispositivo
  const getDeviceStatus = () => {
    if (!displayDevice.alta) {
      return { 
        icon: faTimesCircle, 
        color: 'text-red-600 dark:text-red-400', 
        text: 'Inactivo',
        bgColor: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
      };
    }
    if (displayDevice.calibrado) {
      return { 
        icon: faCheckCircle, 
        color: 'text-green-600 dark:text-green-400', 
        text: 'Activo y Calibrado',
        bgColor: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
      };
    }
    return { 
      icon: faTools, 
      color: 'text-amber-600 dark:text-amber-400', 
      text: 'Activo (Sin Calibrar)',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
    };
  };
  
  const deviceStatus = getDeviceStatus();
  
  // ✅ Lista de sensores corregida según la estructura real de la BD
  const sensores = [
    { key: 'sensorMovimiento', value: displayDevice.sensorMovimiento },
    { key: 'sensorCarga', value: displayDevice.sensorCarga },
    { key: 'sensorLuminosidad', value: displayDevice.sensorLuminosidad },
    { key: 'sensorHumAmbiente', value: displayDevice.sensorHumAmbiente },
    { key: 'sensorTempAmbiente', value: displayDevice.sensorTempAmbiente },
    { key: 'sensorPresion', value: displayDevice.sensorPresion },
    { key: 'sensorTempYacija', value: displayDevice.sensorTempYacija },
    { key: 'sensorCalidadAireCO2', value: displayDevice.sensorCalidadAireCO2 },
    { key: 'sensorCalidadAireTVOC', value: displayDevice.sensorCalidadAireTVOC },
    { key: 'sensorSHT20_temp', value: displayDevice.sensorSHT20_temp },
    { key: 'sensorSHT20_humedad', value: displayDevice.sensorSHT20_humedad }
    // ❌ EXCLUIDO: sensorHumSuelo porque está deprecado
  ].filter(sensor => sensor.value !== undefined && sensor.value !== null && sensor.value !== -1);
  
  // Sensores activos (valor > 0 para periódicos, valor = 1 para eventos)
  const sensoresActivos = sensores.filter(sensor => {
    // Para sensores de eventos (movimiento, carga)
    if (sensor.key === 'sensorMovimiento' || sensor.key === 'sensorCarga') {
      return sensor.value === 1;
    }
    // Para sensores periódicos
    return sensor.value > 0;
  });
  
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
            Detalles del Dispositivo: {displayDevice.numero_serie || `#${displayDevice.id_dispositivo}`}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FontAwesomeIcon icon={faTimes} className="text-xl" />
          </button>
        </div>
        
        {/* Estado de carga o error */}
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="ml-3 text-gray-700 dark:text-gray-300">Cargando detalles...</span>
          </div>
        ) : error ? (
          <div className="m-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900 dark:text-red-200 dark:border-red-700">
            <p>{error}</p>
          </div>
        ) : (
          <>
            {/* Pestañas */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex px-6">
                <button
                  onClick={() => setActiveTab('general')}
                  className={`py-3 px-4 font-medium text-sm border-b-2 focus:outline-none ${
                    activeTab === 'general'
                      ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
                  Información General
                </button>
                <button
                  onClick={() => setActiveTab('sensors')}
                  className={`py-3 px-4 font-medium text-sm border-b-2 focus:outline-none ${
                    activeTab === 'sensors'
                      ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <FontAwesomeIcon icon={faMicrochip} className="mr-2" />
                  Sensores
                </button>
              </nav>
            </div>
            
            {/* Contenido de la pestaña */}
            <div className="p-6">
              {/* Estado del dispositivo */}
              <div className={`mb-6 p-3 rounded-md ${deviceStatus.bgColor}`}>
                <div className="flex items-center">
                  <FontAwesomeIcon icon={deviceStatus.icon} className={`mr-2 ${deviceStatus.color}`} />
                  <span className="font-medium">{deviceStatus.text}</span>
                </div>
              </div>
              
              {/* Pestaña de Información General */}
              {activeTab === 'general' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-lg shadow-sm">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-3">Datos Básicos</h3>
                    <div className="space-y-2">
                      <div className="flex">
                        <span className="w-40 text-sm font-medium text-gray-600 dark:text-gray-400">ID:</span>
                        <span className="text-sm text-gray-800 dark:text-white">{displayDevice.id_dispositivo}</span>
                      </div>
                      <div className="flex">
                        <span className="w-40 text-sm font-medium text-gray-600 dark:text-gray-400">Número de Serie:</span>
                        <span className="text-sm text-gray-800 dark:text-white">{displayDevice.numero_serie || 'N/A'}</span>
                      </div>
                      <div className="flex">
                        <span className="w-40 text-sm font-medium text-gray-600 dark:text-gray-400">Fecha de Alta:</span>
                        <span className="text-sm text-gray-800 dark:text-white">{formatDate(displayDevice.fecha_hora_alta)}</span>
                      </div>
                      <div className="flex">
                        <span className="w-40 text-sm font-medium text-gray-600 dark:text-gray-400">Último Mensaje:</span>
                        <span className="text-sm text-gray-800 dark:text-white">{formatDate(displayDevice.fecha_hora_last_msg)}</span>
                      </div>
                      <div className="flex">
                        <span className="w-40 text-sm font-medium text-gray-600 dark:text-gray-400">Fecha Baja:</span>
                        <span className="text-sm text-gray-800 dark:text-white">{formatDate(displayDevice.fecha_hora_baja) || 'N/A'}</span>
                      </div>
                      <div className="flex">
                        <span className="w-40 text-sm font-medium text-gray-600 dark:text-gray-400">Última Calibración:</span>
                        <span className="text-sm text-gray-800 dark:text-white">{formatDate(displayDevice.fecha_ultima_calibracion) || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-lg shadow-sm">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-3">Conectividad</h3>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <FontAwesomeIcon icon={faWifi} className="w-5 mr-2 text-blue-500" />
                        <span className="w-36 text-sm font-medium text-gray-600 dark:text-gray-400">Dirección IP:</span>
                        <span className="text-sm text-gray-800 dark:text-white">{displayDevice.ip_address || 'N/A'}</span>
                      </div>
                      <div className="flex items-center">
                        <FontAwesomeIcon icon={faBatteryHalf} className="w-5 mr-2 text-green-500" />
                        <span className="w-36 text-sm font-medium text-gray-600 dark:text-gray-400">Batería:</span>
                        <span className="text-sm text-gray-800 dark:text-white">
                          {displayDevice.bateria ? `${displayDevice.bateria}%` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <FontAwesomeIcon icon={faNetworkWired} className="w-5 mr-2 text-purple-500" />
                        <span className="w-36 text-sm font-medium text-gray-600 dark:text-gray-400">Tiempo de Envío:</span>
                        <span className="text-sm text-gray-800 dark:text-white">
                          {displayDevice.tiempoEnvio ? `${displayDevice.tiempoEnvio} minutos` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <FontAwesomeIcon icon={faMicrochip} className="w-5 mr-2 text-red-500" />
                        <span className="w-36 text-sm font-medium text-gray-600 dark:text-gray-400">Versión HW:</span>
                        <span className="text-sm text-gray-800 dark:text-white">{displayDevice.hw_version || 'N/A'}</span>
                      </div>
                      <div className="flex items-center">
                        <FontAwesomeIcon icon={faMicrochip} className="w-5 mr-2 text-amber-500" />
                        <span className="w-36 text-sm font-medium text-gray-600 dark:text-gray-400">Versión FW:</span>
                        <span className="text-sm text-gray-800 dark:text-white">{displayDevice.fw_version || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-lg shadow-sm">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-3">Ubicación</h3>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="w-5 mr-2 text-red-500" />
                        <span className="w-36 text-sm font-medium text-gray-600 dark:text-gray-400">Coordenadas:</span>
                        <span className="text-sm text-gray-800 dark:text-white">
                          {displayDevice.Lat && displayDevice.Lon 
                            ? `${displayDevice.Lat}, ${displayDevice.Lon}` 
                            : 'N/A'}
                        </span>
                      </div>
                      
                      {granjaInfo && (
                        <>
                          <div className="flex items-center">
                            <FontAwesomeIcon icon={faBuilding} className="w-5 mr-2 text-blue-500" />
                            <span className="w-36 text-sm font-medium text-gray-600 dark:text-gray-400">Granja:</span>
                            <span className="text-sm text-gray-800 dark:text-white">
                              {granjaInfo.granja.nombre || granjaInfo.granja.numero_rega || 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <FontAwesomeIcon icon={faBuilding} className="w-5 mr-2 text-blue-500" />
                            <span className="w-36 text-sm font-medium text-gray-600 dark:text-gray-400">Código REGA:</span>
                            <span className="text-sm text-gray-800 dark:text-white">
                              {granjaInfo.granja.numero_rega || 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <FontAwesomeIcon icon={faWarehouse} className="w-5 mr-2 text-blue-500" />
                            <span className="w-36 text-sm font-medium text-gray-600 dark:text-gray-400">Nave:</span>
                            <span className="text-sm text-gray-800 dark:text-white">
                              {granjaInfo.nave.id || 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <FontAwesomeIcon icon={faMapMarkerAlt} className="w-5 mr-2 text-blue-500" />
                            <span className="w-36 text-sm font-medium text-gray-600 dark:text-gray-400">Dirección:</span>
                            <span className="text-sm text-gray-800 dark:text-white">
                              {granjaInfo.granja.direccion 
                                ? `${granjaInfo.granja.direccion}, ${granjaInfo.granja.localidad}, ${granjaInfo.granja.provincia}` 
                                : 'N/A'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-lg shadow-sm">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-3">Instalación</h3>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <FontAwesomeIcon icon={faBuilding} className="w-5 mr-2 text-blue-500" />
                        <span className="w-36 text-sm font-medium text-gray-600 dark:text-gray-400">ID Instalación:</span>
                        <span className="text-sm text-gray-800 dark:text-white">
                          {displayDevice.id_instalacion || 'N/A'}
                        </span>
                      </div>
                      
                      {granjaInfo && granjaInfo.instalacion && (
                        <div className="flex items-center">
                          <FontAwesomeIcon icon={faUser} className="w-5 mr-2 text-blue-500" />
                          <span className="w-36 text-sm font-medium text-gray-600 dark:text-gray-400">Instalador:</span>
                          <span className="text-sm text-gray-800 dark:text-white">
                            {displayDevice.usuario_id || 'N/A'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Pestaña de Sensores */}
              {activeTab === 'sensors' && (
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">Configuración de Sensores</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {sensoresActivos.length > 0 
                        ? `Este dispositivo tiene ${sensoresActivos.length} sensores activos.` 
                        : 'Este dispositivo no tiene sensores configurados.'}
                    </p>
                  </div>
                  
                  {sensoresActivos.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sensoresActivos.map(sensor => (
                        <div 
                          key={sensor.key} 
                          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm"
                        >
                          <div className="flex items-center mb-2">
                            <FontAwesomeIcon 
                              icon={getSensorIcon(sensor.key)} 
                              className="text-blue-500 dark:text-blue-400 mr-3 text-xl"
                            />
                            <h4 className="font-medium text-gray-800 dark:text-white">
                              {getSensorName(sensor.key)}
                            </h4>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            <div className="flex justify-between">
                              <span>Estado:</span>
                              <span className="font-medium text-green-600 dark:text-green-400">Activo</span>
                            </div>
                            <div className="flex justify-between mt-1">
                              <span>Valor:</span>
                              <span className="font-medium text-gray-800 dark:text-white">
                                {sensor.key === 'sensorMovimiento' || sensor.key === 'sensorCarga' 
                                  ? 'Por eventos' 
                                  : `${sensor.value} min`}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-900/30 p-6 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                      <FontAwesomeIcon icon={faTools} className="text-gray-400 text-4xl mb-3" />
                      <p className="text-gray-600 dark:text-gray-400">
                        No hay sensores configurados en este dispositivo.
                      </p>
                    </div>
                  )}
                  
                  {/* Información técnica de sensores */}
                  <div className="mt-8">
                    <h3 className="text-md font-medium text-gray-800 dark:text-white mb-3">Información Técnica de Sensores</h3>
                    <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-100 dark:bg-gray-800">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Sensor
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Estado
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Valor BD
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {sensores.map(sensor => (
                            <tr key={sensor.key} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-white">
                                <div className="flex items-center">
                                  <FontAwesomeIcon 
                                    icon={getSensorIcon(sensor.key)} 
                                    className="text-blue-500 dark:text-blue-400 mr-2"
                                  />
                                  {getSensorName(sensor.key)}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 dark:text-white">
                                {sensor.value > 0 || sensor.value === 1 ? (
                                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                                    Activo
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200">
                                    Inactivo
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                {sensor.value}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Configuración adicional de sensores */}
                  <div className="mt-8 bg-gray-50 dark:bg-gray-900/30 p-4 rounded-lg shadow-sm">
                    <h3 className="text-md font-medium text-gray-800 dark:text-white mb-3">Configuración Adicional</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex">
                        <span className="w-40 text-sm font-medium text-gray-600 dark:text-gray-400">sensoresConfig:</span>
                        <span className="text-sm text-gray-800 dark:text-white">{displayDevice.sensoresConfig || '0'}</span>
                      </div>
                      <div className="flex">
                        <span className="w-40 text-sm font-medium text-gray-600 dark:text-gray-400">Count:</span>
                        <span className="text-sm text-gray-800 dark:text-white">{displayDevice.count || '1'}</span>
                      </div>
                      <div className="flex">
                        <span className="w-40 text-sm font-medium text-gray-600 dark:text-gray-400">Error Calibración:</span>
                        <span className="text-sm text-gray-800 dark:text-white">{displayDevice.errorCalib || '0'}</span>
                      </div>
                      <div className="flex">
                        <span className="w-40 text-sm font-medium text-gray-600 dark:text-gray-400">Peso Calibración:</span>
                        <span className="text-sm text-gray-800 dark:text-white">
                          {displayDevice.pesoCalibracion 
                            ? `${displayDevice.pesoCalibracion} kg` 
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex">
                        <span className="w-40 text-sm font-medium text-gray-600 dark:text-gray-400">Run Calibración:</span>
                        <span className="text-sm text-gray-800 dark:text-white">
                          {displayDevice.runCalibracion === true 
                            ? 'Sí' 
                            : displayDevice.runCalibracion === false 
                              ? 'No' 
                              : 'N/A'}
                        </span>
                      </div>
                      <div className="flex">
                        <span className="w-40 text-sm font-medium text-gray-600 dark:text-gray-400">Reset:</span>
                        <span className="text-sm text-gray-800 dark:text-white">
                          {displayDevice.reset === true 
                            ? 'Sí' 
                            : displayDevice.reset === false 
                              ? 'No' 
                              : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
        
        {/* Pie del modal */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900/30 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}