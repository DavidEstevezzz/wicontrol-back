// src/services/DispositivoApiService.js
import BaseApiService from './BaseApiService';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.wicontrol.site';

class DispositivoApiService {
    // ========== CRUD BÁSICO ==========

    /**
     * Obtiene todos los dispositivos
     */
    async getAll() {
        const response = await BaseApiService.get(`${API_URL}/api/dispositivos`);
        return response.data;
    }

    /**
     * Obtiene un dispositivo por ID
     * @param {number|string} id
     */
    async getById(id) {
        const response = await BaseApiService.get(`${API_URL}/api/dispositivos/${id}`);
        return response.data;
    }

    /**
     * Crea un nuevo dispositivo
     * @param {Object} data - Datos del dispositivo
     */
    async create(data) {
        const response = await BaseApiService.post(`${API_URL}/api/dispositivos`, data);
        return response.data;
    }

    /**
     * Actualiza un dispositivo
     * @param {number|string} id
     * @param {Object} data - Datos a actualizar
     */
    async update(id, data) {
        const response = await BaseApiService.put(`${API_URL}/api/dispositivos/${id}`, data);
        return response.data;
    }

    /**
     * Elimina un dispositivo
     * @param {number|string} id
     */
    async delete(id) {
        const response = await BaseApiService.delete(`${API_URL}/api/dispositivos/${id}`);
        return response.data;
    }

    // ========== MÉTODOS ESPECÍFICOS DEL CONTROLADOR ==========

    /**
     * Obtiene información de la granja y nave de un dispositivo
     * @param {number|string} id
     */
    async getGranjaYNave(id) {
        const response = await BaseApiService.get(
            `${API_URL}/api/dispositivos/${id}/ubicacion`
        );
        return response.data;
    }

    /**
     * Obtiene todas las camadas vinculadas a un dispositivo
     * @param {number|string} id
     */
    async getCamadas(id) {
        const response = await BaseApiService.get(
            `${API_URL}/api/dispositivos/${id}/camadas`
        );
        return response.data;
    }

    // ========== MÉTODOS DE CAMADA CONTROLLER RELACIONADOS CON DISPOSITIVOS ==========

    /**
     * Calcula el peso medio de un dispositivo en un rango de días
     * @param {number|string} dispId
     * @param {string} fechaInicio  // 'YYYY-MM-DD'
     * @param {string} fechaFin     // 'YYYY-MM-DD'
     * @param {number|null} coefHomogeneidad // decimal, e.g. 0.10 para 10%
     */
    async calcularPesoMedioPorRango(dispId, fechaInicio, fechaFin, coefHomogeneidad = null) {
        const query = {
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin
        };
        if (coefHomogeneidad !== null) {
            query.coefHomogeneidad = coefHomogeneidad;
        }

        const response = await BaseApiService.get(
            `${API_URL}/api/dispositivos/${dispId}/peso-medio`,
            query
        );
        return response.data;
    }

    /**
     * Obtiene dispositivos por granja
     * @param {string} codigoGranja
     */
    async getByGranja(codigoGranja) {
        const response = await BaseApiService.get(
            `${API_URL}/api/granjas/${codigoGranja}/dispositivos`
        );
        return response.data;
    }

    /**
     * Obtiene pesadas por rango para un dispositivo específico dentro de una camada
     * @param {number|string} camadaId
     * @param {number|string} dispId
     * @param {Object} params - Parámetros de consulta (fechas, etc.)
     */
    async getPesadasRango(camadaId, dispId, params = {}) {
        const response = await BaseApiService.get(
            `${API_URL}/api/camadas/${camadaId}/dispositivos/${dispId}/pesadas-rango`,
            params
        );
        return response.data;
    }

    /**
     * Obtiene datos de temperatura con gráfica y alertas
     * @param {number|string} dispId
     * @param {Object} params - Parámetros de consulta
     */
    async getTemperaturaGraficaAlertas(dispId, params = {}) {
        const response = await BaseApiService.get(
            `${API_URL}/api/dispositivos/${dispId}/temperatura-grafica-alertas`,
            params
        );
        return response.data;
    }

    /**
     * Obtiene datos de humedad con gráfica y alertas
     * @param {number|string} dispId
     * @param {Object} params - Parámetros de consulta
     */
    async getHumedadGraficaAlertas(dispId, params = {}) {
        const response = await BaseApiService.get(
            `${API_URL}/api/dispositivos/${dispId}/humedad-grafica-alertas`,
            params
        );
        return response.data;
    }

