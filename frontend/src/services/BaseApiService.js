import axios from 'axios';

class BaseApiService {
    constructor() {
        this.axiosInstance = axios.create();
        
        // Interceptor para manejar errores
        this.axiosInstance.interceptors.response.use(
            response => response,
            error => {
                if (error.response && error.response.status === 401) {
                    // Manejar error de autenticación
                    localStorage.removeItem('token');
                    // Opcionalmente redirigir al login
                    // window.location.href = '/login';
                }
                return Promise.reject(error);
            }
        );
    }

    /**
     * Método mejorado GET con mayor flexibilidad para parámetros
     * @param {string} url - URL a consultar
     * @param {Object|null} queryParams - Parámetros de consulta o config completa
     * @param {Object|null} headers - Cabeceras HTTP (opcional)
     * @param {string|null} responseType - Tipo de respuesta (opcional)
     * @returns {Promise} - Promesa con la respuesta
     */
    get(url, queryParams, headers, responseType) {
        // Si queryParams es undefined o null, usa un objeto vacío
        if (queryParams === undefined || queryParams === null) {
            queryParams = {};
        }
        
        // Usar el método de configuración
        return this.axiosInstance.get(
            url, 
            this.getRequestConfig(queryParams, headers, responseType)
        );
    }

    /**
     * Método POST con flexibilidad similar a GET
     */
    post(url, data, queryParams, headers, responseType) {
        return this.axiosInstance.post(
            url, 
            data, 
            this.getRequestConfig(queryParams, headers, responseType)
        );
    }                                           

    /**
     * Método PUT con flexibilidad similar a GET
     */
    put(url, data, queryParams, headers, responseType) {
        return this.axiosInstance.put(
            url, 
            data, 
            this.getRequestConfig(queryParams, headers, responseType)
        );
    }

    /**
     * Método DELETE con flexibilidad similar a GET
     */
    delete(url, queryParams, headers, responseType) {
        return this.axiosInstance.delete(
            url, 
            this.getRequestConfig(queryParams, headers, responseType)
        );
    }

    /**
     * Método PATCH con flexibilidad similar a GET
     */
    patch(url, data, queryParams, headers, responseType) {
        return this.axiosInstance.patch(
            url, 
            data, 
            this.getRequestConfig(queryParams, headers, responseType)
        );
    }

    /**
     * Construye la configuración de request para axios
     * @param {Object} queryParams - Parámetros de consulta
     * @param {Object} headers - Cabeceras HTTP
     * @param {string} responseType - Tipo de respuesta
     * @returns {Object} - Configuración para axios
     */
    getRequestConfig(
        queryParams = {},
        headers = {
            Accept: 'application/json, text/plain',
            'Content-Type': 'application/json, charset=utf-8',
        },
        responseType = 'json'
    ) {
        const token = localStorage.getItem('token');
    
        // Eliminar Content-Type para FormData
        if (headers['Content-Type'] === 'multipart/form-data') {
            delete headers['Content-Type'];
        }
    
        const paramsHeader = {
            params: queryParams,
            headers: headers,
            responseType: responseType,
        };
    
        if (token) {
            paramsHeader.headers.Authorization = `Bearer ${token}`;
        }
    
        return paramsHeader;
    }
    
    /**
     * Método GET con debounce para reducir múltiples llamadas
     */
    getWithDebounce(url, queryParams, headers, responseType, delay = 200) {
        return new Promise((resolve, reject) => {
            if (this.debounceTimeout) {
                clearTimeout(this.debounceTimeout);
            }

            this.debounceTimeout = setTimeout(() => {
                this.get(url, queryParams, headers, responseType)
                    .then(response => resolve(response))
                    .catch(error => reject(error));
            }, delay);
        });
    }

    /**
     * Helper para procesar respuestas y extraer solo los datos
     * @param {Promise} axiosPromise - Promesa de axios
     * @returns {Promise} - Promesa con solo los datos de la respuesta
     */
    processResponse(axiosPromise) {
        return axiosPromise
            .then(response => response.data)
            .catch(error => {
                console.error('Error en petición API:', error);
                throw error;
            });
    }

    /**
     * Método GET que devuelve directamente los datos (data)
     */
    getData(url, queryParams, headers, responseType) {
        return this.processResponse(
            this.get(url, queryParams, headers, responseType)
        );
    }

    /**
     * Método POST que devuelve directamente los datos (data)
     */
    postData(url, data, queryParams, headers, responseType) {
        return this.processResponse(
            this.post(url, data, queryParams, headers, responseType)
        );
    }

    /**
     * Método PUT que devuelve directamente los datos (data)
     */
    putData(url, data, queryParams, headers, responseType) {
        return this.processResponse(
            this.put(url, data, queryParams, headers, responseType)
        );
    }

    /**
     * Método DELETE que devuelve directamente los datos (data)
     */
    deleteData(url, queryParams, headers, responseType) {
        return this.processResponse(
            this.delete(url, queryParams, headers, responseType)
        );
    }

    /**
     * Método PATCH que devuelve directamente los datos (data)
     */
    patchData(url, data, queryParams, headers, responseType) {
        return this.processResponse(
            this.patch(url, data, queryParams, headers, responseType)
        );
    }
}

export default new BaseApiService();