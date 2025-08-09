import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTimes,
    faMicrochip,
    faCalendarAlt,
    faSave,
    faBuilding,
    faUser,
    faWarehouse,
    faEdit,
    faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import DispositivoApiService from '../services/DispositivoApiService';
import InstalacionApiService from '../services/InstalacionApiService';
import GranjaApiService from '../services/GranjaApiService';
import UsuarioApiService from '../services/UsuarioApiService';
import { useDarkMode } from '../contexts/DarkModeContext';

export default function EditDeviceModal({ isOpen, onClose, onDeviceUpdated, device }) {
    const { darkMode } = useDarkMode();

    // Estados
    const [instaladores, setInstaladores] = useState([]);
    const [granjas, setGranjas] = useState([]);
    const [naves, setNaves] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [error, setError] = useState('');
    const [formErrors, setFormErrors] = useState({});
    const [instalacionData, setInstalacionData] = useState(null);
    const [currentInstalador, setCurrentInstalador] = useState(null);

    // Estado del formulario
    const [formData, setFormData] = useState({
        numero_serie: '',
        id_usuario: '',
        fecha_hora_alta: '',
        numero_rega: '',
        id_nave: ''
    });

    // Cargar datos de la instalación cuando se abre el modal
    useEffect(() => {
        const loadInstalacionData = async () => {
            if (!device || !device.id_instalacion || !isOpen) return;

            setLoadingData(true);
            setError('');
            setFormErrors({});

            try {
                // Cargar datos de la instalación
                const instalacionResponse = await InstalacionApiService.getInstalacion(device.id_instalacion);
                
                // El backend puede retornar { message: "...", instalacion: {...} } o directamente {...}
                const instalacion = instalacionResponse.instalacion || instalacionResponse.data || instalacionResponse;
                
                // Verificar si hay mensaje de advertencia del backend
                if (instalacionResponse.message) {
                    console.warn('Mensaje del servidor:', instalacionResponse.message);
                    setError(`Advertencia: ${instalacionResponse.message}`);
                }
                
                // Verificar si la instalación está activa (doble check)
                if (!instalacion.alta) {
                    console.warn('La instalación no está activa:', instalacion);
                    if (!instalacionResponse.message) {
                        setError('Advertencia: Esta instalación no está marcada como activa.');
                    }
                }
                
                setInstalacionData(instalacion);

                // Buscar datos del instalador actual
                let instaladorActual = null;
                if (instalacion.id_usuario) {
                    // Si el backend ya incluye datos del usuario (Opción 1 implementada)
                    if (instalacion.usuario) {
                        instaladorActual = instalacion.usuario;
                    } else {
                        // Cargar datos del usuario separadamente
                        try {
                            const usuarioResponse = await UsuarioApiService.getUsuario(instalacion.id_usuario);
                            instaladorActual = usuarioResponse.data || usuarioResponse;
                        } catch (userErr) {
                            console.warn('No se pudieron cargar los datos del usuario:', userErr);
                        }
                    }
                }
                setCurrentInstalador(instaladorActual);

                // Configurar formData con los datos cargados
                const newFormData = {
                    numero_serie: device.numero_serie || '',
                    id_usuario: instalacion.id_usuario ? instalacion.id_usuario.toString() : '',
                    fecha_hora_alta: device.fecha_hora_alta ?
                        (device.fecha_hora_alta.includes('T') ?
                            device.fecha_hora_alta.slice(0, 16) :
                            device.fecha_hora_alta.slice(0, 10) + 'T00:00'
                        ) : new Date().toISOString().slice(0, 16),
                    numero_rega: instalacion.numero_rega || '',
                    id_nave: instalacion.id_nave || ''
                };

                setFormData(newFormData);

                console.log('Datos de instalación cargados:', instalacion);
                console.log('Instalador actual:', instaladorActual);
                console.log('FormData configurado:', newFormData);

            } catch (err) {
                console.error('Error loading instalacion data:', err);
                setError('No se pudieron cargar los datos de la instalación.');
                
                // En caso de error, intentar cargar con los datos disponibles del device
                setFormData({
                    numero_serie: device.numero_serie || '',
                    id_usuario: device.usuario_id || device.id_usuario || '',
                    fecha_hora_alta: device.fecha_hora_alta ?
                        (device.fecha_hora_alta.includes('T') ?
                            device.fecha_hora_alta.slice(0, 16) :
                            device.fecha_hora_alta.slice(0, 10) + 'T00:00'
                        ) : new Date().toISOString().slice(0, 16),
                    numero_rega: device.numero_rega || '',
                    id_nave: device.id_nave || ''
                });
            } finally {
                setLoadingData(false);
            }
        };

        loadInstalacionData();
    }, [device, isOpen]);

    // Cargar dispositivo sin datos de instalación (fallback) - solo si no hay id_instalacion
    useEffect(() => {
        if (device && isOpen && !device.id_instalacion) {
            console.log('Dispositivo sin id_instalacion, usando datos directos:', device);

            setFormData({
                numero_serie: device.numero_serie || '',
                id_usuario: device.usuario_id || device.id_usuario || '',
                fecha_hora_alta: device.fecha_hora_alta ?
                    (device.fecha_hora_alta.includes('T') ?
                        device.fecha_hora_alta.slice(0, 16) :
                        device.fecha_hora_alta.slice(0, 10) + 'T00:00'
                    ) : new Date().toISOString().slice(0, 16),
                numero_rega: device.numero_rega || '',
                id_nave: device.id_nave || ''
            });

            setFormErrors({});
            setError('');
        }
    }, [device, isOpen]);

    // Cargar instaladores
    useEffect(() => {
        const fetchInstaladores = async () => {
            try {
                const response = await UsuarioApiService.getUsuarios();
                const instaladoresList = response.data.filter(
                    user => user.usuario_tipo.toLowerCase() === 'instalador' && user.alta === 1
                );
                setInstaladores(instaladoresList);
            } catch (err) {
                console.error('Error fetching instaladores:', err);
                setError('No se pudieron cargar los instaladores.');
            }
        };

        if (isOpen) {
            fetchInstaladores();
        }
    }, [isOpen]);

    // Cargar granjas
    useEffect(() => {
        const fetchGranjas = async () => {
            try {
                const response = await GranjaApiService.getGranjas();
                const granjasList = response.data.filter(
                    granja => granja.alta === 1 && granja.numero_rega !== '-1'
                );
                setGranjas(granjasList);
            } catch (err) {
                console.error('Error fetching granjas:', err);
                setError('No se pudieron cargar las granjas.');
            }
        };

        if (isOpen) {
            fetchGranjas();
        }
    }, [isOpen]);

    // Generar naves
    useEffect(() => {
        const navesDisponibles = [];
        navesDisponibles.push({ value: '', label: 'Elegir opción' });

        const letras = ['A', 'B', 'C', 'D'];
        letras.forEach(letra => {
            navesDisponibles.push({ value: letra, label: letra });
            navesDisponibles.push({ value: `${letra}1`, label: `${letra}1` });
            navesDisponibles.push({ value: `${letra}2`, label: `${letra}2` });
        });

        setNaves(navesDisponibles);
    }, []);

    // Manejar cambios en el formulario
    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (formErrors[name]) {
            setFormErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    // Validar formulario
    const validateForm = () => {
        const errors = {};

        if (!formData.numero_serie.trim()) {
            errors.numero_serie = 'El número de serie es obligatorio';
        } else if (formData.numero_serie.length > 50) {
            errors.numero_serie = 'El número de serie no puede tener más de 50 caracteres';
        }

        if (!formData.id_usuario) {
            errors.id_usuario = 'El instalador es obligatorio';
        }

        if (!formData.fecha_hora_alta) {
            errors.fecha_hora_alta = 'La fecha de instalación es obligatoria';
        }

        if (!formData.numero_rega.trim()) {
            errors.numero_rega = 'El código REGA de la granja es obligatorio';
        } else if (formData.numero_rega.length > 50) {
            errors.numero_rega = 'El código REGA no puede tener más de 50 caracteres';
        }

        if (!formData.id_nave.trim()) {
            errors.id_nave = 'La nave es obligatoria';
        } else if (formData.id_nave.length > 20) {
            errors.id_nave = 'El ID de nave no puede tener más de 20 caracteres';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Enviar formulario
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        if (!device.id_dispositivo || !device.id_instalacion) {
            setError('Error: No se pueden actualizar los datos. Faltan identificadores.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const instalacionId = device.id_instalacion;
            const dispositivoId = device.id_dispositivo;

            // Actualizar la instalación
            const instalacionData = {
                id_usuario: parseInt(formData.id_usuario),
                numero_rega: formData.numero_rega,
                fecha_hora_alta: formData.fecha_hora_alta,
                id_nave: formData.id_nave
            };

            await InstalacionApiService.updateInstalacion(instalacionId, instalacionData);

            // Actualizar el dispositivo
            const dispositivoData = {
                numero_serie: formData.numero_serie,
                fecha_hora_alta: formData.fecha_hora_alta
            };

            await DispositivoApiService.update(dispositivoId, dispositivoData);

            setLoading(false);

            if (onDeviceUpdated) {
                onDeviceUpdated();
            }

            onClose();

        } catch (err) {
            console.error('Error updating device:', err);

            if (err.response && err.response.data) {
                if (err.response.data.message) {
                    setError(err.response.data.message);
                } else if (err.response.data.errors) {
                    const backendErrors = err.response.data.errors;
                    const formattedErrors = {};

                    Object.keys(backendErrors).forEach(key => {
                        formattedErrors[key] = Array.isArray(backendErrors[key])
                            ? backendErrors[key][0]
                            : backendErrors[key];
                    });

                    setFormErrors(formattedErrors);
                } else {
                    setError('Error al actualizar el dispositivo.');
                }
            } else {
                setError('Error de conexión. Por favor, inténtelo de nuevo.');
            }

            setLoading(false);
        }
    };

    if (!isOpen || !device) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center">
            <div
                className="fixed inset-0 bg-black opacity-50 transition-opacity"
                onClick={onClose}
            ></div>

            <div className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto ${darkMode ? 'dark' : ''}`}>
                {/* Cabecera */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
                        <FontAwesomeIcon icon={faEdit} className="mr-2 text-blue-600 dark:text-blue-400" />
                        Editar Dispositivo: {device.numero_serie || `#${device.id_dispositivo}`}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <FontAwesomeIcon icon={faTimes} className="text-xl" />
                    </button>
                </div>

                {/* Información actual del dispositivo */}
                {(instalacionData || currentInstalador) && !loadingData && (
                    <div className="mx-6 my-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2 flex items-center">
                            <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
                            Información Actual del Dispositivo
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            {currentInstalador && (
                                <div>
                                    <span className="font-medium text-blue-700 dark:text-blue-300">Instalador:</span>
                                    <span className="ml-2 text-blue-600 dark:text-blue-200">
                                        {currentInstalador.nombre} {currentInstalador.apellidos}
                                        {currentInstalador.alias_usuario && ` (${currentInstalador.alias_usuario})`}
                                    </span>
                                </div>
                            )}
                            {instalacionData?.numero_rega && (
                                <div>
                                    <span className="font-medium text-blue-700 dark:text-blue-300">REGA:</span>
                                    <span className="ml-2 text-blue-600 dark:text-blue-200">{instalacionData.numero_rega}</span>
                                </div>
                            )}
                            {instalacionData?.id_nave && (
                                <div>
                                    <span className="font-medium text-blue-700 dark:text-blue-300">Nave:</span>
                                    <span className="ml-2 text-blue-600 dark:text-blue-200">{instalacionData.id_nave}</span>
                                </div>
                            )}
                            {device.fecha_hora_alta && (
                                <div>
                                    <span className="font-medium text-blue-700 dark:text-blue-300">Fecha Instalación:</span>
                                    <span className="ml-2 text-blue-600 dark:text-blue-200">
                                        {new Date(device.fecha_hora_alta).toLocaleDateString('es-ES', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Mensaje de error general */}
                {error && (
                    <div className="mx-6 my-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900 dark:text-red-200 dark:border-red-700">
                        <p>{error}</p>
                    </div>
                )}

                {/* Mensaje de carga */}
                {loadingData && (
                    <div className="mx-6 my-4 p-3 bg-blue-100 border-l-4 border-blue-500 text-blue-700 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700">
                        <div className="flex items-center">
                            <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Cargando datos de la instalación...</span>
                        </div>
                    </div>
                )}

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="space-y-4">
                        {/* Número de serie */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <FontAwesomeIcon icon={faMicrochip} className="mr-2" />
                                Número de Serie <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="text"
                                name="numero_serie"
                                value={formData.numero_serie}
                                onChange={handleChange}
                                disabled={loadingData}
                                className={`w-full px-3 py-2 border rounded-md focus:ring focus:outline-none ${formErrors.numero_serie
                                    ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                                    } bg-white dark:bg-gray-700 text-gray-800 dark:text-white disabled:opacity-50`}
                                placeholder="Número de serie del dispositivo"
                                maxLength="50"
                            />
                            {formErrors.numero_serie && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.numero_serie}</p>
                            )}
                        </div>

                        {/* Instalador */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <FontAwesomeIcon icon={faUser} className="mr-2" />
                                Instalador <span className="text-red-600">*</span>
                            </label>
                            <select
                                name="id_usuario"
                                value={formData.id_usuario}
                                onChange={handleChange}
                                disabled={loadingData}
                                className={`w-full px-3 py-2 border rounded-md focus:ring focus:outline-none ${formErrors.id_usuario
                                    ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                                    } bg-white dark:bg-gray-700 text-gray-800 dark:text-white disabled:opacity-50`}
                            >
                                <option value="">-- Seleccione un instalador --</option>
                                {instaladores.map(instalador => (
                                    <option key={instalador.id} value={instalador.id}>
                                        {`${instalador.nombre} ${instalador.apellidos}, Alias -> ${instalador.alias_usuario}`}
                                    </option>
                                ))}
                            </select>
                            {formErrors.id_usuario && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.id_usuario}</p>
                            )}
                        </div>

                        {/* Fecha de instalación */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                                Fecha instalación <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="datetime-local"
                                name="fecha_hora_alta"
                                value={formData.fecha_hora_alta}
                                onChange={handleChange}
                                disabled={loadingData}
                                className={`w-full px-3 py-2 border rounded-md focus:ring focus:outline-none ${formErrors.fecha_hora_alta
                                    ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                                    } bg-white dark:bg-gray-700 text-gray-800 dark:text-white disabled:opacity-50`}
                            />
                            {formErrors.fecha_hora_alta && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.fecha_hora_alta}</p>
                            )}
                        </div>

                        {/* Código REGA de la granja */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <FontAwesomeIcon icon={faBuilding} className="mr-2" />
                                Código REGA de la granja <span className="text-red-600">*</span>
                            </label>
                            <select
                                name="numero_rega"
                                value={formData.numero_rega}
                                onChange={handleChange}
                                disabled={loadingData}
                                className={`w-full px-3 py-2 border rounded-md focus:ring focus:outline-none ${formErrors.numero_rega
                                    ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                                    } bg-white dark:bg-gray-700 text-gray-800 dark:text-white disabled:opacity-50`}
                            >
                                <option value="">-- Seleccione un código --</option>
                                {granjas.map(granja => (
                                    <option key={granja.id || granja.numero_rega} value={granja.numero_rega}>
                                        {granja.numero_rega}
                                    </option>
                                ))}
                            </select>
                            {formErrors.numero_rega && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.numero_rega}</p>
                            )}
                        </div>

                        {/* Nave */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <FontAwesomeIcon icon={faWarehouse} className="mr-2" />
                                Nave <span className="text-red-600">*</span>
                            </label>
                            <select
                                name="id_nave"
                                value={formData.id_nave}
                                onChange={handleChange}
                                disabled={loadingData}
                                className={`w-full px-3 py-2 border rounded-md focus:ring focus:outline-none ${formErrors.id_nave
                                    ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                                    } bg-white dark:bg-gray-700 text-gray-800 dark:text-white disabled:opacity-50`}
                            >
                                {naves.map(nave => (
                                    <option key={nave.value} value={nave.value}>
                                        {nave.label}
                                    </option>
                                ))}
                            </select>
                            {formErrors.id_nave && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.id_nave}</p>
                            )}
                        </div>
                    </div>

                    {/* Botones */}
                    <div className="flex justify-between mt-8">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading || loadingData}
                            className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={loading || loadingData}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Actualizando...
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faSave} className="mr-2" />
                                    Guardar Cambios
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}