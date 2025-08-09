// src/services/PesoCobbApiService.js
import BaseApiService from './BaseApiService';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.wicontrol.site';

class PesoCobbApiService {
  /**
   * Obtiene todos los datos de referencia de peso para la estirpe Cobb
   */
  /**
   * Obtiene todos los datos de referencia de peso para la estirpe cobb
   */
  async getPesosReferencia() {
    try {
      const response = await BaseApiService.get(
        `${API_URL}/api/peso-cobb`
      );
      return response.data;
    } catch (error) {
      console.error('Error obteniendo pesos de referencia cobb:', error);
      throw error;
    }
  }

  /**
   * Obtiene el peso de referencia para una edad específica
   * @param {number} edad - Edad en días
   */
  async getPesoReferenciaByEdad(edad) {
    try {
      // Actualizamos para usar el nuevo endpoint
      const response = await BaseApiService.get(
        `${API_URL}/api/peso-cobb/edad/${edad}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error obteniendo peso cobb para edad ${edad}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene pesos de referencia para un rango de edades
   * @param {number} edadInicial - Edad inicial en días
   * @param {number} edadFinal - Edad final en días
   */
  async getPesosReferenciaByRango(edadInicial, edadFinal) {
    try {
      // Usando el endpoint de índice con parámetros en la URL
      const response = await BaseApiService.get(
        `${API_URL}/api/peso-cobb`, 
        { 
          params: { 
            edad_inicio: edadInicial,
            edad_fin: edadFinal
          } 
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Error obteniendo pesos cobb para rango ${edadInicial}-${edadFinal}:`, error);
      throw error;
    }
  }
}

export default new PesoCobbApiService();