import BaseApiService from './BaseApiService';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.wicontrol.site';

class GranjaApiService {
  /**
   * Obtiene la lista de granjas (paginada)
   * @param {number} page 
   */
  async getGranjas(page = 1) {
    const response = await BaseApiService.get(
      `${API_URL}/api/granjas`,
      { page }
    );
    return response.data;
  }

  /**
   * Obtiene una granja por ID
   * @param {number|string} id 
   */
  async getGranja(id) {
    const response = await BaseApiService.get(
      `${API_URL}/api/granjas/${id}`
    );
    return response.data;
  }

  /**
   * Crea una nueva granja
   * @param {object} granjaData 
   */
  async createGranja(granjaData) {
    const response = await BaseApiService.post(
      `${API_URL}/api/granjas`,
      granjaData
    );
    return response.data;
  }

  /**
   * Actualiza una granja existente
   * @param {number|string} id 
   * @param {object} granjaData 
   */
  async updateGranja(id, granjaData) {
    const response = await BaseApiService.put(
      `${API_URL}/api/granjas/${id}`,
      granjaData
    );
    return response.data;
  }

  /**
   * Elimina (o desactiva) una granja
   * @param {number|string} id 
   */
  async deleteGranja(id) {
    const response = await BaseApiService.delete(
      `${API_URL}/api/granjas/${id}`
    );
    return response.data;
  }

  /**
   * Obtiene la temperatura media de una granja en un rango de fechas
   * @param {string} numeroRega - Identificador de la granja
   * @param {Object} options - Opciones de consulta
   * @param {string} options.fecha_inicio - Fecha inicial (YYYY-MM-DD)
   * @param {string} options.fecha_fin - Fecha final (YYYY-MM-DD)
   * @param {string} options.formato - Formato de la respuesta ('diario' o 'total')
   * @returns {Promise<Object>} - Datos de temperatura media
   */
  async getTemperaturaMedia(numeroRega, options = {}) {
  try {
    // Pasamos options directamente como queryParams, no dentro de un objeto { params: ... }
    const response = await BaseApiService.get(
      `${API_URL}/api/granjas/${numeroRega}/temperatura-media`,
      options 
    );
    return response.data;
  } catch (error) {
    console.error('Error obteniendo temperatura media:', error);
    throw error;
  }
}

async getGranjasByEmpresa(empresaId) {
    const response = await BaseApiService.get(
      `${API_URL}/api/empresas/${empresaId}/granjas`
    );
    return response.data;
  }

  /**
     * Obtiene los dispositivos activos de una granja
     * @param {string} numeroRega
     */
    async getDispositivosActivos(numeroRega) {
        const response = await BaseApiService.get(
            `${API_URL}/api/granjas/${numeroRega}/dispositivos-activos`
        );
        return response.data;
    }
}


export default new GranjaApiService();