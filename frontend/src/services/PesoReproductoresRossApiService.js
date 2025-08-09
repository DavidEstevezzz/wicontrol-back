import BaseApiService from './BaseApiService';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.wicontrol.site';

class PesoReproductoresRossApiService {
    /**
     * Obtiene todos los pesos de referencia para Reproductores Ross
     */
    async getPesosReferencia() {
        const response = await BaseApiService.get(
            `${API_URL}/api/peso-reproductores-ross`
        );
        return response.data;
    }

    /**
     * Obtiene peso de referencia por edad específica
     * @param {number} edad
     */
    async getPesoByEdad(edad) {
        const response = await BaseApiService.get(
            `${API_URL}/api/peso-reproductores-ross/edad/${edad}`
        );
        return response.data;
    }

    /**
     * Obtiene pesos de referencia para un rango de edades
     * @param {number} edadInicio
     * @param {number} edadFin
     */
    async getPesosByRangoEdad(edadInicio, edadFin) {
        const response = await BaseApiService.post(
            `${API_URL}/api/peso-reproductores-ross/rango`,
            { 
                edad_inicio: edadInicio,
                edad_fin: edadFin
            }
        );
        return response.data;
    }

    /**
     * Crea un nuevo registro de peso de referencia
     * @param {object} pesoData
     */
    async createPeso(pesoData) {
        const response = await BaseApiService.post(
            `${API_URL}/api/peso-reproductores-ross`,
            pesoData
        );
        return response.data;
    }

    /**
     * Actualiza un registro de peso de referencia existente
     * @param {number|string} id
     * @param {object} pesoData
     */
    async updatePeso(id, pesoData) {
        const response = await BaseApiService.put(
            `${API_URL}/api/peso-reproductores-ross/${id}`,
            pesoData
        );
        return response.data;
    }

    /**
     * Elimina un registro de peso de referencia
     * @param {number|string} id
     */
    async deletePeso(id) {
        const response = await BaseApiService.delete(
            `${API_URL}/api/peso-reproductores-ross/${id}`
        );
        return response.data;
    }
}

export default new PesoReproductoresRossApiService();