    /**
     * Obtiene datos ambientales diarios
     * @param {number|string} dispId
     * @param {Object} params - Parámetros de consulta
     */
    async getDatosAmbientalesDiarios(dispId, params = {}) {
        const response = await BaseApiService.get(
            `${API_URL}/api/dispositivos/${dispId}/datos-ambientales-diarios`,
            params
        );
        return response.data;
    }

    /**
     * Obtiene medidas individuales por tipo de sensor
     * @param {number|string} dispId
     * @param {string} tipoSensor
     * @param {Object} params - Parámetros de consulta
     */
    async getMedidasIndividuales(dispId, tipoSensor, params = {}) {
        const response = await BaseApiService.get(
            `${API_URL}/api/dispositivos/${dispId}/medidas/${tipoSensor}`,
            params
        );
        return response.data;
    }

    /**
     * Monitorea la actividad del dispositivo
     * @param {number|string} dispId
     * @param {Object} params - Parámetros de consulta
     */
    async monitorearActividad(dispId, params = {}) {
        const response = await BaseApiService.get(
            `${API_URL}/api/dispositivos/${dispId}/actividad`,
            params
        );
        return response.data;
    }

    /**
     * Monitorea los datos de luz del dispositivo
     * @param {number|string} dispId
     * @param {Object} params - Parámetros de consulta
     */
    async monitorearLuz(dispId, params = {}) {
        const response = await BaseApiService.get(
            `${API_URL}/api/dispositivos/${dispId}/luz`,
            params
        );
        return response.data;
    }

    /**
     * Obtiene índices ambientales por rango
     * @param {number|string} dispId
     * @param {Object} params - Parámetros de consulta (fechas, etc.)
     */
    async getIndicesAmbientalesRango(dispId, params = {}) {
        const response = await BaseApiService.get(
            `${API_URL}/api/dispositivos/${dispId}/indices-ambientales-rango`,
            params
        );
        return response.data;
    }

    /**
     * Obtiene datos de humedad de cama con gráfica y alertas
     * @param {number|string} dispId
     * @param {Object} params - Parámetros de consulta
     */
    async getHumedadCamaGraficaAlertas(dispId, params = {}) {
        const response = await BaseApiService.get(
            `${API_URL}/api/dispositivos/${dispId}/humedad-cama-grafica-alertas`,
            params
        );
        return response.data;
    }

    /**
     * Obtiene datos de temperatura de cama con gráfica y alertas
     * @param {number|string} dispId
     * @param {Object} params - Parámetros de consulta
     */
    async getTemperaturaCamaGraficaAlertas(dispId, params = {}) {
        const response = await BaseApiService.get(
            `${API_URL}/api/dispositivos/${dispId}/temperatura-cama-grafica-alertas`,
            params
        );
        return response.data;
    }

    // ========== MÉTODOS DE CONFIGURACIÓN Y CALIBRACIÓN ==========

    /**
     * Configura un dispositivo (configure.php endpoint)
     * @param {Object} params - Parámetros de configuración
     */
    async configure(params = {}) {
        const response = await BaseApiService.get(
            `${API_URL}/api/configure.php`,
            params
        );
        return response.data;
    }

    /**
     * Recibe datos del dispositivo (receive.php endpoint)
     * @param {Object} params - Parámetros de recepción
     */
    async receiveData(params = {}) {
        const response = await BaseApiService.get(
            `${API_URL}/api/receive.php`,
            params
        );
        return response.data;
    }

    /**
     * Inicia proceso de calibración
     * @param {Object} params - Parámetros de calibración
     */
    async calibrate(params = {}) {
        const response = await BaseApiService.get(
            `${API_URL}/api/calibrate`,
            params
        );
        return response.data;
    }

    /**
     * Obtiene el paso actual de calibración
     * @param {Object} data - Datos para obtener el paso
     */
    async getCalibrateStep(data) {
        const response = await BaseApiService.post(
            `${API_URL}/api/calibrate/get-step`,
            data
        );
        return response.data;
    }

    /**
     * Envía un paso de calibración
     * @param {Object} data - Datos del paso de calibración
     */
    async sendCalibrateStep(data) {
        const response = await BaseApiService.post(
            `${API_URL}/api/calibrate/send-step`,
            data
        );
        return response.data;
    }

    // ========== MÉTODOS DE UTILIDAD ==========

