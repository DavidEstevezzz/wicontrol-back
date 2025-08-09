// src/services/EmpresaApiService.js
import BaseApiService from './BaseApiService';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.wicontrol.site';

class EmpresaApiService {
  async getEmpresas() {
    try {
      const response = await BaseApiService.get(`${API_URL}/api/empresas`);
      // Extraer el array de datos de la respuesta
      return response.data; // Esto es lo que cambia
    } catch (error) {
      console.error('Error obteniendo empresas:', error);
      return []; // Devolver array vacío en caso de error
    }
  }
}

export default new EmpresaApiService();