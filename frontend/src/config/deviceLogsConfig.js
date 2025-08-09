// src/config/deviceLogsConfig.js
export const DEVICE_LOGS_CONFIG = {
    // Configuración de actualización automática
    AUTO_REFRESH_INTERVAL: 30, // segundos
    
    // Configuración de paginación
    DEFAULT_PAGE_SIZE: 50,
    MAX_PAGE_SIZE: 100,
    
    // Configuración de colores para sensores
    SENSOR_COLORS: {
        1: '#6b7280', // gray-500 - Deprecated
        2: '#8b5cf6', // purple-500 - Sensor de Carga
        3: '#3b82f6', // blue-500 - Sensor de Presencia
        4: '#eab308', // yellow-500 - Sensor de Luminosidad
        5: '#60a5fa', // blue-400 - Humedad Ambiente
        6: '#ef4444', // red-500 - Temperatura Ambiente
        9: '#10b981', // green-500 - Presión Atmosférica
        10: '#f97316', // orange-500 - CO2
        11: '#14b8a6', // teal-500 - TVOC
        12: '#f87171', // red-400 - Temperatura Suelo
        13: '#93c5fd'  // blue-300 - Humedad Suelo
    },
    
    // Configuración de formatos de fecha
    DATE_FORMATS: {
        FULL: {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        },
        SHORT: {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        },
        TIME_ONLY: {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }
    },
    
    // Configuración de sensores
    SENSOR_INFO: {
        1: { 
            name: 'Deprecated', 
            unit: '', 
            icon: 'faDatabase',
            category: 'system',
            description: 'Sensor deprecado'
        },
        2: { 
            name: 'Sensor de Carga', 
            unit: 'gr', 
            icon: 'faWeight',
            category: 'weight',
            description: 'Medición de peso/carga'
        },
        3: { 
            name: 'Sensor de Presencia', 
            unit: '', 
            icon: 'faEye',
            category: 'motion',
            description: 'Detección de movimiento/presencia'
        },
        4: { 
            name: 'Sensor de Luminosidad', 
            unit: 'lux', 
            icon: 'faSun',
            category: 'light',
            description: 'Medición de intensidad lumínica'
        },
        5: { 
            name: 'Humedad Ambiente', 
            unit: '%', 
            icon: 'faTint',
            category: 'environment',
            description: 'Humedad relativa del aire'
        },
        6: { 
            name: 'Temperatura Ambiente', 
            unit: '°C', 
            icon: 'faThermometerHalf',
            category: 'environment',
            description: 'Temperatura del aire'
        },
        9: { 
            name: 'Presión Atmosférica', 
            unit: 'hPa', 
            icon: 'faWind',
            category: 'environment',
            description: 'Presión barométrica'
        },
        10: { 
            name: 'CO2', 
            unit: 'ppm', 
            icon: 'faWind',
            category: 'air_quality',
            description: 'Concentración de dióxido de carbono'
        },
        11: { 
            name: 'TVOC', 
            unit: 'ppb', 
            icon: 'faWind',
            category: 'air_quality',
            description: 'Compuestos orgánicos volátiles totales'
        },
        12: { 
            name: 'Temperatura Suelo', 
            unit: '°C', 
            icon: 'faThermometerHalf',
            category: 'soil',
            description: 'Temperatura del suelo/sustrato'
        },
        13: { 
            name: 'Humedad Suelo', 
            unit: '%', 
            icon: 'faTint',
            category: 'soil',
            description: 'Humedad del suelo/sustrato'
        }
    },
    
    // Configuración de estados de dispositivos
    DEVICE_STATUS: {
        ONLINE: {
            label: 'En línea',
            color: 'green',
            threshold: 300 // segundos sin datos para considerar offline
        },
        OFFLINE: {
            label: 'Desconectado',
            color: 'red'
        },
        WARNING: {
            label: 'Advertencia',
            color: 'yellow',
            threshold: 600 // segundos para estado de advertencia
        }
    },
    
    // Configuración de filtros
    FILTERS: {
        TIME_RANGES: [
            { label: 'Última hora', value: 'last_hour' },
            { label: 'Últimas 6 horas', value: 'last_6_hours' },
            { label: 'Últimas 24 horas', value: 'last_24_hours' },
            { label: 'Últimos 7 días', value: 'last_7_days' },
            { label: 'Último mes', value: 'last_month' },
            { label: 'Personalizado', value: 'custom' }
        ],
        SENSOR_CATEGORIES: [
            { label: 'Ambiente', value: 'environment', sensors: [5, 6, 9] },
            { label: 'Suelo', value: 'soil', sensors: [12, 13] },
            { label: 'Calidad del aire', value: 'air_quality', sensors: [10, 11] },
            { label: 'Movimiento', value: 'motion', sensors: [3] },
            { label: 'Peso', value: 'weight', sensors: [2] },
            { label: 'Luz', value: 'light', sensors: [4] }
        ]
    },
    
    // Configuración de exportación
    EXPORT: {
        FORMATS: ['csv', 'json', 'xlsx'],
        MAX_RECORDS: 10000,
        FILENAME_PREFIX: 'device_logs_',
        DATE_FORMAT: 'YYYYMMDD_HHmmss'
    },
    
    // Configuración de rendimiento
    PERFORMANCE: {
        DEBOUNCE_SEARCH: 300, // milisegundos
        VIRTUAL_SCROLL_ENABLED: true,
        VIRTUAL_SCROLL_ITEM_HEIGHT: 60,
        MAX_VISIBLE_ROWS: 100
    },
    
    // Configuración de UI
    UI: {
        COMPACT_MODE: false,
        SHOW_GRID_LINES: true,
        SHOW_ROW_NUMBERS: false,
        HIGHLIGHT_RECENT: true,
        RECENT_THRESHOLD: 60 // segundos para considerar "reciente"
    },
    
    // Configuración de datos
    DATA: {
        CACHE_ENABLED: true,
        CACHE_DURATION: 30000, // milisegundos
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000 // milisegundos
    }
};

export default DEVICE_LOGS_CONFIG;