// src/services/UsuarioApiService.js
import BaseApiService from './BaseApiService';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.wicontrol.site';

class UsuarioApiService {
    // Obtener todos los usuarios (paginados según el backend)
    async getUsuarios(page = 1) {
        try {
            const response = await BaseApiService.get(`${API_URL}/api/usuarios`, { page });
            return response.data;
        } catch (error) {
            console.error('Error fetching usuarios:', error);
            throw error;
        }
    }

    // Obtener un usuario específico por ID
    async getUsuario(id) {
        try {
            const response = await BaseApiService.get(`${API_URL}/api/usuarios/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching usuario ${id}:`, error);
            throw error;
        }
    }

    // Crear un nuevo usuario
    async createUsuario(userData) {
        try {
            const response = await BaseApiService.post(`${API_URL}/api/usuarios`, userData);
            return response.data;
        } catch (error) {
            console.error('Error creating usuario:', error);
            throw error;
        }
    }

    // Actualizar un usuario existente
    async updateUsuario(id, userData) {
        try {
            const response = await BaseApiService.put(`${API_URL}/api/usuarios/${id}`, userData);
            return response.data;
        } catch (error) {
            console.error(`Error updating usuario ${id}:`, error);
            throw error;
        }
    }

    // Eliminar un usuario
    async deleteUsuario(id) {
        try {
            const response = await BaseApiService.delete(`${API_URL}/api/usuarios/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error deleting usuario ${id}:`, error);
            throw error;
        }
    }

    async activateUsuario(id) {
        const response = await BaseApiService.patch(`${API_URL}/api/usuarios/${id}/activate`);
        return response.data;
    }

    /**
 * Obtiene las empresas asignadas a un usuario
 * @param {number} usuarioId - ID del usuario
 * @returns {Promise} - Promesa con las empresas del usuario
 */
    async getUsuarioEmpresas(id) {
        const response = await BaseApiService.get(`${API_URL}/api/usuarios/${id}/empresas`);
        return response.data;
    }
}

export default new UsuarioApiService();