    /**
     * Valida los datos de un dispositivo antes de enviarlos
     * @param {Object} data - Datos a validar
     * @returns {Object} - Datos validados
     */
    validateDispositivoData(data) {
        const validatedData = {};

        // Campos requeridos
        if (data.id_instalacion) validatedData.id_instalacion = parseInt(data.id_instalacion);
        if (data.numero_serie) validatedData.numero_serie = String(data.numero_serie).substring(0, 50);
        if (data.fecha_hora_alta) validatedData.fecha_hora_alta = data.fecha_hora_alta;
        if (data.fw_version) validatedData.fw_version = String(data.fw_version).substring(0, 20);
        if (data.hw_version) validatedData.hw_version = String(data.hw_version).substring(0, 20);

        // Campos opcionales
        if (data.ip_address) validatedData.ip_address = String(data.ip_address).substring(0, 30);
        if (data.bateria) validatedData.bateria = String(data.bateria).substring(0, 11);
        if (data.fecha_hora_last_msg) validatedData.fecha_hora_last_msg = data.fecha_hora_last_msg;
        if (typeof data.alta === 'boolean') validatedData.alta = data.alta;
        if (typeof data.calibrado === 'boolean') validatedData.calibrado = data.calibrado;
        if (data.pesoCalibracion) validatedData.pesoCalibracion = parseFloat(data.pesoCalibracion);
        if (typeof data.runCalibracion === 'boolean') validatedData.runCalibracion = data.runCalibracion;
        if (data.sensoresConfig) validatedData.sensoresConfig = parseInt(data.sensoresConfig);
        if (data.Lat) validatedData.Lat = String(data.Lat).substring(0, 10);
        if (data.Lon) validatedData.Lon = String(data.Lon).substring(0, 10);
        if (data.count) validatedData.count = parseInt(data.count);

        // Sensores
        if (data.sensorMovimiento) validatedData.sensorMovimiento = parseInt(data.sensorMovimiento);
        if (data.sensorCarga) validatedData.sensorCarga = parseInt(data.sensorCarga);
        if (data.sensorLuminosidad) validatedData.sensorLuminosidad = parseInt(data.sensorLuminosidad);
        if (data.sensorHumSuelo) validatedData.sensorHumSuelo = parseInt(data.sensorHumSuelo);
        if (data.sensorTempAmbiente) validatedData.sensorTempAmbiente = parseInt(data.sensorTempAmbiente);
        if (data.sensorHumAmbiente) validatedData.sensorHumAmbiente = parseInt(data.sensorHumAmbiente);
        if (data.sensorPresion) validatedData.sensorPresion = parseInt(data.sensorPresion);
        if (data.sensorTempYacija) validatedData.sensorTempYacija = parseInt(data.sensorTempYacija);
        if (data.sensorCalidadAireCO2) validatedData.sensorCalidadAireCO2 = parseInt(data.sensorCalidadAireCO2);
        if (data.sensorCalidadAireTVOC) validatedData.sensorCalidadAireTVOC = parseInt(data.sensorCalidadAireTVOC);
        if (data.sensorSHT20_temp) validatedData.sensorSHT20_temp = parseInt(data.sensorSHT20_temp);
        if (data.sensorSHT20_humedad) validatedData.sensorSHT20_humedad = parseInt(data.sensorSHT20_humedad);

        // Otros campos
        if (data.tiempoEnvio) validatedData.tiempoEnvio = parseInt(data.tiempoEnvio);
        if (data.fecha_hora_baja) validatedData.fecha_hora_baja = data.fecha_hora_baja;
        if (data.errorCalib) validatedData.errorCalib = parseInt(data.errorCalib);
        if (typeof data.reset === 'boolean') validatedData.reset = data.reset;
        if (data.fecha_ultima_calibracion) validatedData.fecha_ultima_calibracion = data.fecha_ultima_calibracion;

        return validatedData;
    }

    /**
     * Formatea los parámetros de consulta para fechas
     * @param {string} fechaInicio - Fecha en formato YYYY-MM-DD
     * @param {string} fechaFin - Fecha en formato YYYY-MM-DD
     * @param {Object} additionalParams - Parámetros adicionales
     * @returns {Object} - Parámetros formateados
     */
    formatDateRangeParams(fechaInicio, fechaFin, additionalParams = {}) {
        return {
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            ...additionalParams
        };
    }

    /**
    * Programa un reset para el dispositivo
    * @param {number|string} id - ID del dispositivo
    */
    async resetDevice(id) {
        const response = await BaseApiService.patch(`${API_URL}/api/dispositivos/${id}/reset`);
        return response.data;
    }
}

export default new DispositivoApiService();