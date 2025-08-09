import BaseApiService from './BaseApiService';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.wicontrol.site';

class InstalacionApiService {
  /**
   * Obtiene la lista de instalaciones
   */
  async getInstalaciones() {
    const response = await BaseApiService.get(
      `${API_URL}/api/instalaciones`
    );
    return response.data;
  }

  /**
   * Obtiene una instalación por ID
   * @param {number|string} id 
   */
  async getInstalacion(id) {
    const response = await BaseApiService.get(
      `${API_URL}/api/instalaciones/${id}`
    );
    return response.data;
  }

  /**
   * Crea una nueva instalación
   * @param {object} instalacionData 
   * @param {number} instalacionData.id_usuario - ID del usuario
   * @param {string} instalacionData.numero_rega - Número REGA (máx 50 caracteres)
   * @param {string} instalacionData.fecha_hora_alta - Fecha y hora de alta
   * @param {number} instalacionData.alta - Estado de alta
   * @param {string} instalacionData.id_nave - ID de la nave (máx 20 caracteres)
   */
  async createInstalacion(instalacionData) {
    const response = await BaseApiService.post(
      `${API_URL}/api/instalaciones`,
      instalacionData
    );
    return response.data;
  }

  /**
   * Actualiza una instalación existente
   * @param {number|string} id 
   * @param {object} instalacionData 
   * @param {number} [instalacionData.id_usuario] - ID del usuario
   * @param {string} [instalacionData.numero_rega] - Número REGA (máx 50 caracteres)
   * @param {string} [instalacionData.fecha_hora_alta] - Fecha y hora de alta
   * @param {number} [instalacionData.alta] - Estado de alta
   * @param {string} [instalacionData.id_nave] - ID de la nave (máx 20 caracteres)
   */
  async updateInstalacion(id, instalacionData) {
    const response = await BaseApiService.put(
      `${API_URL}/api/instalaciones/${id}`,
      instalacionData
    );
    return response.data;
  }

  /**
   * Elimina una instalación
   * @param {number|string} id 
   */
  async deleteInstalacion(id) {
    const response = await BaseApiService.delete(
      `${API_URL}/api/instalaciones/${id}`
    );
    return response.data;
  }
}

export default new InstalacionApiService();