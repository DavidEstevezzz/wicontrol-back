// src/services/AuthApiService.js
import BaseApiService from './BaseApiService';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.wicontrol.site';

class AuthApiService {
    async login(credentials) {
        try {
            const response = await BaseApiService.post(`${API_URL}/api/login`, credentials);

            if (response.data && response.data.access_token) {
                localStorage.setItem('token', response.data.access_token);
            }

            return response.data;
        } catch (error) {
            console.error('Error during login:', error);
            throw error;
        }
    }

    async logout() {
        try {
            const response = await BaseApiService.post(`${API_URL}/api/logout`);
            localStorage.removeItem('token');
            return response.data;
        } catch (error) {
            console.error('Error during logout:', error);
            localStorage.removeItem('token'); // Eliminar token incluso si hay un error
            throw error;
        }
    }

    async getCurrentUser() {
        return BaseApiService.get(`${API_URL}/api/user`);
    }

    isAuthenticated() {
        return !!localStorage.getItem('token');
    }

    getToken() {
        return localStorage.getItem('token');
    }
}

export default new AuthApiService();