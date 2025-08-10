// src/services/CamadaApiService.js

import BaseApiService from './BaseApiService';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.wicontrol.site';

class CamadaApiService {
    /**
     * Obtiene la lista de camadas (paginada)
     * @param {number} page
     */
    async getCamadas(page = 1) {
        const response = await BaseApiService.get(
            `${API_URL}/api/camadas`,
            { page }
        );
        return response.data;
    }

    /**
     * Obtiene una camada por ID
     * @param {number|string} id
     */
    async getCamada(id) {
        const response = await BaseApiService.get(
            `${API_URL}/api/camadas/${id}`
        );
        return response.data;
    }

    /**
     * Obtiene información detallada de una camada, incluyendo sexaje y fecha de inicio
     * @param {number|string} camadaId
     */
    async getCamadaInfo(camadaId) {
        const response = await BaseApiService.get(
            `${API_URL}/api/camadas/${camadaId}`
        );
        return response.data;
    }

    /**
     * Crea una nueva camada
     * @param {object} camadaData
     */
    async createCamada(camadaData) {
        const response = await BaseApiService.post(
            `${API_URL}/api/camadas`,
            camadaData
        );
        return response.data;
    }

    /**
     * Actualiza una camada existente
     * @param {number|string} id
     * @param {object} camadaData
     */
    async updateCamada(id, camadaData) {
        const response = await BaseApiService.put(
            `${API_URL}/api/camadas/${id}`,
            camadaData
        );
        return response.data;
    }

    /**
     * Elimina (o cierra) una camada
     * @param {number|string} id
     */
    async deleteCamada(id) {
        const response = await BaseApiService.delete(
            `${API_URL}/api/camadas/${id}`
        );
        return response.data;
    }

    /**
     * Vincula un dispositivo a una camada
     * @param {number|string} camadaId
     * @param {number|string} dispId
     */
    async attachDispositivo(camadaId, dispId) {
        const response = await BaseApiService.post(
            `${API_URL}/api/camadas/${camadaId}/dispositivos/${dispId}`
        );
        return response.data;
    }

    /**
     * Desvincula un dispositivo de una camada
     * @param {number|string} camadaId
     * @param {number|string} dispId
     */
    async detachDispositivo(camadaId, dispId) {
        const response = await BaseApiService.delete(
            `${API_URL}/api/camadas/${camadaId}/dispositivos/${dispId}`
        );
        return response.data;
    }


    /**
     * Cierra una camada: actualiza su fecha de finalización y
     * desvincula todos los dispositivos activos.
     * @param {number|string} id
     */
    async closeCamada(id) {
        // Establecer fecha de finalización de la camada
        await this.updateCamada(id, { fecha_hora_final: new Date().toISOString() });
        // Obtener dispositivos vinculados actualmente
        const dispositivos = await this.getDispositivosByCamada(id);
        await Promise.all(
            dispositivos
                .filter(d => !d.fecha_desvinculacion)
                .map(d => this.detachDispositivo(id, d.id_dispositivo))
        );
    }


    /**
  * Obtiene el resumen de pesadas y el listado con estado
  * @param {number|string} camadaId
  * @param {string} fecha               // 'YYYY-MM-DD'
  * @param {number|null} coefHomogeneidad // ej. 0.10 para 10%, opcional
  * @param {number|null} porcentajeDescarte // ej. 20 para 20%, opcional (default: 20)
  */
    async getPesadas(camadaId, fecha, coefHomogeneidad = null, porcentajeDescarte = null) {
        console.log('Llamando a getPesadas con:', { camadaId, fecha, coefHomogeneidad, porcentajeDescarte });

        const query = { fecha };
        if (coefHomogeneidad !== null) {
            query.coefHomogeneidad = coefHomogeneidad;
        }
        if (porcentajeDescarte !== null) {
            query.porcentajeDescarte = porcentajeDescarte;
        }
        const response = await BaseApiService.get(
            `${API_URL}/api/camadas/${camadaId}/pesadas`,
            query
        );
        return response.data;
    }

