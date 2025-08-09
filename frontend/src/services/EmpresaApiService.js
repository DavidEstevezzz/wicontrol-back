// src/services/EmpresaApiService.js
import BaseApiService from './BaseApiService';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.wicontrol.site';

class EmpresaApiService {
  async getEmpresas() {
    try {
      const response = await BaseApiService.get(`${API_URL}/api/empresas`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo empresas:', error);
      return [];
    }
  }

  async getEmpresa(id) {
    try {
      const response = await BaseApiService.get(`${API_URL}/api/empresas/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error obteniendo empresa ${id}:`, error);
      throw error;
    }
  }

  async createEmpresa(data) {
    try {
      const response = await BaseApiService.post(`${API_URL}/api/empresas`, data);
      return response.data;
    } catch (error) {
      console.error('Error creando empresa:', error);
      throw error;
    }
  }

  async updateEmpresa(id, data) {
    try {
      const response = await BaseApiService.put(`${API_URL}/api/empresas/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Error actualizando empresa ${id}:`, error);
      throw error;
    }
  }

  async deleteEmpresa(id) {
    try {
      const response = await BaseApiService.delete(`${API_URL}/api/empresas/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error eliminando empresa ${id}:`, error);
      throw error;
    }
  }
}

export default new EmpresaApiService();