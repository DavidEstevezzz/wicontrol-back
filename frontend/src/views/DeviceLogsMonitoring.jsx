import React, { useState, useEffect, useCallback } from 'react';
import DeviceLogsApiService from '../services/DeviceLogsApiService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faThermometerHalf,
    faTint,
    faWind,
    faEye,
    faSun,
    faWeight,
    faSearch,
    faSync,
    faFilter,
    faClock,
    faMicrochip,
    faCalendarAlt,
    faChartLine,
    faExclamationTriangle,
    faCheckCircle,
    faDatabase,
    faPause,
    faPlay,
    faTimes,
    faChevronDown,
    faChevronRight,
    faServer,
    faCircle
} from '@fortawesome/free-solid-svg-icons';

const DeviceLogsMonitoring = () => {
    // Estados principales
    const [logs, setLogs] = useState([]);
    const [deviceSummary, setDeviceSummary] = useState([]);
    const [uniqueDevices, setUniqueDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshCountdown, setRefreshCountdown] = useState(30);

    // Estados para dispositivos expandidos
    const [expandedDevices, setExpandedDevices] = useState(new Set());

    // Estados de filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDevice, setSelectedDevice] = useState('');
    const [selectedSensor, setSelectedSensor] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [logsLimit, setLogsLimit] = useState(50); // Límite de logs por defecto

    // Estados de estadísticas
    const [stats, setStats] = useState({
        total_logs: 0,
        active_devices: 0,
        sensors_online: 0,
        last_update: null
    });

    // Mapeo de sensores
    const sensorMap = {
        1: { name: 'Deprecated', icon: faDatabase, color: 'text-gray-500' },
        2: { name: 'Sensor de Carga', icon: faWeight, color: 'text-purple-500' },
        3: { name: 'Sensor de Presencia', icon: faEye, color: 'text-blue-500' },
        4: { name: 'Sensor de Luminosidad', icon: faSun, color: 'text-yellow-500' },
        5: { name: 'Humedad Ambiente', icon: faTint, color: 'text-blue-400' },
        6: { name: 'Temperatura Ambiente', icon: faThermometerHalf, color: 'text-red-500' },
        9: { name: 'Presión Atmosférica', icon: faWind, color: 'text-green-500' },
        10: { name: 'CO2', icon: faWind, color: 'text-orange-500' },
        11: { name: 'TVOC', icon: faWind, color: 'text-teal-500' },
        12: { name: 'Temperatura Suelo', icon: faThermometerHalf, color: 'text-red-400' },
        13: { name: 'Humedad Suelo', icon: faTint, color: 'text-blue-300' }
    };

    // Obtener información del sensor
    const getSensorInfo = (sensorId) => {
        return sensorMap[sensorId] || { 
            name: `Sensor ${sensorId}`, 
            icon: faMicrochip, 
            color: 'text-gray-500' 
        };
    };

    // Función para cargar logs con límite
    const loadLogs = useCallback(async () => {
        try {
            setError('');
            let response;
            
            if (selectedDevice) {
                response = await DeviceLogsApiService.getLogsByDevice(selectedDevice, currentPage, logsLimit);
            } else if (selectedSensor) {
                response = await DeviceLogsApiService.getLogsBySensor(selectedSensor, currentPage, logsLimit);
            } else {
                response = await DeviceLogsApiService.getLogs(currentPage, logsLimit);
            }
            
            setLogs(response.data || response);
            setTotalPages(response.last_page || Math.ceil(response.total / logsLimit) || 1);
        } catch (err) {
            setError('Error al cargar los logs de dispositivos');
            console.error('Error loading logs:', err);
        }
    }, [currentPage, selectedDevice, selectedSensor, logsLimit]);

    // Función para cargar resumen de dispositivos
    const loadDeviceSummary = useCallback(async () => {
        try {
            const response = await DeviceLogsApiService.getLatestMeasurements();
            const measurements = response.data || response;
            
            // Agrupar mediciones por dispositivo
            const deviceGroups = measurements.reduce((acc, measurement) => {
                const deviceId = measurement.id_dispositivo;
                if (!acc[deviceId]) {
                    acc[deviceId] = {
                        id_dispositivo: deviceId,
                        sensors: [],
                        last_activity: measurement.fecha,
                        total_sensors: 0
                    };
                }
                
                acc[deviceId].sensors.push(measurement);
                acc[deviceId].total_sensors = acc[deviceId].sensors.length;
                
                // Mantener la actividad más reciente
                if (new Date(measurement.fecha) > new Date(acc[deviceId].last_activity)) {
                    acc[deviceId].last_activity = measurement.fecha;
                }
                
                return acc;
            }, {});
            
            setDeviceSummary(Object.values(deviceGroups));
        } catch (err) {
            console.error('Error loading device summary:', err);
        }
    }, []);

    // Función para cargar dispositivos únicos
    const loadUniqueDevices = useCallback(async () => {
        try {
            const response = await DeviceLogsApiService.getUniqueDevices();
            setUniqueDevices(response.data || response);
        } catch (err) {
            console.error('Error loading unique devices:', err);
        }
    }, []);

    // Función para cargar estadísticas
    const loadStats = useCallback(async () => {
        try {
            const response = await DeviceLogsApiService.getLogsStats();
            setStats(response.data || response);
        } catch (err) {
            console.error('Error loading stats:', err);
        }
    }, []);

    // Función para cargar todos los datos
    const loadAllData = useCallback(async () => {
        setLoading(true);
        await Promise.all([
            loadLogs(),
            loadDeviceSummary(),
            loadStats(),
            loadUniqueDevices()
        ]);
        setLoading(false);
    }, [loadLogs, loadDeviceSummary, loadStats, loadUniqueDevices]);

    // Efecto para cargar datos iniciales
    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    // Efecto para recargar logs cuando cambian los filtros
    useEffect(() => {
        setCurrentPage(1); // Reset a la primera página
        loadLogs();
    }, [selectedDevice, selectedSensor, logsLimit]);

    // Efecto para recargar logs cuando cambia la página
    useEffect(() => {
        loadLogs();
    }, [currentPage]);

    // Efecto para auto-refresh
    useEffect(() => {
        let interval;
        if (autoRefresh) {
            interval = setInterval(() => {
                setRefreshCountdown(prev => {
                    if (prev <= 1) {
                        loadAllData();
                        return 30;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [autoRefresh, loadAllData]);

    // Función para toggle auto-refresh
    const toggleAutoRefresh = () => {
        setAutoRefresh(prev => !prev);
        setRefreshCountdown(30);
    };

    // Función para refresh manual
    const handleManualRefresh = () => {
        setRefreshCountdown(30);
        loadAllData();
    };

    // Función para cambiar página
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    // Función para expandir/colapsar dispositivo
    const toggleDeviceExpansion = (deviceId) => {
        const newExpanded = new Set(expandedDevices);
        if (newExpanded.has(deviceId)) {
            newExpanded.delete(deviceId);
        } else {
            newExpanded.add(deviceId);
        }
        setExpandedDevices(newExpanded);
    };

    // Función para obtener el estado del dispositivo
    const getDeviceStatus = (lastActivity) => {
        const now = new Date();
        const lastUpdate = new Date(lastActivity);
        const diffMinutes = (now - lastUpdate) / (1000 * 60);
        
        if (diffMinutes <= 5) {
            return { status: 'online', color: 'text-green-500', label: 'En línea' };
        } else if (diffMinutes <= 30) {
            return { status: 'warning', color: 'text-yellow-500', label: 'Advertencia' };
        } else {
            return { status: 'offline', color: 'text-red-500', label: 'Desconectado' };
        }
    };

    // Filtrar logs por búsqueda (solo en frontend para los logs ya cargados)
    const filteredLogs = logs.filter(log => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            log.id_dispositivo?.toString().includes(term) ||
            log.id_sensor?.toString().includes(term) ||
            log.valor?.toString().includes(term) ||
            getSensorInfo(log.id_sensor).name.toLowerCase().includes(term)
        );
    });

    // Función para formatear fecha
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch {
            return 'N/A';
        }
    };

    // Función para formatear fecha relativa
    const formatRelativeTime = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const now = new Date();
            const date = new Date(dateString);
            const diffMs = now - date;
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            
            if (diffMinutes < 1) return 'Ahora mismo';
            if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
            
            const diffHours = Math.floor(diffMinutes / 60);
            if (diffHours < 24) return `Hace ${diffHours}h`;
            
            const diffDays = Math.floor(diffHours / 24);
            return `Hace ${diffDays}d`;
        } catch {
            return 'N/A';
        }
    };

    // Función para obtener unidad del sensor
    const getSensorUnit = (sensorId) => {
        switch (sensorId) {
            case 2: return 'gr';
            case 3: return '';
            case 4: return 'lux';
            case 5: case 13: return '%';
            case 6: case 12: return '°C';
            case 9: return 'hPa';
            case 10: return 'ppm';
            case 11: return 'ppb';
            default: return '';
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
                Monitoreo de Logs de Dispositivos
            </h1>

            {/* Estadísticas Generales */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                            <FontAwesomeIcon icon={faDatabase} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="ml-4">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Logs</h3>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">
                                {stats.total_logs?.toLocaleString() || '0'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                            <FontAwesomeIcon icon={faMicrochip} className="text-green-600 dark:text-green-400" />
                        </div>
                        <div className="ml-4">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Dispositivos Activos</h3>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">
                                {stats.active_devices || '0'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                            <FontAwesomeIcon icon={faChartLine} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="ml-4">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Sensores Online</h3>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">
                                {stats.sensors_online || '0'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
                            <FontAwesomeIcon 
                                icon={autoRefresh ? faCheckCircle : faExclamationTriangle} 
                                className={autoRefresh ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"} 
                            />
                        </div>
                        <div className="ml-4">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                {autoRefresh ? 'Auto-actualización' : 'Actualización pausada'}
                            </h3>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">
                                {autoRefresh ? `${refreshCountdown}s` : 'Pausado'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Resumen de Dispositivos */}
            <div className="mb-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                    Dispositivos ({deviceSummary.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {deviceSummary.map((device) => {
                        const deviceStatus = getDeviceStatus(device.last_activity);
                        const isExpanded = expandedDevices.has(device.id_dispositivo);
                        
                        return (
                            <div key={device.id_dispositivo} className="bg-white dark:bg-gray-800 rounded-lg shadow">
                                {/* Header del dispositivo */}
                                <div 
                                    className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-lg"
                                    onClick={() => toggleDeviceExpansion(device.id_dispositivo)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg mr-3">
                                                <FontAwesomeIcon 
                                                    icon={faServer} 
                                                    className="text-blue-500 text-lg" 
                                                />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                                                    Dispositivo {device.id_dispositivo}
                                                </h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {device.total_sensors} sensores activos
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="flex items-center">
                                                <FontAwesomeIcon 
                                                    icon={faCircle} 
                                                    className={`${deviceStatus.color} text-xs mr-1`} 
                                                />
                                                <span className={`text-sm ${deviceStatus.color}`}>
                                                    {deviceStatus.label}
                                                </span>
                                            </div>
                                            <FontAwesomeIcon 
                                                icon={isExpanded ? faChevronDown : faChevronRight} 
                                                className="text-gray-400" 
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        Última actividad: {formatRelativeTime(device.last_activity)}
                                    </div>
                                </div>

                                {/* Sensores expandidos */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
                                        <div className="mt-3 space-y-2">
                                            {device.sensors.map((sensor, index) => {
                                                const sensorInfo = getSensorInfo(sensor.id_sensor);
                                                const unit = getSensorUnit(sensor.id_sensor);
                                                
                                                return (
                                                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                                        <div className="flex items-center">
                                                            <FontAwesomeIcon 
                                                                icon={sensorInfo.icon} 
                                                                className={`${sensorInfo.color} mr-2`} 
                                                            />
                                                            <div>
                                                                <span className="text-sm font-medium text-gray-800 dark:text-white">
                                                                    {sensorInfo.name}
                                                                </span>
                                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                    ID: {sensor.id_sensor}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-sm font-bold text-gray-800 dark:text-white">
                                                                {sensor.valor} {unit}
                                                            </div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                {formatRelativeTime(sensor.fecha)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                {deviceSummary.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No hay dispositivos activos disponibles
                    </div>
                )}
            </div>

            {/* Controles y Filtros */}
            <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Búsqueda */}
                    <div className="relative flex-1 min-w-60">
                        <input
                            type="text"
                            placeholder="Buscar por dispositivo, sensor o valor..."
                            className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <FontAwesomeIcon
                            icon={faSearch}
                            className="absolute left-3 top-3 text-gray-500 dark:text-gray-400"
                        />
                        {searchTerm && (
                            <button
                                className="absolute right-3 top-2.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                onClick={() => setSearchTerm('')}
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        )}
                    </div>

                    {/* Filtro por dispositivo */}
                    <select
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                        value={selectedDevice}
                        onChange={(e) => setSelectedDevice(e.target.value)}
                    >
                        <option value="">Todos los dispositivos</option>
                        {uniqueDevices.map(deviceId => (
                            <option key={deviceId} value={deviceId}>
                                Dispositivo {deviceId}
                            </option>
                        ))}
                    </select>

                    {/* Filtro por sensor */}
                    <select
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                        value={selectedSensor}
                        onChange={(e) => setSelectedSensor(e.target.value)}
                    >
                        <option value="">Todos los sensores</option>
                        {Object.entries(sensorMap).map(([id, info]) => (
                            <option key={id} value={id}>{info.name}</option>
                        ))}
                    </select>

                    {/* Límite de logs */}
                    <select
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                        value={logsLimit}
                        onChange={(e) => setLogsLimit(Number(e.target.value))}
                    >
                        <option value={25}>25 logs</option>
                        <option value={50}>50 logs</option>
                        <option value={100}>100 logs</option>
                        <option value={200}>200 logs</option>
                    </select>

                    {/* Control de auto-refresh */}
                    <button
                        onClick={toggleAutoRefresh}
                        className={`px-4 py-2 rounded-lg flex items-center ${
                            autoRefresh 
                                ? 'bg-green-600 text-white hover:bg-green-700' 
                                : 'bg-gray-600 text-white hover:bg-gray-700'
                        }`}
                    >
                        <FontAwesomeIcon 
                            icon={autoRefresh ? faPause : faPlay} 
                            className="mr-2" 
                        />
                        {autoRefresh ? 'Pausar' : 'Reanudar'}
                    </button>

                    {/* Refresh manual */}
                    <button
                        onClick={handleManualRefresh}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                        disabled={loading}
                    >
                        <FontAwesomeIcon 
                            icon={faSync} 
                            className={`mr-2 ${loading ? 'animate-spin' : ''}`} 
                        />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900 dark:text-red-200 dark:border-red-700">
                    <p className="font-medium">{error}</p>
                </div>
            )}

            {/* Tabla de Logs */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                            Registro de Logs (Últimos {logsLimit})
                            {autoRefresh && (
                                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                                    (Actualización automática en {refreshCountdown}s)
                                </span>
                            )}
                        </h2>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            Mostrando {filteredLogs.length} de {logs.length} logs
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Fecha/Hora
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Dispositivo
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Sensor
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Valor
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Estado
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-4 text-center">
                                        <div className="flex justify-center items-center space-x-2">
                                            <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span className="text-gray-700 dark:text-gray-300">Cargando logs...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-4 text-center text-gray-700 dark:text-gray-300">
                                        No hay logs disponibles
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log, index) => {
                                    const sensorInfo = getSensorInfo(log.id_sensor);
                                    const unit = getSensorUnit(log.id_sensor);
                                    
                                    return (
                                   <tr key={log.id_entrada_dato || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                       <td className="px-6 py-4 whitespace-nowrap">
                                           <div className="flex items-center">
                                               <FontAwesomeIcon icon={faClock} className="text-gray-400 mr-2" />
                                               <div className="text-sm text-gray-900 dark:text-white">
                                                   {formatDate(log.fecha)}
                                               </div>
                                           </div>
                                       </td>
                                       <td className="px-6 py-4 whitespace-nowrap">
                                           <div className="flex items-center">
                                               <FontAwesomeIcon icon={faMicrochip} className="text-blue-500 mr-2" />
                                               <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                   {log.id_dispositivo}
                                               </div>
                                           </div>
                                       </td>
                                       <td className="px-6 py-4 whitespace-nowrap">
                                           <div className="flex items-center">
                                               <FontAwesomeIcon 
                                                   icon={sensorInfo.icon} 
                                                   className={`${sensorInfo.color} mr-2`} 
                                               />
                                               <div>
                                                   <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                       {sensorInfo.name}
                                                   </div>
                                                   <div className="text-xs text-gray-500 dark:text-gray-400">
                                                       ID: {log.id_sensor}
                                                   </div>
                                               </div>
                                           </div>
                                       </td>
                                       <td className="px-6 py-4 whitespace-nowrap">
                                           <div className="text-sm font-bold text-gray-900 dark:text-white">
                                               {log.valor} {unit}
                                           </div>
                                       </td>
                                       <td className="px-6 py-4 whitespace-nowrap">
                                           <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                               log.alta 
                                                   ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                                   : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                           }`}>
                                               {log.alta ? 'Activo' : 'Inactivo'}
                                           </span>
                                       </td>
                                   </tr>
                               );
                           })
                       )}
                   </tbody>
               </table>
           </div>

           {/* Paginación */}
           {totalPages > 1 && (
               <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                   <div className="text-sm text-gray-700 dark:text-gray-300">
                       Página {currentPage} de {totalPages}
                   </div>
                   <div className="flex space-x-2">
                       <button
                           onClick={() => handlePageChange(currentPage - 1)}
                           disabled={currentPage === 1}
                           className="px-3 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                           Anterior
                       </button>
                       
                       {/* Números de página */}
                       <div className="flex space-x-1">
                           {Array.from({ length: Math.min(5, totalPages) }).map((_, index) => {
                               let pageNum;
                               if (totalPages <= 5) {
                                   pageNum = index + 1;
                               } else if (currentPage <= 3) {
                                   pageNum = index + 1;
                               } else if (currentPage >= totalPages - 2) {
                                   pageNum = totalPages - 4 + index;
                               } else {
                                   pageNum = currentPage - 2 + index;
                               }

                               return (
                                   <button
                                       key={index}
                                       onClick={() => handlePageChange(pageNum)}
                                       className={`px-3 py-1 text-sm rounded-md ${currentPage === pageNum
                                           ? 'bg-blue-600 text-white'
                                           : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                                           }`}
                                   >
                                       {pageNum}
                                   </button>
                               );
                           })}
                       </div>

                       <button
                           onClick={() => handlePageChange(currentPage + 1)}
                           disabled={currentPage === totalPages}
                           className="px-3 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                           Siguiente
                       </button>
                   </div>
               </div>
           )}
       </div>
    </div>
   );
};

export default DeviceLogsMonitoring;