    /**
    * Obtiene las pesadas diarias para un dispositivo en una camada,
    * con rango de fechas y coeficiente de homogeneidad opcional.
    *
    * @param {number|string} camadaId
    * @param {number|string} dispId
    * @param {string} fechaInicio  // 'YYYY-MM-DD'
    * @param {string} fechaFin     // 'YYYY-MM-DD'
    * @param {number|null} coefHomogeneidad // decimal, e.g. 0.10 para 10%
    * @param {number|null} porcentajeDescarte // ej. 20 para 20%, opcional (default: 20)
    */
    async getPesadasRango(camadaId, dispId, fechaInicio, fechaFin, coefHomogeneidad = null, porcentajeDescarte = null) {
        console.log('Llamando a getPesadasRango con:', {
            camadaId,
            dispId,
            fechaInicio,
            fechaFin,
            coefHomogeneidad,
            porcentajeDescarte
        });

        const query = {
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin
        };
        if (coefHomogeneidad !== null) {
            query.coefHomogeneidad = coefHomogeneidad;
        }
        if (porcentajeDescarte !== null) {
            query.porcentajeDescarte = porcentajeDescarte;
        }

        const response = await BaseApiService.get(
            `${API_URL}/api/camadas/${camadaId}/dispositivos/${dispId}/pesadas-rango`,
            query
        );
        return response.data;
    }

    async getCamadasByGranja(numeroRega) {
        const response = await BaseApiService.get(
            `${API_URL}/api/granjas/${numeroRega}/camadas`
        );
        return response.data;
    }



    /**
   * Obtiene los dispositivos vinculados a una camada
   * @param {number|string} camadaId
   */
    async getDispositivosByCamada(camadaId) {
        const response = await BaseApiService.get(
            `${API_URL}/api/camadas/${camadaId}/dispositivos`
        );
        return response.data;
    }

    /**
     * Obtiene las camadas asociadas a un dispositivo
     * @param {number|string} dispId
     */
    async getCamadasByDispositivo(dispId) {
        const response = await BaseApiService.get(
            `${API_URL}/api/dispositivos/${dispId}/camadas`
        );
        return response.data;
    }

    /**
 * Obtiene el pronóstico de peso para un dispositivo
 * @param {number|string} dispId - ID del dispositivo
 * @param {string} fechaInicio - Fecha inicial (YYYY-MM-DD)
 * @param {string} fechaFin - Fecha final (YYYY-MM-DD)
 * @param {number} diasPronostico - Días a pronosticar (opcional, default: 7)
 * @returns {Promise<object>} Pronóstico de peso
 */
    async getPronosticoPeso(dispId, fechaInicio, fechaFin, diasPronostico = 7) {
        console.log('Llamando a getPronosticoPeso con:', {
            dispId, fechaInicio, fechaFin, diasPronostico
        });

        const query = {
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            dias_pronostico: diasPronostico
        };

        const response = await BaseApiService.get(
            `${API_URL}/api/dispositivos/${dispId}/pronostico-peso`,
            query
        );
        return response.data;
    }

    /**
     * Obtiene datos de temperatura con gráfica y alertas para un dispositivo
     * @param {number|string} dispId - ID del dispositivo
     * @param {string} fechaInicio - Fecha inicial (YYYY-MM-DD)
     * @param {string} fechaFin - Fecha final (YYYY-MM-DD)
     * @param {boolean} usarMargenesPersonalizados - Si se deben usar los márgenes por edad
     * @returns {Promise<object>} Datos de temperatura, gráfica y alertas
     */
    async getTemperaturaGraficaAlertas(dispId, fechaInicio, fechaFin, usarMargenesPersonalizados = true) {
        console.log('Llamando a getTemperaturaGraficaAlertas con:', {
            dispId, fechaInicio, fechaFin, usarMargenesPersonalizados
        });

        const query = {
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            usar_margenes_personalizados: usarMargenesPersonalizados
        };

        const response = await BaseApiService.get(
            `${API_URL}/api/dispositivos/${dispId}/temperatura-grafica-alertas`,
            query
        );
        return response.data;
    }

