// src/services/DeviceLogsApiService.js
import BaseApiService from './BaseApiService';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.wicontrol.site';

class DeviceLogsApiService {
    // Obtener los logs más recientes con paginación
    async getLogs(page = 1, limit = 50) {
        try {
            const response = await BaseApiService.get(`${API_URL}/api/device-logs`, { 
                page, 
                limit 
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching device logs:', error);
            throw error;
        }
    }

    // Obtener la última medición de cada sensor
    async getLatestMeasurements() {
        try {
            const response = await BaseApiService.get(`${API_URL}/api/device-logs/latest-measurements`);
            return response.data;
        } catch (error) {
            console.error('Error fetching latest measurements:', error);
            throw error;
        }
    }

    // Obtener logs filtrados por dispositivo
    async getLogsByDevice(deviceId, page = 1, limit = 50) {
        try {
            const response = await BaseApiService.get(`${API_URL}/api/device-logs/device/${deviceId}`, { 
                page, 
                limit 
            });
            return response.data;
        } catch (error) {
            console.error(`Error fetching logs for device ${deviceId}:`, error);
            throw error;
        }
    }

    // Obtener logs filtrados por sensor
    async getLogsBySensor(sensorId, page = 1, limit = 50) {
        try {
            const response = await BaseApiService.get(`${API_URL}/api/device-logs/sensor/${sensorId}`, { 
                page, 
                limit 
            });
            return response.data;
        } catch (error) {
            console.error(`Error fetching logs for sensor ${sensorId}:`, error);
            throw error;
        }
    }

    // Obtener logs en un rango de tiempo
    async getLogsByTimeRange(startDate, endDate, page = 1, limit = 50) {
        try {
            const response = await BaseApiService.get(`${API_URL}/api/device-logs/range`, { 
                start_date: startDate,
                end_date: endDate,
                page, 
                limit 
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching logs by time range:', error);
            throw error;
        }
    }

    // Obtener estadísticas de logs
    async getLogsStats() {
        try {
            const response = await BaseApiService.get(`${API_URL}/api/device-logs/stats`);
            return response.data;
        } catch (error) {
            console.error('Error fetching logs stats:', error);
            throw error;
        }
    }
}

export default new DeviceLogsApiService();