    /**
     * Obtiene datos de humedad con gráfica y alertas para un dispositivo
     * @param {number|string} dispId - ID del dispositivo
     * @param {string} fechaInicio - Fecha inicial (YYYY-MM-DD)
     * @param {string} fechaFin - Fecha final (YYYY-MM-DD)
     * @returns {Promise<object>} Datos de humedad, gráfica y alertas
     */
    async getHumedadGraficaAlertas(dispId, fechaInicio, fechaFin) {
        console.log('Llamando a getHumedadGraficaAlertas con:', {
            dispId, fechaInicio, fechaFin
        });

        const query = {
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin
        };

        const response = await BaseApiService.get(
            `${API_URL}/api/dispositivos/${dispId}/humedad-grafica-alertas`,
            query
        );
        return response.data;
    }

    /**
     * Obtiene datos ambientales diarios para un dispositivo en una fecha específica
     * @param {number|string} dispId - ID del dispositivo
     * @param {string} fecha - Fecha a consultar (YYYY-MM-DD)
     * @returns {Promise<object>} Datos de ambiente diarios
     */
    async getDatosAmbientalesDiarios(dispId, fecha) {
        console.log('Llamando a getDatosAmbientalesDiarios con:', {
            dispId, fecha
        });

        const query = {
            fecha: fecha
        };

        const response = await BaseApiService.get(
            `${API_URL}/api/dispositivos/${dispId}/datos-ambientales-diarios`,
            query
        );
        return response.data;
    }

    /**
     * Obtiene todas las lecturas individuales de temperatura o humedad en un rango de fechas
     * @param {number|string} dispId - ID del dispositivo
     * @param {string} tipoSensor - Tipo de sensor ('temperatura' o 'humedad')
     * @param {string} fechaInicio - Fecha inicial (YYYY-MM-DD)
     * @param {string} fechaFin - Fecha final (YYYY-MM-DD)
     * @returns {Promise<object>} Datos de medidas individuales
     */
    async getMedidasIndividuales(dispId, tipoSensor, fechaInicio, fechaFin) {
        console.log('Llamando a getMedidasIndividuales con:', {
            dispId, tipoSensor, fechaInicio, fechaFin
        });

        const query = {
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin
        };

        const response = await BaseApiService.get(
            `${API_URL}/api/dispositivos/${dispId}/medidas/${tipoSensor}`,
            query
        );
        return response.data;
    }

    /**
 * Obtiene datos de monitoreo de actividad de aves para un dispositivo
 * @param {number|string} dispId - ID del dispositivo
 * @param {string} fechaInicio - Fecha inicial (YYYY-MM-DD), opcional
 * @param {string} fechaFin - Fecha final (YYYY-MM-DD), opcional
 * @returns {Promise<object>} Datos de actividad, periodos y estadísticas
 */
    async getMonitoreoActividad(dispId, fechaInicio = null, fechaFin = null) {
        console.log('Llamando a getMonitoreoActividad con:', {
            dispId, fechaInicio, fechaFin
        });

        const query = {};

        // Solo agregamos los parámetros si tienen valor
        if (fechaInicio) {
            query.fecha_inicio = fechaInicio;
        }

        if (fechaFin) {
            query.fecha_fin = fechaFin;
        }

        const response = await BaseApiService.get(
            `${API_URL}/api/dispositivos/${dispId}/actividad`,
            query
        );
        return response.data;
    }

    /**
     * Obtiene datos de monitoreo de luz para un dispositivo
     * @param {number|string} dispId - ID del dispositivo
     * @param {string} fechaInicio - Fecha inicial (YYYY-MM-DD), opcional
     * @param {string} fechaFin - Fecha final (YYYY-MM-DD), opcional
     * @returns {Promise<object>} Datos de luz, periodos y estadísticas
     */
    async getMonitoreoLuz(dispId, fechaInicio = null, fechaFin = null) {
        console.log('Llamando a getMonitoreoLuz con:', {
            dispId, fechaInicio, fechaFin
        });

        const query = {};

        // Solo agregamos los parámetros si tienen valor
        if (fechaInicio) {
            query.fecha_inicio = fechaInicio;
        }

        if (fechaFin) {
            query.fecha_fin = fechaFin;
        }

        const response = await BaseApiService.get(
            `${API_URL}/api/dispositivos/${dispId}/luz`,
            query
        );
        return response.data;
    }

    /**
     * Obtiene datos de IEC y THI para un dispositivo en un rango de fechas
     * @param {number|string} dispId - ID del dispositivo
     * @param {string} fechaInicio - Fecha inicial (YYYY-MM-DD)
     * @param {string} fechaFin - Fecha final (YYYY-MM-DD)
     * @returns {Promise<object>} Datos de IEC y THI con estadísticas y alertas
     */
    async getIndicesAmbientalesRango(dispId, fechaInicio, fechaFin) {
        console.log('Llamando a getIndicesAmbientalesRango con:', {
            dispId, fechaInicio, fechaFin
        });

        const query = {
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin
        };

        const response = await BaseApiService.get(
            `${API_URL}/api/dispositivos/${dispId}/indices-ambientales-rango`,
            query
        );
        return response.data;
    }

    /**
 * Obtiene dispositivos disponibles para vincular a una camada de una granja específica
 * @param {string} codigoGranja - Código de la granja
 * @returns {Promise<Array>} Array de dispositivos disponibles
 */
    async getDispositivosDisponiblesByGranja(codigoGranja) {
        try {
            const response = await BaseApiService.get(
                `${API_URL}/api/granjas/${codigoGranja}/dispositivos-disponibles`
            );
            return response.data.dispositivos || [];
        } catch (error) {
            console.error('Error obteniendo dispositivos disponibles:', error);
            throw error;
        }
    }

    /**
     * Obtiene dispositivos vinculados activamente a una camada específica
     * @param {number} camadaId - ID de la camada
     * @returns {Promise<Array>} Array de dispositivos vinculados
     */
    async getDispositivosVinculadosByCamada(camadaId) {
        try {
            const response = await BaseApiService.get(
                `${API_URL}/api/camadas/${camadaId}/dispositivos-vinculados`
            );
            return response.data.dispositivos || [];
        } catch (error) {
            console.error('Error obteniendo dispositivos vinculados:', error);
            throw error;
        }
    }

    /**
     * Vincula un dispositivo a una camada
     * @param {number} camadaId - ID de la camada
     * @param {number} dispositivoId - ID del dispositivo
     * @returns {Promise<Object>} Respuesta de la vinculación
     */
    async attachDispositivo(camadaId, dispositivoId) {
        try {
            const response = await BaseApiService.post(
                `${API_URL}/api/camadas/${camadaId}/dispositivos/${dispositivoId}/attach`
            );
            return response.data;
        } catch (error) {
            console.error('Error vinculando dispositivo:', error);
            throw error;
        }
    }

    /**
     * Desvincula un dispositivo de una camada
     * @param {number} camadaId - ID de la camada
     * @param {number} dispositivoId - ID del dispositivo
     * @returns {Promise<Object>} Respuesta de la desvinculación
     */
    async detachDispositivo(camadaId, dispositivoId) {
        try {
            const response = await BaseApiService.post(
                `${API_URL}/api/camadas/${camadaId}/dispositivos/${dispositivoId}/detach`
            );
            return response.data;
        } catch (error) {
            console.error('Error desvinculando dispositivo:', error);
            throw error;
        }
    }

}

export default new CamadaApiService();